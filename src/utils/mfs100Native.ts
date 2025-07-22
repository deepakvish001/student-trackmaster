
// Type definitions for MFS100 SDK
interface MFS100Response {
  httpStaus: boolean;
  err?: string;
  data?: {
    ErrorCode: string;
    ErrorDescription: string;
    DeviceInfo?: DeviceInfo;
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

// Add jQuery to Window interface
declare global {
  interface Window {
    jQuery: any;
    $: any;
    GetMFS100Info(): MFS100Response;
    GetMFS100KeyInfo(key: string): MFS100Response;
    CaptureFinger(quality: number, timeout: number): MFS100Response;
    VerifyFinger(template1: string, template2: string): MFS100Response;
    MatchFinger(quality: number, timeout: number, template: string): MFS100Response;
    Biometric(type: string, template: string, position: string, format: number, qualityScore: number): Biometric;
    GetPidData(biometrics: Biometric[]): MFS100Response;
    GetProtoPidData(biometrics: Biometric[]): MFS100Response;
    GetRbdData(biometrics: Biometric[]): MFS100Response;
    GetProtoRbdData(biometrics: Biometric[]): MFS100Response;
  }
}

// Default quality and timeout values
const DEFAULT_QUALITY = 60;
const DEFAULT_TIMEOUT = 15; // Increased timeout for better capture

// Global state to track initialization
let isSDKInitialized = false;
let isInitializing = false;

// Function to check if MFS100 SDK is loaded
export const isMFS100Available = (): boolean => {
  return typeof window.GetMFS100Info === 'function';
};

// Enhanced device info with better error handling
export const getDeviceInfo = (): Promise<DeviceInfo | null> => {
  return new Promise((resolve) => {
    try {
      if (!isMFS100Available()) {
        console.log('MFS100 SDK not available');
        resolve(null);
        return;
      }

      const res = window.GetMFS100Info();
      console.log('Device info response:', res);
      
      if (res.httpStaus && res.data?.ErrorCode === "0") {
        const deviceInfo = res.data.DeviceInfo;
        if (deviceInfo) {
          console.log('Device connected:', deviceInfo);
          resolve(deviceInfo);
        } else {
          console.log('No device info in response');
          resolve(null);
        }
      } else {
        console.log('Device error:', res.data?.ErrorDescription || res.err);
        resolve(null);
      }
    } catch (error) {
      console.error('Error getting device info:', error);
      resolve(null);
    }
  });
};

// Enhanced fingerprint capture with better error handling
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

    console.log(`Capturing fingerprint with quality: ${quality}, timeout: ${timeout}`);
    const result = window.CaptureFinger(quality, timeout);
    console.log('Capture result:', result);
    
    return result;
  } catch (error) {
    console.error('Error capturing fingerprint:', error);
    return {
      httpStaus: false,
      err: error instanceof Error ? error.message : 'Unknown capture error'
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

    const res = window.VerifyFinger(template1, template2);
    console.log('Verification result:', res);
    
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

    const res = window.MatchFinger(quality, timeout, template);
    if (res.httpStaus && res.data?.Status) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error matching fingerprints:', error);
    return false;
  }
};

// Improved SDK loading with cleanup
export const loadMFS100SDK = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (isMFS100Available()) {
      console.log('MFS100 SDK already loaded');
      resolve(true);
      return;
    }

    // Remove existing script if any
    const existingScript = document.querySelector('script[src*="mfs100-9.0.2.6.js"]');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.src = '/mfs100-9.0.2.6.js';
    script.async = true;
    
    script.onload = () => {
      console.log('MFS100 SDK loaded successfully');
      // Wait a bit for the SDK to initialize
      setTimeout(() => {
        resolve(true);
      }, 1000);
    };
    
    script.onerror = () => {
      console.error('Failed to load MFS100 SDK');
      resolve(false);
    };
    
    document.head.appendChild(script);
  });
};

// Load jQuery if needed
export const loadJQuery = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.jQuery) {
      console.log('jQuery already loaded');
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
    
    document.head.appendChild(script);
  });
};

// Enhanced initialization with retry logic
export const initializeMFS100 = async (): Promise<boolean> => {
  if (isInitializing) {
    console.log('Already initializing...');
    return isSDKInitialized;
  }

  if (isSDKInitialized && isMFS100Available()) {
    console.log('SDK already initialized');
    return true;
  }

  isInitializing = true;
  
  try {
    console.log('Initializing MFS100 SDK...');
    
    // Load jQuery first
    const jqueryLoaded = await loadJQuery();
    if (!jqueryLoaded) {
      console.error('Failed to load jQuery');
      return false;
    }
    
    // Load MFS100 SDK
    const sdkLoaded = await loadMFS100SDK();
    if (!sdkLoaded) {
      console.error('Failed to load MFS100 SDK');
      return false;
    }
    
    // Test device connection
    const deviceInfo = await getDeviceInfo();
    if (deviceInfo) {
      console.log('Device connected during initialization:', deviceInfo);
    }
    
    isSDKInitialized = true;
    console.log('MFS100 initialization complete');
    
    return true;
  } catch (error) {
    console.error('Error initializing MFS100:', error);
    return false;
  } finally {
    isInitializing = false;
  }
};
