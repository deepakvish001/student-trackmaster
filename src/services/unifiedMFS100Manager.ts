
/**
 * Unified MFS100 Manager - Single source of truth for MFS100 device communication
 * Prevents conflicts between multiple components trying to access the same device
 */

export interface MFS100DeviceInfo {
  dpId: string;
  rdsId: string;
  rdsVer: string;
  dc: string;
  mi: string;
  mc: string;
  serialNo: string;
  make: string;
  model: string;
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
  lastCheckTime: Date | null;
  deviceInfo: MFS100DeviceInfo | null;
  error: string | null;
  consecutiveFailures: number;
}

class UnifiedMFS100Manager {
  private static instance: UnifiedMFS100Manager;
  private baseUrl = 'https://localhost:8003/mfs100';
  private connectionState: MFS100ConnectionState = {
    isConnected: false,
    lastCheckTime: null,
    deviceInfo: null,
    error: null,
    consecutiveFailures: 0
  };
  private subscribers: Set<(state: MFS100ConnectionState) => void> = new Set();
  private checkInProgress = false;
  private captureInProgress = false;
  private lastSuccessfulConnection = 0;
  private captureController: AbortController | null = null;
  private serviceRecoveryInProgress = false;

  private constructor() {}

  static getInstance(): UnifiedMFS100Manager {
    if (!UnifiedMFS100Manager.instance) {
      UnifiedMFS100Manager.instance = new UnifiedMFS100Manager();
    }
    return UnifiedMFS100Manager.instance;
  }

