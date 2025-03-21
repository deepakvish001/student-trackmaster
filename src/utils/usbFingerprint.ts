
interface USBFingerprint {
  id: string;
  image: ArrayBuffer;
  quality: number;
}

interface MFSDevice {
  id: string;
  manufacturer: string;
  device: USBDevice;
}

const MFS100_VENDOR_ID = 0x1204;  // Mantra MFS100 vendor ID
const MFS100_PRODUCT_ID = 0x0381; // Mantra MFS100 product ID

// Command codes for MFS100
const CMD_CAPTURE = 0x01;
const CMD_GET_DATA = 0x02;

/**
 * Requests permission and connects to a MFS100 device
 */
export const connectToMFS100 = async (): Promise<MFSDevice | null> => {
  try {
    // Check if WebUSB is supported
    if (!navigator.usb) {
      throw new Error("WebUSB is not supported in this browser");
    }

    // Request the device
    const device = await navigator.usb.requestDevice({
      filters: [
        { vendorId: MFS100_VENDOR_ID, productId: MFS100_PRODUCT_ID }
      ]
    });

    // Open the device
    await device.open();
    
    // Select the configuration and claim the interface
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    
    await device.claimInterface(0);

    return {
      id: device.serialNumber || String(Date.now()),
      manufacturer: device.manufacturerName || "Mantra",
      device
    };
  } catch (error) {
    console.error("Error connecting to MFS100:", error);
    return null;
  }
};

/**
 * Lists all connected MFS100 devices
 */
export const listMFS100Devices = async (): Promise<MFSDevice[]> => {
  try {
    if (!navigator.usb) {
      throw new Error("WebUSB is not supported in this browser");
    }

    const devices = await navigator.usb.getDevices();
    
    return devices
      .filter(device => device.vendorId === MFS100_VENDOR_ID && device.productId === MFS100_PRODUCT_ID)
      .map(device => ({
        id: device.serialNumber || String(Date.now()),
        manufacturer: device.manufacturerName || "Mantra",
        device
      }));
  } catch (error) {
    console.error("Error listing MFS100 devices:", error);
    return [];
  }
};

/**
 * Captures a fingerprint from the MFS100 device
 */
export const captureFingerprint = async (mfsDevice: MFSDevice): Promise<USBFingerprint | null> => {
  try {
    const { device } = mfsDevice;
    
    // Send capture command
    const captureCmd = new Uint8Array([CMD_CAPTURE, 0x00, 0x00, 0x00]);
    await device.transferOut(1, captureCmd);
    
    // Wait for capture to complete (up to 10 seconds)
    let status = 0;
    let attempts = 0;
    
    while (status === 0 && attempts < 20) {
      // Read status
      const statusResult = await device.transferIn(1, 4);
      const statusData = new Uint8Array(statusResult.data!.buffer);
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
    
    // Send command to get image data
    const getDataCmd = new Uint8Array([CMD_GET_DATA, 0x00, 0x00, 0x00]);
    await device.transferOut(1, getDataCmd);
    
    // Read image data header (first 8 bytes: 4 for size, 4 for quality)
    const headerResult = await device.transferIn(1, 8);
    const headerData = new DataView(headerResult.data!.buffer);
    const imageSize = headerData.getUint32(0, true);
    const quality = headerData.getUint32(4, true);
    
    // Read the actual image data
    const imageResult = await device.transferIn(1, imageSize);
    const imageData = imageResult.data!.buffer;
    
    return {
      id: mfsDevice.id,
      image: imageData,
      quality: quality
    };
  } catch (error) {
    console.error("Error capturing fingerprint:", error);
    return null;
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
