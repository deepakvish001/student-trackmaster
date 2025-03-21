
interface USBFingerprint {
  id: string;
  image: ArrayBuffer;
  quality: number;
  nfiq?: number;
  template?: ArrayBuffer;
}

interface MFSDevice {
  id: string;
  manufacturer: string;
  device: USBDevice;
  serialNumber?: string;
  model?: string;
  info?: string;
}

// Mantra MFS100 device IDs
const MFS100_VENDOR_ID = 0x1204;  // Mantra MFS100 vendor ID (0x1204 or 0x2C0D)
const MFS100_PRODUCT_ID = 0x0381; // Mantra MFS100 product ID (0x0381 or 0x4101)

// Command codes for MFS100
const CMD_INIT = 0x00;
const CMD_CAPTURE = 0x01;
const CMD_GET_DATA = 0x02;
const CMD_GET_TEMPLATE = 0x03;
const CMD_MATCH = 0x04;
const CMD_GET_DEVICE_INFO = 0x05;

// Quality threshold
const QUALITY_THRESHOLD = 60;

/**
 * Checks if WebUSB is supported in the browser
 */
export const isWebUSBSupported = (): boolean => {
  return typeof navigator !== 'undefined' && !!navigator.usb;
};

/**
 * Requests permission and connects to a MFS100 device
 */
export const connectToMFS100 = async (): Promise<MFSDevice | null> => {
  try {
    // Check if WebUSB is supported
    if (!isWebUSBSupported()) {
      throw new Error("WebUSB is not supported in this browser");
    }

    // Request the device
    const device = await navigator.usb.requestDevice({
      filters: [
        { vendorId: MFS100_VENDOR_ID, productId: MFS100_PRODUCT_ID },
        { vendorId: 0x2C0D, productId: 0x4101 } // Alternative IDs sometimes used
      ]
    });

    // Open the device
    await device.open();
    console.log("Device opened", device);
    
    // Select the configuration and claim the interface
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    
    await device.claimInterface(0);
    console.log("Interface claimed");

    // Initialize device info
    const deviceInfo = await getDeviceInfo(device);
    
    return {
      id: device.serialNumber || String(Date.now()),
      manufacturer: device.manufacturerName || "Mantra",
      device,
      serialNumber: deviceInfo?.serialNumber,
      model: deviceInfo?.model,
      info: deviceInfo?.info
    };
  } catch (error) {
    console.error("Error connecting to MFS100:", error);
    return null;
  }
};

/**
 * Gets device information
 */
export const getDeviceInfo = async (device: USBDevice): Promise<{serialNumber: string, model: string, info: string} | null> => {
  try {
    // Command to get device info
    const infoCmd = new Uint8Array([CMD_GET_DEVICE_INFO, 0x00, 0x00, 0x00]);
    await device.transferOut(1, infoCmd);
    
    // Wait for response
    const result = await device.transferIn(1, 64);
    if (!result.data) {
      throw new Error("No data received from device info command");
    }
    
    const data = new Uint8Array(result.data.buffer);
    const serialNumber = String.fromCharCode(...data.slice(4, 20)).replace(/\0/g, '');
    const model = String.fromCharCode(...data.slice(20, 36)).replace(/\0/g, '');
    const info = `Serial: ${serialNumber}, Model: ${model}, Vendor: ${device.manufacturerName || "Mantra"}`;
    
    return { serialNumber, model, info };
  } catch (error) {
    console.error("Error getting device info:", error);
    return null;
  }
};

/**
 * Lists all connected MFS100 devices
 */
export const listMFS100Devices = async (): Promise<MFSDevice[]> => {
  try {
    if (!isWebUSBSupported()) {
      throw new Error("WebUSB is not supported in this browser");
    }

    const devices = await navigator.usb.getDevices();
    console.log("Found USB devices:", devices);
    
    const mfsDevices = await Promise.all(
      devices
        .filter(device => 
          (device.vendorId === MFS100_VENDOR_ID && device.productId === MFS100_PRODUCT_ID) ||
          (device.vendorId === 0x2C0D && device.productId === 0x4101))
        .map(async device => {
          if (!device.opened) {
            await device.open();
          }
          
          if (device.configuration === null) {
            await device.selectConfiguration(1);
          }
          
          try {
            await device.claimInterface(0);
          } catch (e) {
            console.warn("Interface might already be claimed", e);
          }
          
          const deviceInfo = await getDeviceInfo(device);
          
          return {
            id: device.serialNumber || String(Date.now()),
            manufacturer: device.manufacturerName || "Mantra",
            device,
            serialNumber: deviceInfo?.serialNumber,
            model: deviceInfo?.model,
            info: deviceInfo?.info
          };
        })
    );
    
    return mfsDevices.filter(device => device !== null) as MFSDevice[];
  } catch (error) {
    console.error("Error listing MFS100 devices:", error);
    return [];
  }
};

/**
 * Captures a fingerprint from the MFS100 device
 */
