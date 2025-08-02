
/**
 * Clean MFS100 Service - Single Connection Architecture
 * No background monitoring, only on-demand operations
 */

export interface MFS100DeviceInfo {
  serialNo: string;
  make: string;
  model: string;
  isConnected: boolean;
}

export interface MFS100CaptureResult {
  success: boolean;
  template: string;
  imageData: string;
  quality: number;
  message: string;
}

export interface MFS100ServiceStatus {
  isConnected: boolean;
  deviceInfo: MFS100DeviceInfo | null;
  lastError: string | null;
  message: string;
}

class CleanMFS100Service {
  private baseUrl = 'https://localhost:8003/mfs100';
  private deviceInfo: MFS100DeviceInfo | null = null;
  private lastError: string | null = null;
  private sessionActive = false;

  constructor() {
    console.log('🔵 Clean MFS100 Service initialized - ON-DEMAND ONLY');
  }

  /**
   * Check device connection - only when explicitly called
   */
  async checkConnection(): Promise<MFS100ServiceStatus> {
    try {
      console.log('🔄 Checking MFS100 connection...');
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.baseUrl}/info`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.ErrorCode !== "0") {
        throw new Error(data.ErrorDescription || 'Device not available');
      }

      // Update device info
      this.deviceInfo = {
        serialNo: data.DeviceInfo?.SerialNo || 'MFS100',
        make: data.DeviceInfo?.Make || 'MANTRA',
        model: data.DeviceInfo?.Model || 'MFS100',
        isConnected: true
      };

      this.lastError = null;
      this.sessionActive = true;

      console.log('✅ MFS100 device connected:', this.deviceInfo);

      return {
        isConnected: true,
        deviceInfo: this.deviceInfo,
        lastError: null,
        message: 'Device ready for capture'
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      console.error('❌ MFS100 connection failed:', errorMessage);
      
      this.deviceInfo = null;
      this.lastError = errorMessage;
      this.sessionActive = false;

      return {
        isConnected: false,
        deviceInfo: null,
        lastError: errorMessage,
        message: 'Device not available - ensure MFS100 service is running'
      };
    }
  }

  /**
   * Capture fingerprint with automatic session management
   */
  async captureFingerprint(quality: number = 60, timeout: number = 15): Promise<MFS100CaptureResult> {
    console.log(`🔄 Starting fingerprint capture (Quality: ${quality}, Timeout: ${timeout}s)`);

    try {
      // Ensure device is connected
      if (!this.sessionActive) {
        const status = await this.checkConnection();
        if (!status.isConnected) {
          throw new Error(status.message);
        }
      }

      const requestBody = {
        Quality: quality,
        TimeOut: timeout
      };

      const controller = new AbortController();
      const requestTimeout = setTimeout(() => controller.abort(), (timeout + 3) * 1000);

      const response = await fetch(`${this.baseUrl}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
        cache: 'no-cache'
      });

      clearTimeout(requestTimeout);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.ErrorCode !== "0") {
        // If capture failed due to device error, mark session as inactive
        if (data.ErrorCode === "1" || data.ErrorDescription?.includes('device')) {
          this.sessionActive = false;
        }
        throw new Error(data.ErrorDescription || 'Capture failed');
      }

      const result: MFS100CaptureResult = {
        success: true,
        template: data.IsoTemplate || '',
        imageData: data.BitmapData || '',
        quality: data.Quality || 0,
        message: `Fingerprint captured successfully (Quality: ${data.Quality}%)`
      };

      console.log('✅ Fingerprint captured successfully:', {
        quality: result.quality,
        hasTemplate: !!result.template,
        hasImage: !!result.imageData
      });

      // Reset session after successful capture to prevent corruption
      await this.resetSession();

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      console.error('❌ Fingerprint capture failed:', errorMessage);

      // Mark session as inactive on error
      this.sessionActive = false;
      this.lastError = errorMessage;

      return {
        success: false,
        template: '',
        imageData: '',
        quality: 0,
        message: errorMessage
      };
    }
  }

  /**
   * Reset session after each capture to prevent corruption
   */
  private async resetSession(): Promise<void> {
    try {
      console.log('🔄 Resetting MFS100 session...');
      
      // Small delay to let device settle
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Session is ready for next capture
      this.sessionActive = true;
      
      console.log('✅ Session reset complete');
    } catch (error) {
      console.warn('⚠️ Session reset failed:', error);
      this.sessionActive = false;
    }
  }

  /**
   * Manual reconnect when device is disconnected
   */
  async reconnectDevice(): Promise<MFS100ServiceStatus> {
    console.log('🔄 Manual device reconnection...');
    
    // Reset everything
    this.deviceInfo = null;
    this.lastError = null;
    this.sessionActive = false;
    
    // Wait a moment for device to settle
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to reconnect
    return await this.checkConnection();
  }

  /**
   * Get current service status
   */
  getStatus(): MFS100ServiceStatus {
    return {
      isConnected: this.sessionActive && !!this.deviceInfo,
      deviceInfo: this.deviceInfo,
      lastError: this.lastError,
      message: this.sessionActive ? 'Device ready for capture' : 'Device not connected'
    };
  }

  /**
   * Force disconnect (for cleanup)
   */
  disconnect(): void {
    console.log('🔵 Disconnecting MFS100 service');
    this.deviceInfo = null;
    this.lastError = null;
    this.sessionActive = false;
  }
}

// Export singleton instance
export const cleanMFS100Service = new CleanMFS100Service();
