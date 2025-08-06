
/**
 * Unified MFS100 Manager - Single source of truth for MFS100 device communication
 * Prevents conflicts between multiple components trying to access the same device
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
  isRecovering: boolean;
  recoveryMessage: string | null;
}

class UnifiedMFS100Manager {
  private static instance: UnifiedMFS100Manager;
  private baseUrl = 'http://localhost:8003/mfs100';
  private connectionState: MFS100ConnectionState = {
    isConnected: false,
    lastCheckTime: null,
    deviceInfo: null,
    error: null,
    consecutiveFailures: 0,
    isRecovering: false,
    recoveryMessage: null
  };
  private subscribers: Set<(state: MFS100ConnectionState) => void> = new Set();
  private checkInProgress = false;
  private captureInProgress = false;
  private lastSuccessfulConnection = 0;
  private captureController: AbortController | null = null;
  private autoRecoveryEnabled = true;
  private captureDelayBetweenOperations = 1500; // Reduced to 1.5 seconds
  private connectionCheckCooldown = 5000; // 5 seconds between connection checks
  private lastConnectionCheck = 0;

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

  // Trigger automatic recovery when needed
  private async triggerAutoRecovery(): Promise<void> {
    if (!this.autoRecoveryEnabled || this.connectionState.isRecovering) {
      return;
    }

    // Only trigger recovery after 5 consecutive failures to avoid false positives
    if (this.connectionState.consecutiveFailures >= 5 && mfs100ServiceRecovery.canAttemptRecovery()) {
      console.log('🔄 Triggering automatic MFS100 service recovery after 5 failures...');
      
      this.connectionState.isRecovering = true;
      this.connectionState.recoveryMessage = 'Initiating service recovery...';
      this.notifySubscribers();

      try {
        const recoveryResult = await mfs100ServiceRecovery.attemptRecovery((message) => {
          this.connectionState.recoveryMessage = message;
          this.notifySubscribers();
        });

        if (recoveryResult.success && recoveryResult.workingUrl) {
          // Update base URL if we found a working alternative
          const urlParts = recoveryResult.workingUrl.split('/mfs100');
          if (urlParts[0]) {
            this.baseUrl = urlParts[0] + '/mfs100';
            console.log(`✅ Updated MFS100 base URL to: ${this.baseUrl}`);
          }

          // Reset failure count and check connection
          this.connectionState.consecutiveFailures = 0;
          this.connectionState.error = null;
          
          // Re-check connection with new URL
          setTimeout(() => {
            this.checkConnection(true);
          }, 2000);
        }

        this.connectionState.recoveryMessage = recoveryResult.message;
        
      } catch (error) {
        console.error('❌ Auto-recovery failed:', error);
        this.connectionState.recoveryMessage = `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      // Clear recovery state after a delay
      setTimeout(() => {
        this.connectionState.isRecovering = false;
        this.connectionState.recoveryMessage = null;
        this.notifySubscribers();
      }, 3000);
    }
  }

  // Smart connection check with proper rate limiting
  async checkConnection(force = false): Promise<MFS100ConnectionState> {
    const now = Date.now();
    
    // Prevent concurrent checks and implement cooldown
    if (this.checkInProgress) {
      return { ...this.connectionState };
    }

    // Rate limiting - don't check too frequently unless forced
    if (!force && (now - this.lastConnectionCheck) < this.connectionCheckCooldown) {
      return { ...this.connectionState };
    }

    // If we had a successful capture recently, assume still connected
    if (!force && this.connectionState.isConnected && 
        (now - this.lastSuccessfulConnection) < 30000) { // 30 seconds
      return { ...this.connectionState };
    }

    this.checkInProgress = true;
    this.lastConnectionCheck = now;

    try {
      console.log('🔍 Checking MFS100 device connection...');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // Reduced timeout

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
        
        this.lastSuccessfulConnection = Date.now();
        console.log('✅ MFS100 device connected and ready');
        
      } else {
        throw new Error(data.ErrorDescription || 'Device not ready');
      }

    } catch (error) {
      // Only increment failures if we haven't had a recent successful connection
      if ((now - this.lastSuccessfulConnection) > 60000) { // 1 minute
        this.connectionState.consecutiveFailures++;
      }
      
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

      // Only mark as disconnected if we haven't had recent success
      if ((now - this.lastSuccessfulConnection) > 60000) {
        this.connectionState.isConnected = false;
        this.connectionState.error = errorMessage;
      }
      
      this.connectionState.lastCheckTime = new Date();

      console.warn(`⚠️ MFS100 connection check failed (${this.connectionState.consecutiveFailures}):`, errorMessage);
      
      // Only trigger auto-recovery for genuine failures
      if (this.connectionState.consecutiveFailures >= 5) {
        setTimeout(() => {
          this.triggerAutoRecovery();
        }, 2000);
      }
      
    } finally {
      this.checkInProgress = false;
      this.notifySubscribers();
    }

    return { ...this.connectionState };
  }

  // Optimized fingerprint capture with reduced timeouts and better error handling
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

    // Smaller delay between captures
    const timeSinceLastCapture = Date.now() - this.lastSuccessfulConnection;
    if (timeSinceLastCapture < this.captureDelayBetweenOperations) {
      const waitTime = this.captureDelayBetweenOperations - timeSinceLastCapture;
      console.log(`⏱️ Brief delay ${waitTime}ms to prevent service conflicts...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Quick connection check only if we haven't had recent success
    const timeSinceLastSuccess = Date.now() - this.lastSuccessfulConnection;
    if (timeSinceLastSuccess > 30000) { // Only check if more than 30 seconds
      console.log('🔄 Quick connection verification...');
      await this.checkConnection(true);
    }

    this.captureInProgress = true;
    this.captureController = new AbortController();

    try {
      console.log('🔵 Starting fingerprint capture...');

      // Shorter timeout for capture
      const requestTimeout = setTimeout(() => {
        if (this.captureController) {
          this.captureController.abort();
        }
      }, (timeout * 1000) + 3000); // Only 3 extra seconds

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
        
        // Mark as successful - device is working fine
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
      let shouldTriggerRecovery = false;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          message = 'Capture was cancelled or timed out';
        } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
          message = 'Lost connection to device';
          shouldTriggerRecovery = true;
          // Only mark as disconnected on genuine connection errors
          this.connectionState.isConnected = false;
          this.connectionState.error = message;
          this.connectionState.consecutiveFailures++;
        } else {
          message = error.message;
          // Don't increment failures for user-initiated cancellations
          if (!error.message.includes('cancelled')) {
            this.connectionState.consecutiveFailures++;
          }
        }
      }

      console.error('❌ Fingerprint capture failed:', message);
      
      // Only trigger recovery for real connection issues
      if (shouldTriggerRecovery && this.connectionState.consecutiveFailures >= 3) {
        setTimeout(() => {
          this.triggerAutoRecovery();
        }, 3000);
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

  // Manual recovery trigger
  async triggerRecovery(): Promise<{ success: boolean; message: string }> {
    if (!mfs100ServiceRecovery.canAttemptRecovery()) {
      return {
        success: false,
        message: 'Recovery is not available right now'
      };
    }

    this.connectionState.isRecovering = true;
    this.connectionState.recoveryMessage = 'Manual recovery initiated...';
    this.notifySubscribers();

    try {
      const result = await mfs100ServiceRecovery.attemptRecovery((message) => {
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
        
        setTimeout(() => {
          this.checkConnection(true);
        }, 1000);
      }

      return result;

    } finally {
      setTimeout(() => {
        this.connectionState.isRecovering = false;
        this.connectionState.recoveryMessage = null;
        this.notifySubscribers();
      }, 2000);
    }
  }

  // Get current state
  getState(): MFS100ConnectionState {
    return { ...this.connectionState };
  }

  // Check if device is probably available based on recent success
  isProbablyAvailable(): boolean {
    const timeSinceSuccess = Date.now() - this.lastSuccessfulConnection;
    return this.connectionState.isConnected && 
           this.connectionState.consecutiveFailures <= 2 && 
           timeSinceSuccess < 60000; // 60 seconds
  }

  // Reset connection state
  reset(): void {
    console.log('🔄 Resetting MFS100 connection state...');
    
    // Cancel any ongoing operations
    this.cancelCapture();
    
    this.connectionState = {
      isConnected: false,
      lastCheckTime: null,
      deviceInfo: null,
      error: null,
      consecutiveFailures: 0,
      isRecovering: false,
      recoveryMessage: null
    };
    this.lastSuccessfulConnection = 0;
    this.checkInProgress = false;
    this.captureInProgress = false;
    this.lastConnectionCheck = 0;
    
    this.notifySubscribers();
    
    // Start connection check after reset
    setTimeout(() => {
      this.checkConnection(true);
    }, 1000);
  }

  // Enable/disable auto-recovery
  setAutoRecovery(enabled: boolean): void {
    this.autoRecoveryEnabled = enabled;
    console.log(`🔧 Auto-recovery ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Set delay between capture operations
  setCaptureDelay(delayMs: number): void {
    this.captureDelayBetweenOperations = Math.max(500, delayMs); // Minimum 0.5 seconds
    console.log(`⏱️ Capture delay set to ${this.captureDelayBetweenOperations}ms`);
  }

  // Set connection check cooldown
  setConnectionCheckCooldown(cooldownMs: number): void {
    this.connectionCheckCooldown = Math.max(2000, cooldownMs); // Minimum 2 seconds
    console.log(`🕐 Connection check cooldown set to ${this.connectionCheckCooldown}ms`);
  }
}

// Export singleton instance
export const unifiedMFS100Manager = UnifiedMFS100Manager.getInstance();