export const captureFingerprint = async (mfsDevice: MFSDevice, timeout = 10000): Promise<USBFingerprint | null> => {
  try {
    const { device } = mfsDevice;
    
    // Send capture command
    const captureCmd = new Uint8Array([CMD_CAPTURE, 0x00, 0x00, 0x00]);
    await device.transferOut(1, captureCmd);
    console.log("Capture command sent");
    
    // Wait for capture to complete (up to timeout)
    let status = 0;
    let attempts = 0;
    const maxAttempts = timeout / 500; // Check status every 500ms
    
    while (status === 0 && attempts < maxAttempts) {
      // Read status
      const statusResult = await device.transferIn(1, 4);
      if (!statusResult.data) {
        throw new Error("No data received for status check");
      }
      
      const statusData = new Uint8Array(statusResult.data.buffer);
      status = statusData[0];
      
      if (status === 0) {
        // Still capturing, wait 500ms
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
    }
    
    if (status !== 1) {
      throw new Error(`Capture failed with status: ${status}`);
    }
    
    console.log("Capture successful, getting image data");
    
    // Send command to get image data
    const getDataCmd = new Uint8Array([CMD_GET_DATA, 0x00, 0x00, 0x00]);
    await device.transferOut(1, getDataCmd);
    
    // Read image data header (first 8 bytes: 4 for size, 4 for quality)
    const headerResult = await device.transferIn(1, 8);
    if (!headerResult.data) {
      throw new Error("No header data received");
    }
    
    const headerData = new DataView(headerResult.data.buffer);
    const imageSize = headerData.getUint32(0, true);
    const quality = headerData.getUint32(4, true);
    
    console.log(`Image size: ${imageSize} bytes, Quality: ${quality}`);
    
    // Read the actual image data
    const imageResult = await device.transferIn(1, imageSize);
    if (!imageResult.data) {
      throw new Error("No image data received");
    }
    
    const imageData = imageResult.data.buffer;
    
    // Get ISO template
    const getTemplateCmd = new Uint8Array([CMD_GET_TEMPLATE, 0x00, 0x00, 0x00]);
    await device.transferOut(1, getTemplateCmd);
    
    const templateResult = await device.transferIn(1, 2048); // Max template size
    if (!templateResult.data) {
      throw new Error("No template data received");
    }
    
    const templateSizeView = new DataView(templateResult.data.buffer.slice(0, 4));
    const templateSize = templateSizeView.getUint32(0, true);
    const templateData = templateResult.data.buffer.slice(4, 4 + templateSize);
    
    console.log(`Template size: ${templateSize} bytes`);
    
    return {
      id: mfsDevice.id,
      image: imageData,
      quality: quality,
      nfiq: quality > 60 ? 1 : (quality > 40 ? 2 : 3), // Estimate NFIQ from quality
      template: templateData
    };
  } catch (error) {
    console.error("Error capturing fingerprint:", error);
    return null;
  }
};

/**
 * Match two fingerprint templates
 */
export const matchFingerprints = async (
  template1: ArrayBuffer, 
  template2: ArrayBuffer,
  mfsDevice: MFSDevice
): Promise<{ matched: boolean, score: number }> => {
  try {
    const { device } = mfsDevice;
    
    // Prepare match command with templates
    const template1Array = new Uint8Array(template1);
    const template2Array = new Uint8Array(template2);
    
    const template1Size = template1Array.length;
    const template2Size = template2Array.length;
    
    // Command header: CMD_MATCH + size of template1 + size of template2
    const matchCmd = new Uint8Array(8 + template1Size + template2Size);
    matchCmd[0] = CMD_MATCH;
    
    // Store template sizes (4 bytes each)
    const cmdView = new DataView(matchCmd.buffer);
    cmdView.setUint32(1, template1Size, true);
    cmdView.setUint32(5, template2Size, true);
    
    // Copy templates
    matchCmd.set(template1Array, 9);
    matchCmd.set(template2Array, 9 + template1Size);
    
    // Send match command
    await device.transferOut(1, matchCmd);
    
    // Get match result
    const resultData = await device.transferIn(1, 8);
    if (!resultData.data) {
      throw new Error("No match result received");
    }
    
    const scoreView = new DataView(resultData.data.buffer);
    const score = scoreView.getUint32(4, true);
    
    return {
      matched: score >= 1400, // Threshold from the Java code
      score
    };
  } catch (error) {
    console.error("Error matching fingerprints:", error);
    return { matched: false, score: 0 };
  }
};

/**
 * Disconnects from a MFS100 device
 */
export const disconnectDevice = async (mfsDevice: MFSDevice): Promise<boolean> => {
  try {
    const { device } = mfsDevice;
    await device.releaseInterface(0);
    await device.close();
    return true;
  } catch (error) {
    console.error("Error disconnecting device:", error);
    return false;
  }
};

/**
 * Converts fingerprint image data to a base64 string for transmission
 */
export const fingerprintToBase64 = (fingerprint: USBFingerprint): string => {
  // Convert ArrayBuffer to Base64
  const bytes = new Uint8Array(fingerprint.image);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

/**
 * Converts fingerprint template data to a base64 string
 */
export const templateToBase64 = (fingerprint: USBFingerprint): string | null => {
  if (!fingerprint.template) return null;
  
  // Convert template ArrayBuffer to Base64
  const bytes = new Uint8Array(fingerprint.template);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

/**
 * Check if a fingerprint meets quality standards for enrollment
 */
export const isQualityAcceptable = (fingerprint: USBFingerprint): boolean => {
  return fingerprint.quality >= QUALITY_THRESHOLD;
};