  // Subscribe to connection state changes
  subscribe(callback: (state: MFS100ConnectionState) => void): () => void {
    this.subscribers.add(callback);
    // Immediately call with current state
    callback({ ...this.connectionState });
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(): void {
    const state = { ...this.connectionState };
    this.subscribers.forEach(callback => callback(state));
  }

  // Service recovery after timeout or failure
  private async recoverService(): Promise<void> {
    if (this.serviceRecoveryInProgress) {
      return;
    }

    this.serviceRecoveryInProgress = true;
    console.log('🔄 Starting MFS100 service recovery...');

    try {
      // Cancel any ongoing capture
      if (this.captureController) {
        this.captureController.abort();
        this.captureController = null;
      }

      this.captureInProgress = false;

      // Wait for service to settle
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try to reconnect
      await this.checkConnection(true);

      console.log('✅ MFS100 service recovery completed');

    } catch (error) {
      console.error('❌ Service recovery failed:', error);
    } finally {
      this.serviceRecoveryInProgress = false;
    }
  }

  // Check device connection (rate limited)
  async checkConnection(force = false): Promise<MFS100ConnectionState> {
    // Prevent concurrent checks
    if (this.checkInProgress) {
      return { ...this.connectionState };
    }

    // Rate limiting - don't check too frequently unless forced
    const timeSinceLastCheck = Date.now() - (this.connectionState.lastCheckTime?.getTime() || 0);
    if (!force && timeSinceLastCheck < 3000) {
      return { ...this.connectionState };
    }

    this.checkInProgress = true;

    try {
      console.log('🔍 Checking MFS100 device connection...');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/info`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.ErrorCode === "0" && data.DeviceInfo) {
        // Success - update state
        this.connectionState = {
          isConnected: true,
          lastCheckTime: new Date(),
          deviceInfo: {
            dpId: data.DeviceInfo.SerialNo || 'MFS100',
            rdsId: data.DeviceInfo.Make || 'MANTRA',
            rdsVer: data.DeviceInfo.Model || 'MFS100',
            dc: data.DeviceInfo.Certificate || '',
            mi: data.DeviceInfo.Make || 'MANTRA',
            mc: data.DeviceInfo.Model || 'MFS100',
            serialNo: data.DeviceInfo.SerialNo || '',
            make: data.DeviceInfo.Make || 'MANTRA',
            model: data.DeviceInfo.Model || 'MFS100'
          },
          error: null,
          consecutiveFailures: 0
        };
        
        this.lastSuccessfulConnection = Date.now();
        console.log('✅ MFS100 device connected and ready');
        
      } else {
        throw new Error(data.ErrorDescription || 'Device not ready');
      }

    } catch (error) {
      this.connectionState.consecutiveFailures++;
      
      let errorMessage = 'Device not available';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Connection timeout';
        } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
          errorMessage = 'MFS100 service not running';
        } else {
          errorMessage = error.message;
        }
      }

      this.connectionState.isConnected = false;
      this.connectionState.error = errorMessage;
      this.connectionState.lastCheckTime = new Date();

      console.warn(`⚠️ MFS100 connection check failed (${this.connectionState.consecutiveFailures}):`, errorMessage);
      
    } finally {
      this.checkInProgress = false;
      this.notifySubscribers();
    }

    return { ...this.connectionState };
  }

  // Capture fingerprint with improved timeout handling
  async captureFingerprint(quality: number = 60, timeout: number = 15): Promise<MFS100CaptureResult> {
    if (this.captureInProgress) {
      return {
        success: false,
        template: '',
        imageData: '',
        quality: 0,
        message: 'Another capture is already in progress'
      };
    }

    // Check connection first
    if (!this.connectionState.isConnected || this.connectionState.consecutiveFailures > 0) {
      console.log('🔄 Checking connection before capture...');
      await this.checkConnection(true);
    }

    if (!this.connectionState.isConnected) {
      return {
        success: false,
        template: '',
        imageData: '',
        quality: 0,
        message: this.connectionState.error || 'Device not connected'
      };
    }

    this.captureInProgress = true;
    this.captureController = new AbortController();

    try {
      console.log('🔵 Starting fingerprint capture...');

      const requestTimeout = setTimeout(() => {
        if (this.captureController) {
          this.captureController.abort();
        }
      }, (timeout * 1000) + 5000);

      const response = await fetch(`${this.baseUrl}/capture`, {
        method: 'POST',
        signal: this.captureController.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          Quality: quality,
          TimeOut: timeout
        })
      });

      clearTimeout(requestTimeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.ErrorCode === "0") {
        console.log(`✅ Fingerprint captured successfully, Quality: ${data.Quality}`);
        
        // Update connection state to show device is working
        this.connectionState.isConnected = true;
        this.connectionState.error = null;
        this.connectionState.consecutiveFailures = 0;
        this.connectionState.lastCheckTime = new Date();
        this.lastSuccessfulConnection = Date.now();
        this.notifySubscribers();

        return {
          success: true,
          template: data.IsoTemplate || '',
          imageData: data.BitmapData || '',
          quality: data.Quality || 0,
          message: `Fingerprint captured with quality ${data.Quality}%`
        };
      } else {
        throw new Error(data.ErrorDescription || 'Capture failed');
      }

    } catch (error) {
      let message = 'Capture failed';
      let shouldRecover = false;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          message = 'Capture timed out';
          shouldRecover = true;
        } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
          message = 'Lost connection to device';
          shouldRecover = true;
          // Mark as disconnected
          this.connectionState.isConnected = false;
          this.connectionState.error = message;
          this.connectionState.consecutiveFailures++;
        } else {
          message = error.message;
          shouldRecover = true;
        }
      }

      console.error('❌ Fingerprint capture failed:', message);
      
      // Attempt service recovery after timeout or connection issues
      if (shouldRecover) {
        console.log('🔄 Initiating service recovery after capture failure...');
        setTimeout(() => {
          this.recoverService();
        }, 1000);
      }
      
      this.notifySubscribers();
      
      return {
        success: false,
        template: '',
        imageData: '',
        quality: 0,
        message
      };

    } finally {
      this.captureInProgress = false;
      this.captureController = null;
    }
  }

  // Cancel ongoing capture
  cancelCapture(): void {
    if (this.captureController) {
      console.log('🛑 Cancelling ongoing fingerprint capture...');
      this.captureController.abort();
      this.captureController = null;
    }
    this.captureInProgress = false;
    this.notifySubscribers();
  }

  // Get current state
  getState(): MFS100ConnectionState {
    return { ...this.connectionState };
  }

  // Check if device is probably available based on recent success
  isProbablyAvailable(): boolean {
    const timeSinceSuccess = Date.now() - this.lastSuccessfulConnection;
    return this.connectionState.isConnected && 
           this.connectionState.consecutiveFailures === 0 && 
           timeSinceSuccess < 30000; // 30 seconds
  }

  // Reset connection state with recovery
  reset(): void {
    console.log('🔄 Resetting MFS100 connection state...');
    
    // Cancel any ongoing operations
    this.cancelCapture();
    
    this.connectionState = {
      isConnected: false,
      lastCheckTime: null,
      deviceInfo: null,
      error: null,
      consecutiveFailures: 0
    };
    this.lastSuccessfulConnection = 0;
    this.checkInProgress = false;
    this.captureInProgress = false;
    this.serviceRecoveryInProgress = false;
    
    this.notifySubscribers();
    
    // Start recovery process
    setTimeout(() => {
      this.recoverService();
    }, 1000);
  }
}

// Export singleton instance
export const unifiedMFS100Manager = UnifiedMFS100Manager.getInstance();
