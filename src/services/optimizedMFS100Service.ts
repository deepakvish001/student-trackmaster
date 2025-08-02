
/**
 * Optimized MFS100 Service - Single connection, continuous capture
 * Designed for unlimited student enrollments without re-initialization
 */

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
  lastError: string | null;
  deviceInfo: any;
  isInitialized: boolean;
}

type StateChangeCallback = (state: MFS100DeviceState) => void;

class OptimizedMFS100Service {
  private static instance: OptimizedMFS100Service;
  private baseUrl = 'https://localhost:8003/mfs100';
  private state: MFS100DeviceState = {
    isConnected: false,
    isCapturing: false,
    lastError: null,
    deviceInfo: null,
    isInitialized: false
  };
  
  private subscribers: StateChangeCallback[] = [];
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private isReconnecting = false;

  private constructor() {
    console.log('🔧 Optimized MFS100 Service initialized');
    this.initializeService();
  }

  static getInstance(): OptimizedMFS100Service {
    if (!OptimizedMFS100Service.instance) {
      OptimizedMFS100Service.instance = new OptimizedMFS100Service();
    }
    return OptimizedMFS100Service.instance;
  }

  // Subscribe to state changes
  subscribe(callback: StateChangeCallback): () => void {
    this.subscribers.push(callback);
    // Immediately notify with current state
    callback(this.state);
    
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback({ ...this.state }));
  }

  private updateState(updates: Partial<MFS100DeviceState>) {
    this.state = { ...this.state, ...updates };
    this.notifySubscribers();
    console.log('📊 MFS100 State updated:', this.state);
  }

  private async initializeService() {
    try {
      console.log('🚀 Initializing MFS100 service...');
      
      // Check if device is available
      const isAvailable = await this.checkDeviceAvailability();
      
      if (isAvailable) {
        const deviceInfo = await this.getDeviceInfo();
        this.updateState({
          isConnected: true,
          isInitialized: true,
          deviceInfo,
          lastError: null
        });
        console.log('✅ MFS100 service initialized successfully');
        this.startConnectionMonitoring();
      } else {
        this.updateState({
          isConnected: false,
          isInitialized: true,
          lastError: 'Device not available'
        });
        console.log('⚠️ MFS100 device not available, will retry in background');
        this.startReconnectionLoop();
      }
    } catch (error) {
      console.error('❌ Failed to initialize MFS100 service:', error);
      this.updateState({
        isConnected: false,
        isInitialized: true,
        lastError: 'Initialization failed'
      });
      this.startReconnectionLoop();
    }
  }

  private async checkDeviceAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/info`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async getDeviceInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/info`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return null;
    } catch (error) {
      console.error('Failed to get device info:', error);
      return null;
    }
  }

  private startConnectionMonitoring() {
    // Clear any existing interval
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }

    // Check connection every 10 seconds when connected
    this.connectionCheckInterval = setInterval(async () => {
      if (!this.state.isCapturing) {
        const isAvailable = await this.checkDeviceAvailability();
        
        if (!isAvailable && this.state.isConnected) {
          console.log('🔌 Device disconnected, starting reconnection');
          this.updateState({
            isConnected: false,
            lastError: 'Device not available'
          });
          this.startReconnectionLoop();
        }
      }
    }, 10000);
  }

  private startReconnectionLoop() {
    if (this.isReconnecting) return;
    
    this.isReconnecting = true;
    console.log('🔄 Starting silent reconnection...');

    const attemptReconnection = async () => {
      if (this.state.isConnected) {
        this.isReconnecting = false;
        return;
      }

      const isAvailable = await this.checkDeviceAvailability();
      
      if (isAvailable) {
        console.log('✅ Device reconnected!');
        const deviceInfo = await this.getDeviceInfo();
        this.updateState({
          isConnected: true,
          deviceInfo,
          lastError: null
        });
        this.isReconnecting = false;
        this.startConnectionMonitoring();
      } else {
        // Retry every 5 seconds
        setTimeout(attemptReconnection, 5000);
      }
    };

    attemptReconnection();
  }

  async captureFingerprint(quality: number = 60, timeout: number = 15): Promise<MFS100CaptureResult> {
    if (!this.state.isConnected) {
      return {
        success: false,
        template: '',
        imageData: '',
        quality: 0,
        message: 'Device not available - please wait for reconnection'
      };
    }

    if (this.state.isCapturing) {
      return {
        success: false,
        template: '',
        imageData: '',
        quality: 0,
        message: 'Another capture is in progress'
      };
    }

    try {
      this.updateState({ isCapturing: true });
      console.log('👆 Starting fingerprint capture...');

      const response = await fetch(`${this.baseUrl}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          Quality: quality,
          TimeOut: timeout
        })
      });

      if (!response.ok) {
        throw new Error('Service not responding');
      }

      const data = await response.json();

      if (data.ErrorCode === "0") {
        console.log(`✅ Fingerprint captured successfully, Quality: ${data.Quality}%`);
        
        return {
          success: true,
          template: data.IsoTemplate || '',
          imageData: data.BitmapData || '',
          quality: data.Quality || 0,
          message: `Captured successfully with quality ${data.Quality}%`
        };
      } else {
        return {
          success: false,
          template: '',
          imageData: '',
          quality: 0,
          message: data.ErrorDescription || 'Capture failed - please try again'
        };
      }

    } catch (error) {
      console.error('❌ Capture failed:', error);
      
      // Check if it's a connection error
      const isConnectionError = error instanceof Error && 
        (error.message.includes('fetch') || error.message.includes('connection'));
      
      if (isConnectionError) {
        this.updateState({
          isConnected: false,
          lastError: 'Device disconnected'
        });
        this.startReconnectionLoop();
      }

      return {
        success: false,
        template: '',
        imageData: '',
        quality: 0,
        message: 'Capture failed - device may be disconnected'
      };
    } finally {
      this.updateState({ isCapturing: false });
    }
  }

  getState(): MFS100DeviceState {
    return { ...this.state };
  }

  // Clean shutdown
  destroy() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
    this.isReconnecting = false;
    this.subscribers = [];
  }
}

export const optimizedMFS100Service = OptimizedMFS100Service.getInstance();
