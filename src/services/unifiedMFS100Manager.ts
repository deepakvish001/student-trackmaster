/**
 * Unified MFS100 Manager - Enhanced with improved service recovery
 */

import { mfs100ServiceRecovery } from './mfs100ServiceRecovery';

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
  isRecovering?: boolean;
}

class UnifiedMFS100Manager {
  private static instance: UnifiedMFS100Manager;
  private baseUrl = 'https://localhost:8003/mfs100';
  private connectionState: MFS100ConnectionState = {
    isConnected: false,
    lastCheckTime: null,
    deviceInfo: null,
    error: null,
    consecutiveFailures: 0,
    isRecovering: false
  };
  private subscribers: Set<(state: MFS100ConnectionState) => void> = new Set();
  private checkInProgress = false;
  private captureInProgress = false;
  private lastSuccessfulConnection = 0;
  private captureController: AbortController | null = null;
  private maxConsecutiveFailures = 3; // Reduced for quicker recovery
  private recoveryInProgress = false;

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
    callback({ ...this.connectionState });
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(): void {
    const state = { ...this.connectionState };
    this.subscribers.forEach(callback => callback(state));
  }

  // Improved service recovery with better error handling
  private async performServiceRecovery(): Promise<void> {
    if (this.recoveryInProgress) {
      console.log('Recovery already in progress, skipping...');
      return;
    }

    this.recoveryInProgress = true;
    console.log('🚨 Starting enhanced service recovery...');
    
    this.connectionState.isRecovering = true;
    this.notifySubscribers();

    try {
      const result = await mfs100ServiceRecovery.recoverService();
      
      if (result.success) {
        console.log('✅ Enhanced recovery successful:', result.message);
        
        // Update base URL if it changed
        if (result.newBaseUrl) {
          this.baseUrl = result.newBaseUrl;
        }

        // Reset failure count and update state
        this.connectionState.consecutiveFailures = 0;
        this.connectionState.error = null;

        // Wait a moment then verify connection
        setTimeout(() => {
          this.checkConnection(true);
        }, 1500);

      } else {
        console.error('❌ Enhanced recovery failed:', result.message);
        this.connectionState.error = result.message;
      }

    } catch (error) {
      console.error('Recovery process error:', error);
      this.connectionState.error = 'Recovery process failed';
    } finally {
      this.connectionState.isRecovering = false;
      this.recoveryInProgress = false;
      this.notifySubscribers();
    }
  }

  // Enhanced connection check with better error handling
  async checkConnection(force = false): Promise<MFS100ConnectionState> {
    if (this.checkInProgress || this.connectionState.isRecovering) {
      return { ...this.connectionState };
    }

    // Rate limiting - don't check too frequently
    const timeSinceLastCheck = Date.now() - (this.connectionState.lastCheckTime?.getTime() || 0);
    if (!force && timeSinceLastCheck < 2000) {
      return { ...this.connectionState };
    }

    this.checkInProgress = true;

    try {
      console.log('🔍 Checking MFS100 device connection...');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

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
        // Success - reset everything
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
          consecutiveFailures: 0,
          isRecovering: false
        };
        
        this.lastSuccessfulConnection = Date.now();
        
        // Reset recovery attempts on successful connection
        mfs100ServiceRecovery.resetRecoveryAttempts();
        
        console.log('✅ MFS100 device connected and ready');
        
      } else {
        throw new Error(data.ErrorDescription || 'Device not ready');
      }

    } catch (error) {
      this.connectionState.consecutiveFailures++;
      
      let errorMessage = 'Service unavailable';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Connection timeout';
        } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
          errorMessage = 'MFS100 service not responding';
        } else {
          errorMessage = error.message;
        }
      }

      this.connectionState.isConnected = false;
      this.connectionState.error = errorMessage;
      this.connectionState.lastCheckTime = new Date();

      console.warn(`⚠️ Connection failed (${this.connectionState.consecutiveFailures}/${this.maxConsecutiveFailures}):`, errorMessage);
      
      // Trigger recovery if consecutive failures reached
      if (this.connectionState.consecutiveFailures >= this.maxConsecutiveFailures && !this.recoveryInProgress) {
        setTimeout(() => {
          this.performServiceRecovery();
        }, 2000);
      }
      
    } finally {
      this.checkInProgress = false;
      this.notifySubscribers();
    }

    return { ...this.connectionState };
  }

  // Enhanced capture with recovery
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

    if (this.connectionState.isRecovering) {
      return {
        success: false,
        template: '',
        imageData: '',
        quality: 0,
        message: 'Service recovery in progress, please wait...'
      };
    }

    // Auto-recovery check
    if (!this.connectionState.isConnected && this.connectionState.consecutiveFailures >= 3) {
      console.log('🔄 Auto-triggering recovery before capture...');
      await this.performServiceRecovery();
      
      // Wait for recovery to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Check connection before capture
    if (!this.connectionState.isConnected) {
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
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
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
        
        // Reset failure count on successful capture
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
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          message = 'Capture timed out - service may be stuck';
          // Increment failure count for timeouts
          this.connectionState.consecutiveFailures++;
        } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
          message = 'Lost connection to device';
          this.connectionState.isConnected = false;
          this.connectionState.error = message;
          this.connectionState.consecutiveFailures++;
        } else {
          message = error.message;
          this.connectionState.consecutiveFailures++;
        }
      }

      console.error('❌ Fingerprint capture failed:', message);
      
      // Trigger recovery if failures are mounting
      if (this.connectionState.consecutiveFailures >= this.maxConsecutiveFailures) {
        setTimeout(() => {
          this.performServiceRecovery();
        }, 2000);
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

  // Check if device is probably available
  isProbablyAvailable(): boolean {
    const timeSinceSuccess = Date.now() - this.lastSuccessfulConnection;
    return this.connectionState.isConnected && 
           this.connectionState.consecutiveFailures === 0 && 
           timeSinceSuccess < 30000 &&
           !this.connectionState.isRecovering;
  }

  // Enhanced reset with recovery
  reset(): void {
    console.log('🔄 Resetting MFS100 with enhanced recovery...');
    
    this.cancelCapture();
    
    this.connectionState = {
      isConnected: false,
      lastCheckTime: null,
      deviceInfo: null,
      error: null,
      consecutiveFailures: 0,
      isRecovering: false
    };
    this.lastSuccessfulConnection = 0;
    this.checkInProgress = false;
    this.captureInProgress = false;
    this.recoveryInProgress = false;
    
    this.notifySubscribers();
    
    // Reset recovery attempts and start fresh
    mfs100ServiceRecovery.resetRecoveryAttempts();
    
    // Start recovery process
    setTimeout(async () => {
      await this.performServiceRecovery();
    }, 1000);
  }
}

// Export singleton instance
export const unifiedMFS100Manager = UnifiedMFS100Manager.getInstance();
