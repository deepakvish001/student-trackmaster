
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
    
    // Auto-initialize on page load
    this.autoInitialize();
    
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

    // Longer delay to ensure all scripts are loaded
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🚀 Starting auto-initialization with enhanced stability...');
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

      // Initialize the SDK with longer timeout
      const initResult = await this.callSDKFunctionWithTimeout('InitMFS100', 10000);
      if (!this.isValidResponse(initResult)) {
        throw new Error(initResult?.data?.ErrorDescription || 'SDK initialization failed');
      }

      // Get device info to confirm connection
      const deviceInfo = await this.getDeviceInfoWithRetry();
      
      this.updateState({
        isInitializing: false,
        isConnected: true,
        deviceInfo,
        error: null,
        lastConnectionTime: new Date(),
        reconnectAttempts: 0
      });

      // Mark successful operation
      this.lastSuccessfulOperation = Date.now();
      this.consecutiveSuccesses = 1;

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

      // More conservative retry logic
      if (this.shouldRetryInitialization(errorMessage) && this.state.reconnectAttempts < 3) {
        const retryDelay = Math.min(5000 * Math.pow(2, this.state.reconnectAttempts - 1), 60000);
        console.log(`🔄 Retrying initialization in ${retryDelay}ms...`);
        
        setTimeout(() => {
          this.initializeDevice();
        }, retryDelay);
      }

      return false;
    }
  }

  private async callSDKFunctionWithTimeout(functionName: string, timeoutMs: number = 8000, ...args: any[]): Promise<any> {
    return new Promise((resolve) => {
      const sdkFunction = (window as any)[functionName];
      if (typeof sdkFunction !== 'function') {
        resolve({ httpStaus: false, err: `Function ${functionName} not available` });
        return;
      }

      let completed = false;
      const timeout = setTimeout(() => {
        if (!completed) {
          completed = true;
          resolve({ httpStaus: false, err: `${functionName} timeout` });
        }
      }, timeoutMs);

      try {
        sdkFunction((result: any) => {
          if (!completed) {
            completed = true;
            clearTimeout(timeout);
            resolve(result);
          }
        }, ...args);
      } catch (error) {
        if (!completed) {
          completed = true;
          clearTimeout(timeout);
          resolve({ httpStaus: false, err: error instanceof Error ? error.message : 'SDK call failed' });
        }
      }
    });
  }

  private async getDeviceInfoWithRetry(maxRetries: number = 2): Promise<any> {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        if (i > 0) {
          // Small delay between retries
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log(`🔄 Retrying device info (${i}/${maxRetries})...`);
        }

        const result = await this.callSDKFunctionWithTimeout('GetMFS100Info', 8000);
        if (this.isValidResponse(result)) {
          return result.data;
        }
        
        lastError = new Error(result?.data?.ErrorDescription || 'Failed to get device info');
      } catch (error) {
        lastError = error;
      }
    }
    
    throw lastError;
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
      'timeout'
    ];
    
    return retryableErrors.some(retryError => 
      error.toLowerCase().includes(retryError.toLowerCase())
    );
  }

  private isValidResponse(response: any): boolean {
    return response?.httpStaus && response.data?.ErrorCode === "0";
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

      // Smart connection handling - don't re-initialize if recently successful
      const timeSinceSuccess = Date.now() - this.lastSuccessfulOperation;
      
      if (!this.state.isConnected && !this.state.isInitializing) {
        // Only reinitialize if we haven't had success recently
        if (timeSinceSuccess > 120000) { // 2 minutes
          this.initializeDevice().then(() => {
            this.processQueue();
          });
        } else {
          // Try to process queue directly - device might still work
          console.log('🎯 Attempting direct capture - device was working recently');
          this.processQueue();
        }
      } else if (this.state.isConnected || timeSinceSuccess < 30000) {
        // Process immediately if connected or recently successful
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.state.isCapturing || this.captureQueue.length === 0) {
      return;
    }

    // Allow processing even if marked as "disconnected" if we had recent success
    const timeSinceSuccess = Date.now() - this.lastSuccessfulOperation;
    const canProcess = this.state.isConnected || timeSinceSuccess < 60000; // 1 minute grace period

    if (!canProcess) {
      return;
    }

    const captureRequest = this.captureQueue.shift();
    if (!captureRequest) return;

    this.updateState({ isCapturing: true });

    try {
      console.log(`📷 Processing capture request ${captureRequest.id}...`);
      
      const result = await this.performCaptureWithStability(captureRequest.quality, captureRequest.timeout);
      captureRequest.resolve(result);
      
      console.log(`✅ Capture ${captureRequest.id} completed successfully`);
      
      // Mark successful operation and connection as stable
      this.lastSuccessfulOperation = Date.now();
      this.consecutiveSuccesses++;
      
      // Update connection state to connected on successful capture
      this.updateState({ 
        isConnected: true, 
        error: null, 
        reconnectAttempts: 0 
      });
      
    } catch (error) {
      console.error(`❌ Capture ${captureRequest.id} failed:`, error);
      captureRequest.reject(error instanceof Error ? error : new Error('Capture failed'));
      
      // Don't immediately mark as disconnected - could be temporary
      const timeSinceLastSuccess = Date.now() - this.lastSuccessfulOperation;
      if (timeSinceLastSuccess > 300000) { // Only mark disconnected after 5 minutes of no success
        this.updateState({ 
          isConnected: false, 
          error: error instanceof Error ? error.message : 'Capture failed' 
        });
      }
      
    } finally {
      this.updateState({ isCapturing: false });
      
      // Process next item in queue with delay
      setTimeout(() => this.processQueue(), 500);
    }
  }

  private async performCaptureWithStability(quality: number, timeout: number): Promise<CaptureResult> {
    // Use longer timeout and better error handling
    const result = await this.callSDKFunctionWithTimeout('CaptureFinger', (timeout + 5) * 1000);
    
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

  async reconnectDevice(): Promise<boolean> {
    console.log('🔄 Attempting device reconnection...');
    
    // Don't mark as disconnected immediately - could be temporary issue
    this.updateState({ error: 'Reconnecting...' });
    
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
    
    // Clear health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.clearQueue();
    this.initPromise = null;
    
    // Reset all tracking variables
    this.lastSuccessfulOperation = 0;
    this.connectionStable = false;
    this.consecutiveSuccesses = 0;
    
    this.updateState({
      isConnected: false,
      isInitializing: false,
      isCapturing: false,
      error: null,
      deviceInfo: null,
      lastConnectionTime: null,
      reconnectAttempts: 0
    });
    
    // Restart health monitoring
    this.startHealthMonitoring();
    
    // Wait a moment then reinitialize
    setTimeout(() => {
      this.initializeDevice();
    }, 2000);
  }
}

// Export singleton instance
export const globalMFS100Manager = new GlobalMFS100Manager();
