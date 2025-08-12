
/**
 * Modern MFS100 Client - Async wrapper for MFS100 SDK
 * Replaces the legacy synchronous implementation with proper async handling
 */

interface MFS100Response {
  httpStaus: boolean;
  err?: string;
  data?: {
    ErrorCode: string;
    ErrorDescription: string;
    DeviceInfo?: any;
    Quality?: number;
    Nfiq?: number;
    InWidth?: number;
    InHeight?: number;
    BitmapData?: string;
    IsoTemplate?: string;
    AnsiTemplate?: string;
  };
}

interface CaptureOptions {
  quality: number;
  timeout: number;
  retries: number;
}

class ModernMFS100Client {
  private static instance: ModernMFS100Client;
  private isSDKLoaded = false;
  private initializationPromise: Promise<boolean> | null = null;

  static getInstance(): ModernMFS100Client {
    if (!ModernMFS100Client.instance) {
      ModernMFS100Client.instance = new ModernMFS100Client();
    }
    return ModernMFS100Client.instance;
  }

  private constructor() {}

  /**
   * Initialize the MFS100 SDK asynchronously
   */
  async initialize(): Promise<boolean> {
    if (this.isSDKLoaded) {
      return true;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<boolean> {
    try {
      // Load jQuery if not present
      await this.loadJQuery();
      
      // Load MFS100 SDK
      await this.loadMFS100SDK();
      
      // Wait for SDK to be ready
      await this.waitForSDK();
      
      this.isSDKLoaded = true;
      console.log('Modern MFS100 Client initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Modern MFS100 Client:', error);
      this.initializationPromise = null;
      return false;
    }
  }

  private loadJQuery(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.jQuery && window.$) {
        resolve();
        return;
      }

      // Only load jQuery when fingerprint capture is actually needed
      const script = document.createElement('script');
      script.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load jQuery'));
      document.head.appendChild(script);
    });
  }

  private loadMFS100SDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/mfs100-9.0.2.6.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load MFS100 SDK'));
      document.head.appendChild(script);
    });
  }

  private waitForSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 20;
      
      const checkSDK = () => {
        if (typeof (window as any).GetMFS100Info === 'function') {
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('MFS100 SDK not available after loading'));
        } else {
          attempts++;
          setTimeout(checkSDK, 100);
        }
      };
      
      checkSDK();
    });
  }

  /**
   * Get device information asynchronously
   */
  async getDeviceInfo(): Promise<any> {
    if (!this.isSDKLoaded) {
      throw new Error('MFS100 SDK not initialized');
    }

    return new Promise((resolve) => {
      try {
        const result = (window as any).GetMFS100Info();
        resolve(result);
      } catch (error) {
        resolve({ httpStaus: false, err: 'Device communication failed' });
      }
    });
  }

  /**
   * Capture fingerprint with modern async approach
   */
  async captureFingerprint(options: CaptureOptions): Promise<MFS100Response> {
    if (!this.isSDKLoaded) {
      throw new Error('MFS100 SDK not initialized');
    }

    const { quality, timeout, retries } = options;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await this.performCapture(quality, timeout);
        
        if (result.httpStaus && result.data?.ErrorCode === "0") {
          return result;
        }
        
        if (attempt === retries) {
          return result;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        if (attempt === retries) {
          return {
            httpStaus: false,
            err: error instanceof Error ? error.message : 'Capture failed'
          };
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { httpStaus: false, err: 'All capture attempts failed' };
  }

  private performCapture(quality: number, timeout: number): Promise<MFS100Response> {
    return new Promise((resolve) => {
      try {
        // Use setTimeout to make the synchronous call async
        setTimeout(() => {
          try {
            const result = (window as any).CaptureFinger(quality, timeout);
            resolve(result);
          } catch (error) {
            resolve({
              httpStaus: false,
              err: error instanceof Error ? error.message : 'Capture error'
            });
          }
        }, 0);
      } catch (error) {
        resolve({
          httpStaus: false,
          err: error instanceof Error ? error.message : 'Capture setup failed'
        });
      }
    });
  }

  /**
   * Verify if device is connected
   */
  async isDeviceConnected(): Promise<boolean> {
    try {
      const deviceInfo = await this.getDeviceInfo();
      return deviceInfo.httpStaus && deviceInfo.data?.ErrorCode === "0";
    } catch {
      return false;
    }
  }

  /**
   * Get SDK status
   */
  isInitialized(): boolean {
    return this.isSDKLoaded;
  }
}

export const modernMFS100Client = ModernMFS100Client.getInstance();
export type { MFS100Response, CaptureOptions };
