
/**
 * Global MFS100 Device Manager
 * Handles device connection state consistently across the entire application
 * Provides automatic recovery after system restarts and connection failures
 */

interface DeviceState {
  isConnected: boolean;
  isInitializing: boolean;
  isCapturing: boolean;
  error: string | null;
  deviceInfo: any;
  lastConnectionTime: Date | null;
  reconnectAttempts: number;
}

interface CaptureResult {
  success: boolean;
  template: string;
  imageData: string;
  quality: number;
  message: string;
}

type StateSubscriber = (state: DeviceState) => void;

class GlobalMFS100Manager {
  private state: DeviceState = {
    isConnected: false,
    isInitializing: false,
    isCapturing: false,
    error: null,
    deviceInfo: null,
    lastConnectionTime: null,
    reconnectAttempts: 0
  };

  private subscribers = new Set<StateSubscriber>();
  private initPromise: Promise<boolean> | null = null;
  private captureQueue: Array<{
    id: string;
    resolve: (result: CaptureResult) => void;
    reject: (error: Error) => void;
    quality: number;
    timeout: number;
  }> = [];

  constructor() {
    console.log('🌐 Global MFS100 Manager initialized');
    
    // Auto-initialize on page load
    this.autoInitialize();
    
    // Handle page visibility changes (system wake/sleep)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this.state.isConnected) {
        console.log('📱 Page visible - checking device connection...');
        this.reconnectDevice();
      }
    });
  }

  private async autoInitialize() {
    // Wait for DOM to be ready
    if (document.readyState !== 'complete') {
      await new Promise(resolve => {
        if (document.readyState === 'complete') {
          resolve(void 0);
        } else {
          window.addEventListener('load', () => resolve(void 0), { once: true });
        }
      });
    }

    // Small delay to ensure all scripts are loaded
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🚀 Starting auto-initialization...');
    await this.initializeDevice();
  }

  subscribe(callback: StateSubscriber): () => void {
    this.subscribers.add(callback);
    // Immediately call with current state
    callback(this.state);
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private updateState(updates: Partial<DeviceState>) {
    const previousState = { ...this.state };
    this.state = { ...this.state, ...updates };
    
    // Log significant state changes
    if (previousState.isConnected !== this.state.isConnected) {
      console.log(`📡 Device ${this.state.isConnected ? 'CONNECTED' : 'DISCONNECTED'}`);
    }
    
    this.subscribers.forEach(callback => callback(this.state));
  }

  async initializeDevice(): Promise<boolean> {
    if (this.initPromise) {
      return this.initPromise;
    }

    if (this.state.isInitializing) {
      return false;
    }

    this.initPromise = this.performInitialization();
    const result = await this.initPromise;
    this.initPromise = null;
    return result;
  }

  private async performInitialization(): Promise<boolean> {
    this.updateState({ 
      isInitializing: true, 
      error: null,
      reconnectAttempts: this.state.reconnectAttempts + 1
    });

    try {
      console.log(`🔄 Initializing MFS100 (attempt ${this.state.reconnectAttempts})...`);

      // Check if MFS100 SDK is available
      if (!this.isSDKAvailable()) {
        throw new Error('MFS100 SDK not loaded. Please refresh the page and ensure the device service is running.');
      }

      // Initialize the SDK
      const initResult = await this.callSDKFunction('InitMFS100');
      if (!this.isValidResponse(initResult)) {
        throw new Error(initResult?.data?.ErrorDescription || 'SDK initialization failed');
      }

      // Get device info to confirm connection
      const deviceInfo = await this.getDeviceInfo();
      
      this.updateState({
        isInitializing: false,
        isConnected: true,
        deviceInfo,
        error: null,
        lastConnectionTime: new Date(),
        reconnectAttempts: 0
      });

      console.log('✅ MFS100 Device initialized successfully!', deviceInfo);
      
      // Process any queued captures
      this.processQueue();
      
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Initialization failed';
      console.error('❌ MFS100 initialization failed:', errorMessage);
      
      this.updateState({
        isInitializing: false,
        isConnected: false,
        error: errorMessage
      });

      // Auto-retry with exponential backoff for specific errors
      if (this.shouldRetryInitialization(errorMessage) && this.state.reconnectAttempts < 5) {
        const retryDelay = Math.min(1000 * Math.pow(2, this.state.reconnectAttempts - 1), 30000);
        console.log(`🔄 Retrying initialization in ${retryDelay}ms...`);
        
        setTimeout(() => {
          this.initializeDevice();
        }, retryDelay);
      }

      return false;
    }
  }

  private isSDKAvailable(): boolean {
    return typeof (window as any).InitMFS100 === 'function' &&
           typeof (window as any).GetMFS100Info === 'function' &&
           typeof (window as any).CaptureFinger === 'function';
  }

  private shouldRetryInitialization(error: string): boolean {
    const retryableErrors = [
      'SDK not loaded',
      'initialization failed',
      'device not found',
      'connection timeout'
    ];
    
    return retryableErrors.some(retryError => 
      error.toLowerCase().includes(retryError.toLowerCase())
    );
  }

  private async callSDKFunction(functionName: string, ...args: any[]): Promise<any> {
    return new Promise((resolve) => {
      const sdkFunction = (window as any)[functionName];
      if (typeof sdkFunction === 'function') {
        sdkFunction(resolve, ...args);
      } else {
        resolve({ httpStaus: false, err: `Function ${functionName} not available` });
      }
    });
  }

  private isValidResponse(response: any): boolean {
    return response?.httpStaus && response.data?.ErrorCode === "0";
  }

  private async getDeviceInfo(): Promise<any> {
    const result = await this.callSDKFunction('GetMFS100Info');
    if (!this.isValidResponse(result)) {
      throw new Error(result?.data?.ErrorDescription || 'Failed to get device info');
    }
    return result.data;
  }

  async captureFingerprint(quality: number = 60, timeout: number = 15): Promise<CaptureResult> {
    return new Promise((resolve, reject) => {
      const captureId = `capture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.captureQueue.push({
        id: captureId,
        resolve,
        reject,
        quality,
        timeout
      });

      // If not connected, try to initialize first
      if (!this.state.isConnected && !this.state.isInitializing) {
        this.initializeDevice().then(() => {
          this.processQueue();
        });
      } else if (this.state.isConnected) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.state.isCapturing || this.captureQueue.length === 0 || !this.state.isConnected) {
      return;
    }

    const captureRequest = this.captureQueue.shift();
    if (!captureRequest) return;

    this.updateState({ isCapturing: true });

    try {
      console.log(`📷 Processing capture request ${captureRequest.id}...`);
      
      const result = await this.performCapture(captureRequest.quality, captureRequest.timeout);
      captureRequest.resolve(result);
      
      console.log(`✅ Capture ${captureRequest.id} completed successfully`);
      
    } catch (error) {
      console.error(`❌ Capture ${captureRequest.id} failed:`, error);
      captureRequest.reject(error instanceof Error ? error : new Error('Capture failed'));
      
      // If capture failed due to connection, try to reconnect
      if (this.isConnectionError(error)) {
        this.reconnectDevice();
      }
    } finally {
      this.updateState({ isCapturing: false });
      
      // Process next item in queue
      setTimeout(() => this.processQueue(), 100);
    }
  }

  private async performCapture(quality: number, timeout: number): Promise<CaptureResult> {
    const result = await this.callSDKFunction('CaptureFinger');
    
    if (!this.isValidResponse(result)) {
      throw new Error(result?.data?.ErrorDescription || result?.err || 'Capture failed');
    }

    const capturedQuality = result.data.Quality || 0;
    let imageData = '';
    
    if (result.data.BitmapData) {
      imageData = this.processBitmapData(
        result.data.BitmapData,
        result.data.InWidth || 256,
        result.data.InHeight || 256
      );
    }

    return {
      success: true,
      template: result.data.ISOTemplate || '',
      imageData,
      quality: capturedQuality,
      message: `Capture successful! Quality: ${capturedQuality}%`
    };
  }

  private processBitmapData(bitmapData: string, width: number, height: number): string {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return '';
      
      const binaryData = atob(bitmapData);
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      
      for (let i = 0; i < Math.min(binaryData.length, width * height); i++) {
        const pixelValue = Math.min(255, Math.max(0, (255 - binaryData.charCodeAt(i)) * 1.3 + 20));
        const pixelIndex = i * 4;
        data[pixelIndex] = pixelValue;     // R
        data[pixelIndex + 1] = pixelValue; // G
        data[pixelIndex + 2] = pixelValue; // B
        data[pixelIndex + 3] = 255;        // A
      }
      
      ctx.putImageData(imageData, 0, 0);
      return canvas.toDataURL('image/png', 1.0);
    } catch (error) {
      console.error('Bitmap processing error:', error);
      return '';
    }
  }

  private isConnectionError(error: any): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const connectionErrors = ['device not found', 'connection lost', 'timeout', 'not connected'];
    return connectionErrors.some(err => errorMessage.toLowerCase().includes(err));
  }

  async reconnectDevice(): Promise<boolean> {
    console.log('🔄 Attempting device reconnection...');
    
    this.updateState({ 
      isConnected: false, 
      error: 'Reconnecting...' 
    });
    
    // Clear any existing initialization promise
    this.initPromise = null;
    
    return await this.initializeDevice();
  }

  getState(): DeviceState {
    return { ...this.state };
  }

  clearQueue() {
    console.log(`🗑️ Clearing ${this.captureQueue.length} queued captures`);
    
    this.captureQueue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    
    this.captureQueue = [];
  }

  async forceReset() {
    console.log('🔄 Forcing complete device reset...');
    
    this.clearQueue();
    this.initPromise = null;
    
    this.updateState({
      isConnected: false,
      isInitializing: false,
      isCapturing: false,
      error: null,
      deviceInfo: null,
      lastConnectionTime: null,
      reconnectAttempts: 0
    });
    
    // Wait a moment then reinitialize
    setTimeout(() => {
      this.initializeDevice();
    }, 1000);
  }
}

// Export singleton instance
export const globalMFS100Manager = new GlobalMFS100Manager();
