/**
 * Unified MFS100 Manager - Enhanced with permanent recovery
 */

import { enhancedMFS100Recovery } from './enhancedMFS100Recovery';

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
  isRecovering: boolean;
  recoveryMessage: string | null;
}

class UnifiedMFS100Manager {
  private static instance: UnifiedMFS100Manager;
  private baseUrl = 'https://localhost:8003/mfs100';
  private connectionState: MFS100ConnectionState = {
    isConnected: true,
    lastCheckTime: null,
    deviceInfo: null,
    error: null,
    consecutiveFailures: 0,
    isRecovering: false,
    recoveryMessage: null
  };
  private subscribers: Set<(state: MFS100ConnectionState) => void> = new Set();
  private captureInProgress = false;
  private captureController: AbortController | null = null;

  private constructor() {}

  static getInstance(): UnifiedMFS100Manager {
    if (!UnifiedMFS100Manager.instance) {
      UnifiedMFS100Manager.instance = new UnifiedMFS100Manager();
    }
    return UnifiedMFS100Manager.instance;
  }

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

  async checkConnection(force = false): Promise<MFS100ConnectionState> {
    if (!force) {
      return { ...this.connectionState };
    }

    try {
      console.log('🔍 Manual connection check...');

      const response = await fetch(`${this.baseUrl}/info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.ErrorCode === "0" && data.DeviceInfo) {
        this.connectionState = {
          ...this.connectionState,
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
        
        console.log('✅ Manual check: Device connected and ready');
        
      } else {
        throw new Error(data.ErrorDescription || 'Device not ready');
      }

    } catch (error) {
      this.connectionState.consecutiveFailures++;
      
      let errorMessage = 'Device not available';
      if (error instanceof Error) {
        if (error.message.includes('ERR_CONNECTION_REFUSED')) {
          errorMessage = 'MFS100 service not running';
          
          // Trigger enhanced recovery for connection refused errors
          if (this.connectionState.consecutiveFailures >= 2) {
            this.triggerEnhancedRecovery();
          }
        } else {
          errorMessage = error.message;
        }
      }

      this.connectionState.isConnected = false;
      this.connectionState.error = errorMessage;
      this.connectionState.lastCheckTime = new Date();

      console.warn(`⚠️ Manual check failed:`, errorMessage);
      
    } finally {
      this.notifySubscribers();
    }

    return { ...this.connectionState };
  }

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

    this.captureInProgress = true;
    this.captureController = new AbortController();

    try {
      console.log('🔵 Starting fingerprint capture...');

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

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.ErrorCode === "0") {
        console.log(`✅ Fingerprint captured successfully, Quality: ${data.Quality}`);
        
        this.connectionState.isConnected = true;
        this.connectionState.error = null;
        this.connectionState.consecutiveFailures = 0;
        this.connectionState.lastCheckTime = new Date();
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
          message = 'Capture was cancelled';
        } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
          message = 'Lost connection to device - attempting recovery';
          this.connectionState.isConnected = false;
          this.connectionState.error = message;
          this.connectionState.consecutiveFailures++;
          
          // Trigger immediate enhanced recovery for capture failures
          this.triggerEnhancedRecovery();
        } else {
          message = error.message;
          if (!error.message.includes('cancelled') && !error.message.includes('timeout')) {
            this.connectionState.consecutiveFailures++;
          }
        }
      }

      console.error('❌ Fingerprint capture failed:', message);
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

  private async triggerEnhancedRecovery(): Promise<void> {
    if (!enhancedMFS100Recovery.canAttemptRecovery()) {
      return;
    }

    this.connectionState.isRecovering = true;
    this.connectionState.recoveryMessage = 'Enhanced recovery in progress...';
    this.notifySubscribers();

    try {
      const result = await enhancedMFS100Recovery.attemptFullRecovery((message) => {
        this.connectionState.recoveryMessage = message;
        this.notifySubscribers();
      });

      if (result.success && result.workingUrl) {
        const urlParts = result.workingUrl.split('/mfs100');
        if (urlParts[0]) {
          this.baseUrl = urlParts[0] + '/mfs100';
        }
        this.connectionState.consecutiveFailures = 0;
        this.connectionState.error = null;
        this.connectionState.isConnected = true;
        
        console.log('✅ Enhanced recovery successful!');
      } else {
        this.connectionState.error = result.message;
        console.error('❌ Enhanced recovery failed:', result.message);
      }

    } catch (error) {
      this.connectionState.error = 'Recovery failed';
      console.error('❌ Enhanced recovery error:', error);
    } finally {
      setTimeout(() => {
        this.connectionState.isRecovering = false;
        this.connectionState.recoveryMessage = null;
        this.notifySubscribers();
      }, 2000);
    }
  }

  async triggerRecovery(): Promise<{ success: boolean; message: string }> {
    if (!enhancedMFS100Recovery.canAttemptRecovery()) {
      return {
        success: false,
        message: 'Recovery is not available right now'
      };
    }

    this.connectionState.isRecovering = true;
    this.connectionState.recoveryMessage = 'Manual enhanced recovery initiated...';
    this.notifySubscribers();

    try {
      const result = await enhancedMFS100Recovery.attemptFullRecovery((message) => {
        this.connectionState.recoveryMessage = message;
        this.notifySubscribers();
      });

      if (result.success && result.workingUrl) {
        const urlParts = result.workingUrl.split('/mfs100');
        if (urlParts[0]) {
          this.baseUrl = urlParts[0] + '/mfs100';
        }
        this.connectionState.consecutiveFailures = 0;
        this.connectionState.error = null;
        this.connectionState.isConnected = true;
      }

      return result;

    } finally {
      setTimeout(() => {
        this.connectionState.isRecovering = false;
        this.connectionState.recoveryMessage = null;
        this.notifySubscribers();
      }, 3000);
    }
  }

  cancelCapture(): void {
    if (this.captureController) {
      console.log('🛑 Cancelling ongoing fingerprint capture...');
      this.captureController.abort();
      this.captureController = null;
    }
    this.captureInProgress = false;
    this.notifySubscribers();
  }

  getState(): MFS100ConnectionState {
    return { ...this.connectionState };
  }

  isProbablyAvailable(): boolean {
    return this.connectionState.isConnected && this.connectionState.consecutiveFailures <= 2;
  }

  reset(): void {
    console.log('🔄 Resetting MFS100 connection state...');
    
    this.cancelCapture();
    
    this.connectionState = {
      isConnected: true,
      lastCheckTime: null,
      deviceInfo: null,
      error: null,
      consecutiveFailures: 0,
      isRecovering: false,
      recoveryMessage: null
    };
    
    this.notifySubscribers();
  }

  setAutoRecovery(enabled: boolean): void {
    console.log(`🔧 Auto-recovery ${enabled ? 'enabled' : 'disabled'}`);
  }
}

export const unifiedMFS100Manager = UnifiedMFS100Manager.getInstance();
