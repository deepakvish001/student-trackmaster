
/**
 * Unified MFS100 Service - Single point of communication with MFS100 device
 * Prevents conflicts and ensures stable operation without system restarts
 */

export interface MFS100CaptureRequest {
  id: string;
  fingerName: string;
  quality: number;
  timeout: number;
  onProgress?: (status: string) => void;
  onSuccess: (result: MFS100CaptureResult) => void;
  onError: (error: string) => void;
}

export interface MFS100CaptureResult {
  success: boolean;
  template: string;
  imageData: string;
  quality: number;
  message: string;
}

export interface MFS100DeviceState {
  isConnected: boolean;
  isCapturing: boolean;
  lastCheckTime: Date | null;
  error: string | null;
  deviceInfo: any;
  queueLength: number;
  currentCapture: string | null;
}

class UnifiedMFS100Service {
  private static instance: UnifiedMFS100Service;
  private baseUrl = 'https://localhost:8003/mfs100';
  private deviceState: MFS100DeviceState = {
    isConnected: false,
    isCapturing: false,
    lastCheckTime: null,
    error: null,
    deviceInfo: null,
    queueLength: 0,
    currentCapture: null
  };
  
  private subscribers: Set<(state: MFS100DeviceState) => void> = new Set();
  private captureQueue: MFS100CaptureRequest[] = [];
  private isProcessingQueue = false;
  private currentController: AbortController | null = null;
  private lastConnectionCheck = 0;
  private connectionCheckInterval = 10000; // 10 seconds minimum between checks
  
  private constructor() {}
  
  static getInstance(): UnifiedMFS100Service {
    if (!UnifiedMFS100Service.instance) {
      UnifiedMFS100Service.instance = new UnifiedMFS100Service();
    }
    return UnifiedMFS100Service.instance;
  }
  
  // Subscribe to device state changes
  subscribe(callback: (state: MFS100DeviceState) => void): () => void {
    this.subscribers.add(callback);
    callback({ ...this.deviceState });
    return () => this.subscribers.delete(callback);
  }
  
  private notifySubscribers(): void {
    const state = { ...this.deviceState };
    this.subscribers.forEach(callback => callback(state));
  }
  
  // Smart connection check - only when needed
  private async checkConnection(force = false): Promise<boolean> {
    const now = Date.now();
    
    // Rate limiting - don't check too frequently
    if (!force && (now - this.lastConnectionCheck) < this.connectionCheckInterval) {
      return this.deviceState.isConnected;
    }
    
    this.lastConnectionCheck = now;
    
    try {
      console.log('🔍 Checking MFS100 connection...');
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${this.baseUrl}/info`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.ErrorCode === "0" && data.DeviceInfo) {
        this.deviceState.isConnected = true;
        this.deviceState.error = null;
        this.deviceState.deviceInfo = data.DeviceInfo;
        this.deviceState.lastCheckTime = new Date();
        console.log('✅ MFS100 connected successfully');
      } else {
        throw new Error(data.ErrorDescription || 'Device not ready');
      }
      
    } catch (error) {
      this.deviceState.isConnected = false;
      this.deviceState.error = error instanceof Error ? error.message : 'Connection failed';
      this.deviceState.lastCheckTime = new Date();
      console.warn('⚠️ MFS100 connection failed:', this.deviceState.error);
    }
    
    this.notifySubscribers();
    return this.deviceState.isConnected;
  }
  
  // Add capture request to queue
  async queueCapture(request: MFS100CaptureRequest): Promise<void> {
    console.log(`📝 Queuing capture for ${request.fingerName}`);
    
    this.captureQueue.push(request);
    this.deviceState.queueLength = this.captureQueue.length;
    this.notifySubscribers();
    
    // Start processing if not already running
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }
  
  // Process capture queue one by one
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.captureQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    while (this.captureQueue.length > 0) {
      const request = this.captureQueue.shift()!;
      this.deviceState.queueLength = this.captureQueue.length;
      this.deviceState.currentCapture = request.fingerName;
      this.deviceState.isCapturing = true;
      this.notifySubscribers();
      
      await this.executeCapture(request);
      
      // Small delay between captures to prevent device overload
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.deviceState.isCapturing = false;
    this.deviceState.currentCapture = null;
    this.deviceState.queueLength = 0;
    this.isProcessingQueue = false;
    this.notifySubscribers();
  }
  
  // Execute single capture
  private async executeCapture(request: MFS100CaptureRequest): Promise<void> {
    try {
      console.log(`🔵 Processing capture for ${request.fingerName}`);
      
      // Check connection before capture
      const isConnected = await this.checkConnection();
      if (!isConnected) {
        throw new Error('Device not connected');
      }
      
      request.onProgress?.('Preparing capture...');
      
      this.currentController = new AbortController();
      const timeout = setTimeout(() => {
        this.currentController?.abort();
      }, (request.timeout * 1000) + 2000);
      
      request.onProgress?.('Capturing fingerprint...');
      
      const response = await fetch(`${this.baseUrl}/capture`, {
        method: 'POST',
        signal: this.currentController.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          Quality: request.quality,
          TimeOut: request.timeout
        })
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.ErrorCode === "0") {
        request.onProgress?.('Processing image...');
        
        const result: MFS100CaptureResult = {
          success: true,
          template: data.IsoTemplate || '',
          imageData: data.BitmapData || '',
          quality: data.Quality || 0,
          message: `Captured with quality ${data.Quality}%`
        };
        
        console.log(`✅ ${request.fingerName} captured successfully, Quality: ${data.Quality}`);
        request.onSuccess(result);
        
      } else {
        throw new Error(data.ErrorDescription || 'Capture failed');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      console.error(`❌ ${request.fingerName} capture failed:`, errorMessage);
      
      // Only mark as disconnected on connection errors
      if (errorMessage.includes('ERR_CONNECTION_REFUSED') || 
          errorMessage.includes('Failed to fetch')) {
        this.deviceState.isConnected = false;
        this.deviceState.error = 'Service unavailable';
      }
      
      request.onError(errorMessage);
      
    } finally {
      this.currentController = null;
    }
  }
  
  // Cancel current capture
  cancelCurrentCapture(): void {
    if (this.currentController) {
      console.log('🛑 Cancelling current capture...');
      this.currentController.abort();
      this.currentController = null;
    }
  }
  
  // Clear queue and reset
  clearQueue(): void {
    console.log('🗑️ Clearing capture queue...');
    this.captureQueue = [];
    this.deviceState.queueLength = 0;
    this.cancelCurrentCapture();
    this.notifySubscribers();
  }
  
  // Gentle reset without aggressive service disruption
  async softReset(): Promise<void> {
    console.log('🔄 Performing soft reset...');
    
    this.clearQueue();
    this.deviceState.isCapturing = false;
    this.deviceState.currentCapture = null;
    this.deviceState.error = null;
    
    // Wait a moment then check connection
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.checkConnection(true);
  }
  
  // Get current device state
  getState(): MFS100DeviceState {
    return { ...this.deviceState };
  }
}

export const unifiedMFS100Service = UnifiedMFS100Service.getInstance();
