
/**
 * Stable MFS100 Client - Optimized for reliability and minimal interference
 */

export interface MFS100Response {
  ErrorCode: string;
  ErrorDescription: string;
  Quality?: number;
  IsoTemplate?: string;
  BitmapData?: string;
  DeviceInfo?: {
    SerialNo: string;
    Make: string;
    Model: string;
    Certificate: string;
  };
}

export interface DeviceInfo {
  dpId: string;
  rdsId: string;
  rdsVer: string;
  dc: string;
  mi: string;
  mc: string;
}

export class StableMFS100Client {
  private baseUrl = 'https://localhost:8003/mfs100';
  private isConnecting = false;
  private lastSuccessfulCheck = 0;
  private consecutiveFailures = 0;
  private maxConsecutiveFailures = 5;
  private connectionTimeout = 3000; // 3 seconds
  
  /**
   * Check if device is available with minimal interference
   */
  async checkDeviceAvailability(): Promise<{
    available: boolean;
    message: string;
    deviceInfo?: DeviceInfo;
  }> {
    // Prevent concurrent connection checks
    if (this.isConnecting) {
      return {
        available: false,
        message: 'Connection check already in progress...'
      };
    }

    this.isConnecting = true;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.connectionTimeout);

      console.log('🔍 Checking MFS100 device availability...');

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

      const data: MFS100Response = await response.json();
      
      if (data.ErrorCode === "0") {
        this.consecutiveFailures = 0;
        this.lastSuccessfulCheck = Date.now();
        
        const deviceInfo: DeviceInfo = {
          dpId: data.DeviceInfo?.SerialNo || 'MFS100',
          rdsId: data.DeviceInfo?.Make || 'MANTRA',
          rdsVer: data.DeviceInfo?.Model || 'MFS100',
          dc: data.DeviceInfo?.Certificate || '',
          mi: data.DeviceInfo?.Make || 'MANTRA',
          mc: data.DeviceInfo?.Model || 'MFS100'
        };

        console.log('✅ MFS100 device is connected and ready');
        
        return {
          available: true,
          message: 'Device connected and ready',
          deviceInfo
        };
      } else {
        throw new Error(data.ErrorDescription || 'Device not ready');
      }

    } catch (error) {
      this.consecutiveFailures++;
      
      let message = 'Device not available';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          message = 'Connection timeout - device may be busy';
        } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
          message = 'MFS100 service not running. Please start the service.';
        } else {
          message = error.message;
        }
      }

      // Only log first few failures to avoid spam
      if (this.consecutiveFailures <= 3) {
        console.warn(`⚠️ MFS100 device check failed (${this.consecutiveFailures}/${this.maxConsecutiveFailures}):`, message);
      }

      return {
        available: false,
        message
      };

    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Capture fingerprint with stable session handling
   */
  async captureFingerprint(quality: number = 60, timeout: number = 15): Promise<{
    success: boolean;
    message: string;
    data?: {
      template: string;
      imageData: string;
      quality: number;
    };
  }> {
    // First check if device is available
    const deviceCheck = await this.checkDeviceAvailability();
    if (!deviceCheck.available) {
      return {
        success: false,
        message: deviceCheck.message
      };
    }

    try {
      console.log('🔵 Starting fingerprint capture...');

      const controller = new AbortController();
      const requestTimeout = setTimeout(() => controller.abort(), (timeout * 1000) + 2000);

      const response = await fetch(`${this.baseUrl}/capture`, {
        method: 'POST',
        signal: controller.signal,
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

      const data: MFS100Response = await response.json();

      if (data.ErrorCode === "0") {
        console.log(`✅ Fingerprint captured successfully, Quality: ${data.Quality}`);
        
        return {
          success: true,
          message: `Fingerprint captured with quality ${data.Quality}%`,
          data: {
            template: data.IsoTemplate || '',
            imageData: data.BitmapData || '',
            quality: data.Quality || 0
          }
        };
      } else {
        throw new Error(data.ErrorDescription || 'Capture failed');
      }

    } catch (error) {
      let message = 'Capture failed';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          message = 'Capture timed out. Please try again.';
        } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
          message = 'Lost connection to device. Please check device connection.';
        } else {
          message = error.message;
        }
      }

      console.error('❌ Fingerprint capture failed:', message);
      
      return {
        success: false,
        message
      };
    }
  }

  /**
   * Get current connection status
   */
  isDeviceProbablyAvailable(): boolean {
    const timeSinceLastSuccess = Date.now() - this.lastSuccessfulCheck;
    return this.consecutiveFailures < this.maxConsecutiveFailures && 
           timeSinceLastSuccess < 60000; // Consider available if successful within last minute
  }

  /**
   * Reset connection state
   */
  resetConnectionState(): void {
    this.consecutiveFailures = 0;
    this.lastSuccessfulCheck = 0;
    this.isConnecting = false;
    console.log('🔄 MFS100 connection state reset');
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    consecutiveFailures: number;
    lastSuccessfulCheck: number;
    isConnecting: boolean;
  } {
    return {
      consecutiveFailures: this.consecutiveFailures,
      lastSuccessfulCheck: this.lastSuccessfulCheck,
      isConnecting: this.isConnecting
    };
  }
}

// Export singleton instance
export const stableMFS100Client = new StableMFS100Client();
