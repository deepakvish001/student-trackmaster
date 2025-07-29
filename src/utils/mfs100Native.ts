
/**
 * MFS100 Native SDK Integration
 * Direct communication with MFS100 device service
 */

// Device service URL - Updated to use HTTPS port 8003
const MFS100_SERVICE_URL = "https://localhost:8003/mfs100/";

let sdkLoaded = false;
let deviceConnected = false;

interface MFS100Response {
  httpStaus: boolean;
  data?: {
    ErrorCode: string;
    ErrorDescription: string;
    Quality?: number;
    IsoTemplate?: string;
    BitmapData?: string;
    InWidth?: number;
    InHeight?: number;
  };
  err?: string;
}

interface DeviceInfo {
  Certificate: string;
  Height: number;
  LocalIP: string;
  LocalMac: string;
  Make: string;
  Model: string;
  PublicIP: string;
  SerialNo: string;
  SystemID: string;
  Width: number;
}

interface DeviceInfoResponse {
  DeviceInfo: DeviceInfo;
  ErrorCode: string;
  ErrorDescription: string;
  WSQInfo: string;
}

/**
 * Check if MFS100 service is available
 */
export const isMFS100Available = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${MFS100_SERVICE_URL}info`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return false;
    }
    
    const data: DeviceInfoResponse = await response.json();
    return data.ErrorCode === "0";
  } catch (error) {
    console.warn('MFS100 service check failed:', error);
    return false;
  }
};

/**
 * Initialize MFS100 SDK
 */
export const initializeMFS100 = async (): Promise<boolean> => {
  try {
    console.log('Initializing MFS100 SDK...');
    
    const isAvailable = await isMFS100Available();
    if (!isAvailable) {
      console.warn('MFS100 service not available');
      return false;
    }
    
    sdkLoaded = true;
    deviceConnected = true;
    
    console.log('✅ MFS100 SDK initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize MFS100 SDK:', error);
    sdkLoaded = false;
    deviceConnected = false;
    return false;
  }
};

/**
 * Get device information
 */
export const getDeviceInfo = async (): Promise<DeviceInfo | null> => {
  try {
    const response = await fetch(`${MFS100_SERVICE_URL}info`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: DeviceInfoResponse = await response.json();
    
    if (data.ErrorCode !== "0") {
      throw new Error(data.ErrorDescription || 'Failed to get device info');
    }
    
    return data.DeviceInfo;
  } catch (error) {
    console.error('Failed to get device info:', error);
    return null;
  }
};

/**
 * Capture fingerprint
 */
export const captureFingerprint = async (
  quality: number = 60, 
  timeout: number = 15
): Promise<MFS100Response> => {
  try {
    console.log(`Starting fingerprint capture with quality ${quality}%, timeout ${timeout}s`);
    
    const requestBody = {
      Quality: quality,
      TimeOut: timeout
    };
    
    const response = await fetch(`${MFS100_SERVICE_URL}capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      return {
        httpStaus: false,
        err: `HTTP error! status: ${response.status}`
      };
    }
    
    const data = await response.json();
    
    console.log('Fingerprint capture response:', {
      errorCode: data.ErrorCode,
      errorDescription: data.ErrorDescription,
      quality: data.Quality,
      hasTemplate: !!data.IsoTemplate,
      hasBitmap: !!data.BitmapData
    });
    
    return {
      httpStaus: true,
      data: {
        ErrorCode: data.ErrorCode || "1",
        ErrorDescription: data.ErrorDescription || "Unknown error",
        Quality: data.Quality || 0,
        IsoTemplate: data.IsoTemplate || "",
        BitmapData: data.BitmapData || "",
        InWidth: data.InWidth || 256,
        InHeight: data.InHeight || 256
      }
    };
  } catch (error) {
    console.error('Fingerprint capture failed:', error);
    return {
      httpStaus: false,
      err: error instanceof Error ? error.message : 'Capture failed'
    };
  }
};

/**
 * Verify two fingerprints
 */
export const verifyFingerprints = async (
  template1: string, 
  template2: string
): Promise<boolean> => {
  try {
    const requestBody = {
      ProbTemplate: template1,
      GalleryTemplate: template2,
      BioType: "FMR"
    };
    
    const response = await fetch(`${MFS100_SERVICE_URL}verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('Verification result:', {
      errorCode: data.ErrorCode,
      matched: data.ErrorCode === "0"
    });
    
    return data.ErrorCode === "0";
  } catch (error) {
    console.error('Fingerprint verification failed:', error);
    return false;
  }
};

/**
 * Check SDK status
 */
export const isSDKLoaded = (): boolean => {
  return sdkLoaded;
};

/**
 * Check device connection status
 */
export const isDeviceConnected = (): boolean => {
  return deviceConnected;
};
