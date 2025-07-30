
/**
 * RD Service Client for Fingerprint Authentication
 * Optimized for MFS100 devices with session management to prevent restart requirements
 */

import { isMFS100Available } from '@/utils/mfs100Native';

export interface RDServiceResponse {
  errCode: string;
  errInfo: string;
  fCount: string;
  fType: string;
  nmPoints: string;
  qScore: string;
  pidData: string;
  imageData?: string;
  ci?: string;
  sessionKey?: string;
  hmac?: string;
  quality?: number;
}

export interface DeviceInfo {
  dpId: string;
  rdsId: string;
  rdsVer: string;
  dc: string;
  mi: string;
  mc: string;
}

export class RDServiceClient {
  private baseUrl = 'https://localhost:8003/mfs100';
  private deviceInfo: DeviceInfo | null = null;
  private lastAvailabilityCheck = 0;
  private availabilityCache: { result: boolean; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 10000; // 10 seconds cache
  private consecutiveFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private sessionActive = false;
  private lastCaptureTime = 0;
  private readonly SESSION_TIMEOUT = 30000; // 30 seconds session timeout

  constructor() {
    console.log('RDServiceClient initialized for MFS100 device at https://localhost:8003');
  }

  /**
   * Check if MFS100 service is available with optimized session management
   */
  async isServiceAvailable(): Promise<boolean> {
    const now = Date.now();
    
    // Return cached result if still valid and no session issues
    if (this.availabilityCache && (now - this.availabilityCache.timestamp < this.CACHE_DURATION)) {
      return this.availabilityCache.result;
    }

    this.lastAvailabilityCheck = now;

    try {
      // Check MFS100 service with session awareness
      const mfs100Available = await this.checkMFS100Service();
      
      if (mfs100Available) {
        this.availabilityCache = {
          result: true,
          timestamp: now
        };
        this.consecutiveFailures = 0;
        
        // Reset session after timeout to prevent device lock
        if (this.sessionActive && (now - this.lastCaptureTime > this.SESSION_TIMEOUT)) {
          await this.resetDeviceSession();
        }
        
        return true;
      } else {
        this.consecutiveFailures++;
        this.availabilityCache = {
          result: false,
          timestamp: now
        };
        
        // Only log errors for first few failures to reduce console noise
        if (this.consecutiveFailures <= 3) {
          console.warn(`❌ MFS100 service not available (attempt ${this.consecutiveFailures})`);
          console.warn('   Please ensure MFS100 service is running at https://localhost:8003');
        }
        
        return false;
      }

    } catch (error) {
      this.consecutiveFailures++;
      this.availabilityCache = {
        result: false,
        timestamp: now
      };
      
      if (this.consecutiveFailures <= 3) {
        console.error('MFS100 service check failed:', error);
      }
      
      return false;
    }
  }

  /**
   * Check MFS100 service with enhanced session handling
   */
  private async checkMFS100Service(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.baseUrl}/info`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Connection': 'close' // Prevent connection reuse that can cause session issues
        }
      });

      clearTimeout(timeout);
      
      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      const isAvailable = data.ErrorCode === "0";
      
      if (isAvailable) {
        console.log('✅ MFS100 service is available and ready');
        
        // Store device info if available
        if (data.DeviceInfo) {
          this.deviceInfo = {
            dpId: data.DeviceInfo.SerialNo || 'MFS100',
            rdsId: data.DeviceInfo.Make || 'MANTRA',
            rdsVer: data.DeviceInfo.Model || 'MFS100',
            dc: data.DeviceInfo.Certificate || '',
            mi: data.DeviceInfo.Make || 'MANTRA',
            mc: data.DeviceInfo.Model || 'MFS100'
          };
        }
      }
      
      return isAvailable;
    } catch (error) {
      if (this.consecutiveFailures <= 2) {
        console.debug('MFS100 service check failed:', error instanceof Error ? error.message : 'Unknown error');
      }
      return false;
    }
  }

  /**
   * Reset device session to prevent lock-up between captures
   */
  private async resetDeviceSession(): Promise<void> {
    try {
      console.log('🔄 Resetting MFS100 device session...');
      
      // Clear any existing session
      this.sessionActive = false;
      this.lastCaptureTime = 0;
      
      // Force a fresh info check to reset device state
      await fetch(`${this.baseUrl}/info`, {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Connection': 'close'
        }
      });
      
      // Small delay to let device reset
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('✅ Device session reset completed');
      
    } catch (error) {
      console.warn('Device session reset failed:', error);
    }
  }

  /**
   * Get device information from MFS100 service
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    if (!await this.isServiceAvailable()) {
      throw new Error('MFS100 service is not available. Please ensure the service is running at https://localhost:8003');
    }

    if (this.deviceInfo) {
      return this.deviceInfo;
    }

    try {
      const response = await fetch(`${this.baseUrl}/info`, {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Connection': 'close'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.ErrorCode !== "0") {
        throw new Error(data.ErrorDescription || 'Failed to get device info');
      }

      const deviceInfo: DeviceInfo = {
        dpId: data.DeviceInfo?.SerialNo || 'MFS100',
        rdsId: data.DeviceInfo?.Make || 'MANTRA',
        rdsVer: data.DeviceInfo?.Model || 'MFS100',
        dc: data.DeviceInfo?.Certificate || '',
        mi: data.DeviceInfo?.Make || 'MANTRA',
        mc: data.DeviceInfo?.Model || 'MFS100'
      };

      this.deviceInfo = deviceInfo;
      return deviceInfo;
    } catch (error) {
      console.error('Failed to get MFS100 device info:', error);
      throw new Error('Failed to get device information from MFS100');
    }
  }

  /**
   * Capture fingerprint with session management to prevent restart requirement
   */
  async captureFingerprint(timeout: number = 15000): Promise<RDServiceResponse> {
    if (!await this.isServiceAvailable()) {
      throw new Error('MFS100 service is not available');
    }

    // Reset session before capture if needed
    const now = Date.now();
    if (this.sessionActive && (now - this.lastCaptureTime > this.SESSION_TIMEOUT)) {
      await this.resetDeviceSession();
    }

    const requestBody = {
      Quality: 60,
      TimeOut: Math.round(timeout / 1000)
    };

    try {
      console.log('🔵 Starting fingerprint capture with session management...');
      
      // Mark session as active
      this.sessionActive = true;
      
      const controller = new AbortController();
      const requestTimeout = setTimeout(() => controller.abort(), timeout + 2000);

      const response = await fetch(`${this.baseUrl}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Connection': 'close' // Important: Close connection after capture
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

      const result: RDServiceResponse = {
        errCode: data.ErrorCode || "1",
        errInfo: data.ErrorDescription || "Capture failed",
        fCount: "1",
        fType: "0",
        nmPoints: "0",
        qScore: data.Quality?.toString() || "0",
        pidData: data.IsoTemplate || "",
        imageData: data.BitmapData || "",
        quality: data.Quality || 0
      };

      if (result.errCode !== "0") {
        throw new Error(result.errInfo);
      }

      // Update capture time and prepare for next capture
      this.lastCaptureTime = now;
      
      console.log('✅ Fingerprint captured successfully with quality:', result.quality);
      
      // Schedule session cleanup for next capture
      setTimeout(() => {
        if (Date.now() - this.lastCaptureTime > 5000) { // 5 seconds after capture
          this.resetDeviceSession();
        }
      }, 5000);

      return result;
    } catch (error) {
      // Reset session on error to prevent device lock
      this.sessionActive = false;
      await this.resetDeviceSession();
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Fingerprint capture timed out - device may need restart');
      }
      throw error;
    }
  }

  /**
   * Get cached device info
   */
  getCachedDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo;
  }

  /**
   * Get the active service URL
   */
  getActiveService(): string {
    return this.baseUrl;
  }

  /**
   * Clear cache and reset session to prevent restart requirement
   */
  clearCache(): void {
    this.availabilityCache = null;
    this.consecutiveFailures = 0;
    this.sessionActive = false;
    this.lastCaptureTime = 0;
    console.log('✅ Service cache and session cleared - ready for fresh captures');
  }

  /**
   * Force session reset - call this if device seems locked
   */
  async forceSessionReset(): Promise<void> {
    console.log('🔄 Force resetting MFS100 session...');
    this.clearCache();
    await this.resetDeviceSession();
    
    // Wait and check if device is responsive
    await new Promise(resolve => setTimeout(resolve, 1000));
    const available = await this.isServiceAvailable();
    
    if (available) {
      console.log('✅ Device session reset successful');
    } else {
      console.warn('⚠️ Device may still need manual restart');
    }
  }

  /**
   * Get service status with session information
   */
  async getServiceStatus(): Promise<{
    available: boolean;
    service: string;
    message: string;
    sessionActive: boolean;
  }> {
    const available = await this.isServiceAvailable();
    
    let message: string;
    if (available) {
      message = `Connected to MFS100 service${this.sessionActive ? ' (session active)' : ''}`;
    } else if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      message = `MFS100 service unavailable (${this.consecutiveFailures} failures)`;
    } else {
      message = 'MFS100 service not found. Please ensure it\'s running at https://localhost:8003';
    }
    
    return {
      available,
      service: this.baseUrl,
      message,
      sessionActive: this.sessionActive
    };
  }
}

// Export singleton instance
export const rdServiceClient = new RDServiceClient();
