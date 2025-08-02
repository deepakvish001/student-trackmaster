
import { globalMFS100Manager } from './globalMFS100Manager';

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
  private subscribers: Set<(state: MFS100ConnectionState) => void> = new Set();

  constructor() {
    console.log('🔵 PersistentMFS100Service: Now using Global Manager');
    
    // Subscribe to global manager updates
    globalMFS100Manager.subscribe((globalState) => {
      const mappedState: MFS100ConnectionState = {
        isConnected: globalState.isConnected,
        isInitialized: globalState.isConnected, // In global manager, connected means initialized
        deviceInfo: globalState.deviceInfo,
        error: globalState.error,
        lastActivity: globalState.lastConnectionTime
      };
      
      this.notifySubscribers(mappedState);
    });
  }

  subscribe(callback: (state: MFS100ConnectionState) => void) {
    this.subscribers.add(callback);
    
    // Get current state from global manager and map it
    const globalState = globalMFS100Manager.getState();
    const mappedState: MFS100ConnectionState = {
      isConnected: globalState.isConnected,
      isInitialized: globalState.isConnected,
      deviceInfo: globalState.deviceInfo,
      error: globalState.error,
      lastActivity: globalState.lastConnectionTime
    };
    
    callback(mappedState);
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(state: MFS100ConnectionState) {
    this.subscribers.forEach(callback => {
      callback(state);
    });
  }

  async initializeDevice(): Promise<boolean> {
    console.log('🎯 PersistentService: Delegating to Global Manager...');
    return await globalMFS100Manager.initializeDevice();
  }

  async captureFingerprint(quality: number = 60, timeout: number = 15): Promise<MFS100CaptureResult> {
    try {
      return await globalMFS100Manager.captureFingerprint(quality, timeout);
    } catch (error) {
      return {
        success: false,
        template: '',
        imageData: '',
        quality: 0,
        message: error instanceof Error ? error.message : 'Capture failed'
      };
    }
  }

  getState(): MFS100ConnectionState {
    const globalState = globalMFS100Manager.getState();
    return {
      isConnected: globalState.isConnected,
      isInitialized: globalState.isConnected,
      deviceInfo: globalState.deviceInfo,
      error: globalState.error,
      lastActivity: globalState.lastConnectionTime
    };
  }

  resetConnection() {
    console.log('🔄 PersistentService: Requesting global reset...');
    globalMFS100Manager.forceReset();
  }
}

// Export singleton instance
export const persistentMFS100Service = new PersistentMFS100Service();
