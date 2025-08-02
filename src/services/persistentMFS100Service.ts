
declare global {
  interface Window {
    location: Location;
  }
}

export interface MFS100CaptureResult {
  success: boolean;
  template: string;
  imageData: string;
  quality: number;
  message: string;
}

export interface MFS100ConnectionState {
  isConnected: boolean;
  isInitialized: boolean;
  deviceInfo: any;
  error: string | null;
  lastActivity: Date | null;
}

class PersistentMFS100Service {
  private connectionState: MFS100ConnectionState = {
    isConnected: false,
    isInitialized: false,
    deviceInfo: null,
    error: null,
    lastActivity: null
  };

  private subscribers: Set<(state: MFS100ConnectionState) => void> = new Set();
  private initializationPromise: Promise<boolean> | null = null;
  private isCapturing = false;

  constructor() {
    console.log('🔵 PersistentMFS100Service: Initialized - NO background checks');
  }

  // Subscribe to connection state changes
  subscribe(callback: (state: MFS100ConnectionState) => void) {
    this.subscribers.add(callback);
    // Immediately call with current state
    callback(this.connectionState);
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => {
      callback(this.connectionState);
    });
  }

  private updateState(updates: Partial<MFS100ConnectionState>) {
    this.connectionState = { ...this.connectionState, ...updates };
    this.notifySubscribers();
  }

  // Initialize device connection ONCE
  async initializeDevice(): Promise<boolean> {
    // Return existing promise if already initializing
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Return true if already initialized and connected
    if (this.connectionState.isInitialized && this.connectionState.isConnected) {
      console.log('✅ PersistentMFS100Service: Already initialized and connected');
      return true;
    }

    this.initializationPromise = this.performInitialization();
    const result = await this.initializationPromise;
    this.initializationPromise = null;
    return result;
  }

  private async performInitialization(): Promise<boolean> {
    try {
      console.log('🔄 PersistentMFS100Service: Starting ONE-TIME initialization...');
      
      this.updateState({ 
        error: null,
        lastActivity: new Date()
      });

      // Check if MFS100 SDK is available
      if (typeof (window as any).InitMFS100 !== 'function') {
        throw new Error('MFS100 SDK not loaded. Please ensure mfs100-9.0.2.6.js is included.');
      }

      // Initialize the SDK once
      const initResult = await new Promise<any>((resolve) => {
        (window as any).InitMFS100(resolve);
      });

      if (!initResult || !initResult.httpStaus || initResult.data?.ErrorCode !== "0") {
        throw new Error(initResult?.data?.ErrorDescription || 'SDK initialization failed');
      }

      console.log('✅ PersistentMFS100Service: SDK initialized successfully');

      // Get device info to confirm connection
      const deviceInfo = await this.getDeviceInfo();
      
      this.updateState({
        isInitialized: true,
        isConnected: true,
        deviceInfo,
        error: null,
        lastActivity: new Date()
      });

      console.log('🎉 PersistentMFS100Service: Device connected and ready for unlimited captures!', deviceInfo);
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Initialization failed';
      console.error('❌ PersistentMFS100Service: Initialization error:', errorMessage);
      
      this.updateState({
        isInitialized: false,
        isConnected: false,
        error: errorMessage,
        lastActivity: new Date()
      });
      
      return false;
    }
  }

  private async getDeviceInfo(): Promise<any> {
    return new Promise((resolve, reject) => {
      (window as any).GetMFS100Info((result: any) => {
        if (result?.httpStaus && result.data?.ErrorCode === "0") {
          resolve(result.data);
        } else {
          reject(new Error(result?.data?.ErrorDescription || 'Failed to get device info'));
        }
      });
    });
  }

  // Fast fingerprint capture without any reconnection
  async captureFingerprint(quality: number = 60, timeout: number = 15): Promise<MFS100CaptureResult> {
    // Prevent concurrent captures
    if (this.isCapturing) {
      return {
        success: false,
        template: '',
        imageData: '',
        quality: 0,
        message: 'Another capture is in progress'
      };
    }

    // Ensure device is initialized
    if (!this.connectionState.isInitialized || !this.connectionState.isConnected) {
      const initialized = await this.initializeDevice();
      if (!initialized) {
        return {
          success: false,
          template: '',
          imageData: '',
          quality: 0,
          message: 'Device not available'
        };
      }
    }

    this.isCapturing = true;
    
    try {
      console.log('📷 PersistentMFS100Service: Starting fast capture...');
      
      this.updateState({ lastActivity: new Date() });

      const result = await new Promise<any>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Capture timeout'));
        }, timeout * 1000);

        (window as any).CaptureFinger((captureResult: any) => {
          clearTimeout(timeoutId);
          resolve(captureResult);
        });
      });

      if (!result?.httpStaus || result.data?.ErrorCode !== "0") {
        throw new Error(result?.data?.ErrorDescription || result?.err || 'Capture failed');
      }

      const capturedQuality = result.data.Quality || 0;
      
      // Process image data
      let processedImage = "";
      if (result.data.BitmapData) {
        processedImage = this.processFingerprintBitmap(
          result.data.BitmapData,
          result.data.InWidth || 256,
          result.data.InHeight || 256
        );
      }

      console.log('✅ PersistentMFS100Service: Fast capture completed!', {
        quality: capturedQuality,
        hasImage: !!processedImage
      });

      return {
        success: true,
        template: result.data.ISOTemplate || '',
        imageData: processedImage,
        quality: capturedQuality,
        message: `Capture successful! Quality: ${capturedQuality}%`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      console.error('❌ PersistentMFS100Service: Capture error:', errorMessage);
      
      return {
        success: false,
        template: '',
        imageData: '',
        quality: 0,
        message: errorMessage
      };
    } finally {
      this.isCapturing = false;
    }
  }

  private processFingerprintBitmap(bitmapData: string, width: number, height: number): string {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return "";
      
      const binaryData = atob(bitmapData);
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      
      const totalPixels = Math.min(binaryData.length, width * height);
      for (let i = 0; i < totalPixels; i++) {
        let pixelValue = 255 - binaryData.charCodeAt(i);
        pixelValue = Math.min(255, Math.max(0, pixelValue * 1.3 + 20));
        
        const pixelIndex = i * 4;
        data[pixelIndex] = pixelValue;
        data[pixelIndex + 1] = pixelValue;
        data[pixelIndex + 2] = pixelValue;
        data[pixelIndex + 3] = 255;
      }
      
      ctx.putImageData(imageData, 0, 0);
      return canvas.toDataURL('image/png', 1.0);
      
    } catch (error) {
      console.error('Bitmap processing error:', error);
      return "";
    }
  }

  // Get current state without any checks
  getState(): MFS100ConnectionState {
    return this.connectionState;
  }

  // Reset connection if needed
  resetConnection() {
    console.log('🔄 PersistentMFS100Service: Resetting connection...');
    this.connectionState = {
      isConnected: false,
      isInitialized: false,
      deviceInfo: null,
      error: null,
      lastActivity: null
    };
    this.initializationPromise = null;
    this.isCapturing = false;
    this.notifySubscribers();
  }
}

// Single instance for the entire application
export const persistentMFS100Service = new PersistentMFS100Service();
