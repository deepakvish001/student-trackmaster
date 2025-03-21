
// Type definitions for MFS100 SDK
interface MFS100Response {
  httpStaus: boolean;
  err?: string;
  data?: {
    ErrorCode: string;
    ErrorDescription: string;
    Quality?: number;
    Nfiq?: number;
    InWidth?: number;
    InHeight?: number;
    InArea?: number;
    Resolution?: number;
    GrayScale?: number;
    Bpp?: number;
    WSQCompressRatio?: number;
    WSQInfo?: string;
    BitmapData?: string;
    IsoTemplate?: string;
    AnsiTemplate?: string;
    IsoImage?: string;
    RawData?: string;
    WsqImage?: string;
    Status?: boolean;
    PidData?: {
      Pid: string;
      Sessionkey: string;
      Hmac: string;
      Ci: string;
      PidTs: string;
    };
    RbdData?: {
      Rbd: string;
      Sessionkey: string;
      Hmac: string;
      Ci: string;
      RbdTs: string;
    };
  };
}

interface DeviceInfo {
  SerialNo: string;
  Make: string;
  Model: string;
  Certificate: string;
  Width: number;
  Height: number;
  LocalMac: string;
  LocalIP: string;
  SystemID: string;
  PublicIP: string;
}

interface Biometric {
  type: string;
  template: string;
  position: string;
  format: number;
  qualityScore: number;
}

// Global SDK functions that will be available after including the SDK JS file
declare global {
  function GetMFS100Info(): MFS100Response;
  function GetMFS100KeyInfo(key: string): MFS100Response;
  function CaptureFinger(quality: number, timeout: number): MFS100Response;
  function VerifyFinger(template1: string, template2: string): MFS100Response;
  function MatchFinger(quality: number, timeout: number, template: string): MFS100Response;
  function Biometric(type: string, template: string, position: string, format: number, qualityScore: number): Biometric;
  function GetPidData(biometrics: Biometric[]): MFS100Response;
  function GetProtoPidData(biometrics: Biometric[]): MFS100Response;
  function GetRbdData(biometrics: Biometric[]): MFS100Response;
  function GetProtoRbdData(biometrics: Biometric[]): MFS100Response;
}

// Default quality and timeout values
const DEFAULT_QUALITY = 60; // (1 to 100) (recommended minimum 55)
const DEFAULT_TIMEOUT = 10; // seconds (minimum=10(recommended), maximum=60, unlimited=0)

// Function to check if MFS100 SDK is loaded
export const isMFS100Available = (): boolean => {
  return typeof GetMFS100Info === 'function';
};

// Function to get device information
export const getDeviceInfo = (): Promise<DeviceInfo | null> => {
  return new Promise((resolve) => {
    try {
      if (!isMFS100Available()) {
        console.error('MFS100 SDK not loaded');
        resolve(null);
        return;
      }

      const res = GetMFS100Info();
      if (res.httpStaus && res.data?.ErrorCode === "0") {
        resolve(res.data.DeviceInfo as unknown as DeviceInfo);
      } else {
        console.error('Error getting device info:', res.data?.ErrorDescription || res.err);
        resolve(null);
      }
    } catch (error) {
      console.error('Error getting device info:', error);
      resolve(null);
    }
  });
};

// Function to capture fingerprint
export const captureFingerprint = async (
  quality = DEFAULT_QUALITY,
  timeout = DEFAULT_TIMEOUT
): Promise<MFS100Response> => {
  try {
    if (!isMFS100Available()) {
      return {
        httpStaus: false,
        err: 'MFS100 SDK not loaded'
      };
    }

    return CaptureFinger(quality, timeout);
  } catch (error) {
    console.error('Error capturing fingerprint:', error);
    return {
      httpStaus: false,
      err: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Function to verify fingerprints
export const verifyFingerprints = async (
  template1: string,
  template2: string
): Promise<boolean> => {
  try {
    if (!isMFS100Available()) {
      console.error('MFS100 SDK not loaded');
      return false;
    }

    const res = VerifyFinger(template1, template2);
    if (res.httpStaus && res.data?.Status) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error verifying fingerprints:', error);
    return false;
  }
};

// Function to match a captured fingerprint against a stored template
export const matchFingerprint = async (
  quality = DEFAULT_QUALITY,
  timeout = DEFAULT_TIMEOUT,
  template: string
): Promise<boolean> => {
  try {
    if (!isMFS100Available()) {
      console.error('MFS100 SDK not loaded');
      return false;
    }

    const res = MatchFinger(quality, timeout, template);
    if (res.httpStaus && res.data?.Status) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error matching fingerprints:', error);
    return false;
  }
};

// Load the MFS100 SDK script dynamically
export const loadMFS100SDK = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (isMFS100Available()) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = '/mfs100-9.0.2.6.js'; // Need to include this file in the public folder
    script.async = true;
    script.onload = () => {
      console.log('MFS100 SDK loaded successfully');
      resolve(true);
    };
    script.onerror = () => {
      console.error('Failed to load MFS100 SDK');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

// Load jQuery if needed (MFS100 SDK might depend on it)
export const loadJQuery = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.jQuery) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://code.jquery.com/jquery-1.12.4.min.js';
    script.async = true;
    script.onload = () => {
      console.log('jQuery loaded successfully');
      resolve(true);
    };
    script.onerror = () => {
      console.error('Failed to load jQuery');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

// Initialize the SDK and dependencies
export const initializeMFS100 = async (): Promise<boolean> => {
  try {
    const jqueryLoaded = await loadJQuery();
    if (!jqueryLoaded) {
      return false;
    }
    
    const sdkLoaded = await loadMFS100SDK();
    return sdkLoaded;
  } catch (error) {
    console.error('Error initializing MFS100:', error);
    return false;
  }
};
