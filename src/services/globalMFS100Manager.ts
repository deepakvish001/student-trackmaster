
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

  // Stability improvements
  private lastSuccessfulOperation = 0;
  private connectionStable = false;
  private consecutiveSuccesses = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    console.log('🌐 Global MFS100 Manager initialized with enhanced stability');
    
    // Don't auto-initialize since modern system already handles this
    // this.autoInitialize();
    
    // Handle page visibility changes (system wake/sleep)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this.state.isConnected) {
        console.log('📱 Page visible - checking device connection...');
        this.reconnectDevice();
      }
    });

    // Start gentle health monitoring
    this.startHealthMonitoring();
  }

  private startHealthMonitoring() {
    // Very gentle health check every 30 seconds, only if device seems problematic
    this.healthCheckInterval = setInterval(() => {
      const timeSinceLastSuccess = Date.now() - this.lastSuccessfulOperation;
      const shouldCheck = !this.connectionStable && 
                         this.state.isConnected && 
                         !this.state.isCapturing && 
                         timeSinceLastSuccess > 60000; // Only if no activity for 1 minute

      if (shouldCheck) {
        console.log('🏥 Gentle health check - device inactive for 1 minute');
        this.performGentleHealthCheck();
      }
    }, 30000);
  }

  private async performGentleHealthCheck() {
    try {
      // Very quick, non-disruptive check
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 3000); // Short timeout

      const response = await fetch('https://localhost:8003/mfs100/info', {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        this.lastSuccessfulOperation = Date.now();
        this.consecutiveSuccesses++;
        
        // Mark connection as stable after 3 successful operations
        if (this.consecutiveSuccesses >= 3) {
          this.connectionStable = true;
          console.log('✅ Connection marked as stable - reducing health checks');
        }
      }
    } catch (error) {
      // Ignore health check failures - they're just gentle probes
      console.log('🏥 Health check failed (ignored):', error instanceof Error ? error.message : 'Unknown');
    }
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
    
    // Log significant state changes only
    if (previousState.isConnected !== this.state.isConnected) {
      console.log(`📡 Device ${this.state.isConnected ? 'CONNECTED' : 'DISCONNECTED'}`);
      
      // Reset stability tracking on connection changes
      if (this.state.isConnected) {
        this.consecutiveSuccesses = 0;
        this.connectionStable = false;
      }
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
    const maxRetries = 3;
    let attempt = 0;

    this.updateState({ 
      isInitializing: true, 
      error: null,
      reconnectAttempts: this.state.reconnectAttempts + 1
    });

    while (attempt < maxRetries) {
      attempt++;
      console.log(`🔄 Initializing MFS100 (attempt ${attempt})...`);
      
      try {
        // Check if modern MFS100 system is already initialized
        if (typeof (window as any).GetMFS100Info === 'function') {
          console.log('✅ MFS100 SDK already loaded by modern system');
          
          // Test device connection
          const deviceInfo = (window as any).GetMFS100Info();
          if (deviceInfo && deviceInfo.httpStaus && deviceInfo.data?.ErrorCode === "0") {
            console.log('✅ MFS100 device connected and ready');
            
            this.updateState({
              isConnected: true,
              isInitializing: false,
              error: null,
              deviceInfo: deviceInfo.data.DeviceInfo,
              lastConnectionTime: new Date()
            });
            
            this.lastSuccessfulOperation = Date.now();
            return true;
          }
        }
        
        throw new Error('MFS100 SDK not loaded. Please refresh the page and ensure the device service is running.');
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
        console.error(`❌ MFS100 initialization failed: ${errorMessage}`);
        
        if (attempt < maxRetries) {
          const delay = attempt * 5000; // Increasing delay: 5s, 10s
          console.log(`🔄 Retrying initialization in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed
    this.updateState({
      isInitializing: false,
      error: 'Failed to initialize MFS100 device after multiple attempts',
      isConnected: false
    });
    
    return false;
  }

  async captureFingerprint(quality: number = 60, timeout: number = 15): Promise<CaptureResult> {
    return new Promise((resolve, reject) => {
      if (this.state.isCapturing) {
        resolve({
          success: false,
          template: '',
          imageData: '',
          quality: 0,
          message: 'Another capture is already in progress'
        });
        return;
      }

      if (!this.state.isConnected) {
        resolve({
          success: false,
          template: '',
          imageData: '',
          quality: 0,
          message: 'Device not connected'
        });
        return;
      }

      this.captureQueue.push({
        id: `capture_${Date.now()}`,
        resolve,
        reject,
        quality,
        timeout
      });

      this.processNextCapture();
    });
  }

  private async processNextCapture() {
    if (this.state.isCapturing || this.captureQueue.length === 0) {
      return;
    }

    const captureRequest = this.captureQueue.shift();
    if (!captureRequest) return;

    this.updateState({ isCapturing: true });

    try {
      // Use the modern MFS100 system for capture
      if (typeof (window as any).CaptureFinger === 'function') {
        const result = (window as any).CaptureFinger(captureRequest.quality, captureRequest.timeout);
        
        if (result && result.httpStaus && result.data?.ErrorCode === "0") {
          const quality = result.data.Quality || 0;
          
          // Process bitmap data if available
          let imageData = "";
          if (result.data.BitmapData) {
            imageData = this.processBitmapData(result.data.BitmapData, result.data.InWidth || 256, result.data.InHeight || 256);
          }
          
          this.lastSuccessfulOperation = Date.now();
          
          captureRequest.resolve({
            success: true,
            template: result.data.IsoTemplate || '',
            imageData: imageData,
            quality: quality,
            message: `Fingerprint captured with quality ${quality}%`
          });
        } else {
          throw new Error(result?.data?.ErrorDescription || result?.err || 'Capture failed');
        }
      } else {
        throw new Error('MFS100 SDK not available');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      captureRequest.resolve({
        success: false,
        template: '',
        imageData: '',
        quality: 0,
        message: errorMessage
      });
    } finally {
      this.updateState({ isCapturing: false });
      
      // Process next capture if any
      setTimeout(() => {
        this.processNextCapture();
      }, 1000);
    }
  }

  private processBitmapData(bitmapData: string, width: number | string = 256, height: number | string = 256): string {
    try {
      // Ensure dimensions are valid numbers
      const validWidth = typeof width === 'number' && width > 0 ? Math.floor(width) : 256;
      const validHeight = typeof height === 'number' && height > 0 ? Math.floor(height) : 256;

      const canvas = document.createElement('canvas');
      canvas.width = validWidth;
      canvas.height = validHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      const binaryData = atob(bitmapData);
      const imageData = ctx.createImageData(validWidth, validHeight);
      const data = imageData.data;
      
      const totalPixels = Math.min(binaryData.length, validWidth * validHeight);
      
      for (let i = 0; i < totalPixels; i++) {
        let pixelValue = 255 - binaryData.charCodeAt(i); // Invert
        pixelValue = Math.min(255, Math.max(0, pixelValue * 1.3 + 20)); // Enhance
        
        const pixelIndex = i * 4;
        if (pixelIndex + 3 < data.length) {
          data[pixelIndex] = pixelValue;
          data[pixelIndex + 1] = pixelValue;
          data[pixelIndex + 2] = pixelValue;
          data[pixelIndex + 3] = 255;
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      return canvas.toDataURL('image/png', 1.0);
    } catch (error) {
      console.error('Bitmap processing error:', error);
      return "";
    }
  }

  async reconnectDevice(): Promise<boolean> {
    console.log('🔄 Attempting device reconnection...');
    return await this.initializeDevice();
  }

  async forceReset() {
    console.log('🔄 Force resetting MFS100 manager...');
    
    this.captureQueue.length = 0;
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
    
    this.lastSuccessfulOperation = 0;
    this.connectionStable = false;
    this.consecutiveSuccesses = 0;
    
    // Try to reinitialize after reset
    setTimeout(() => {
      this.initializeDevice();
    }, 2000);
  }

  clearQueue() {
    console.log('🗑️ Clearing capture queue...');
    this.captureQueue.forEach(request => {
      request.resolve({
        success: false,
        template: '',
        imageData: '',
        quality: 0,
        message: 'Capture cancelled due to queue clear'
      });
    });
    this.captureQueue.length = 0;
  }

  getState(): DeviceState {
    return { ...this.state };
  }

  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    this.clearQueue();
    this.subscribers.clear();
  }
}

export const globalMFS100Manager = new GlobalMFS100Manager();
