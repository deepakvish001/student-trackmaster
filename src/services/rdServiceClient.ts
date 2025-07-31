/**
 * RD Service Client for Fingerprint Authentication
 * Optimized for MFS100 devices with improved session management
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
  private readonly CACHE_DURATION = 5000; // Reduced cache duration to 5 seconds
  private consecutiveFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private sessionActive = false;
  private lastCaptureTime = 0;
  private readonly SESSION_TIMEOUT = 60000; // Increased session timeout to 60 seconds
  private isResetting = false; // Prevent concurrent resets

  constructor() {
    console.log('RDServiceClient initialized for MFS100 device at https://localhost:8003');
  }

  /**
   * Check if MFS100 service is available with simplified session management
   */
  async isServiceAvailable(): Promise<boolean> {
    const now = Date.now();
    
    // Return cached result if still valid
    if (this.availabilityCache && (now - this.availabilityCache.timestamp < this.CACHE_DURATION)) {
      return this.availabilityCache.result;
    }

    this.lastAvailabilityCheck = now;

    try {
      // Simple service check without aggressive session management
      const mfs100Available = await this.checkMFS100Service();
      
      if (mfs100Available) {
        this.availabilityCache = {
          result: true,
          timestamp: now
        };
        this.consecutiveFailures = 0;
        return true;
      } else {
        this.consecutiveFailures++;
        this.availabilityCache = {
          result: false,
          timestamp: now
        };
        
        // Only log errors for first few failures
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
   * Simple MFS100 service check
   */
  private async checkMFS100Service(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

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
   * Gentle device preparation - only when absolutely necessary
   */
  private async prepareDeviceIfNeeded(): Promise<void> {
    const now = Date.now();
    
    // Only prepare device if session has been inactive for a long time
    if (this.sessionActive && (now - this.lastCaptureTime > this.SESSION_TIMEOUT)) {
      try {
        console.log('🔄 Preparing device for new session...');
        this.sessionActive = false;
        this.lastCaptureTime = 0;
        
        // Just a simple info check to wake up the device
        await fetch(`${this.baseUrl}/info`, {
          method: 'GET',
          cache: 'no-cache',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        console.log('✅ Device prepared for new session');
        
      } catch (error) {
        console.warn('Device preparation failed:', error);
      }
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
          'Accept': 'application/json'
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
   * Capture fingerprint with minimal session interference
   */
  async captureFingerprint(timeout: number = 15000): Promise<RDServiceResponse> {
    if (!await this.isServiceAvailable()) {
      throw new Error('MFS100 service is not available');
    }

    // Gentle device preparation if needed
    await this.prepareDeviceIfNeeded();

    const requestBody = {
      Quality: 60,
      TimeOut: Math.round(timeout / 1000)
    };

    try {
      console.log('🔵 Starting fingerprint capture...');
      
      // Mark session as active
      this.sessionActive = true;
      const now = Date.now();
      
      const controller = new AbortController();
      const requestTimeout = setTimeout(() => controller.abort(), timeout + 2000);

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

      // Update capture time but don't reset session immediately
      this.lastCaptureTime = now;
      
      console.log('✅ Fingerprint captured successfully with quality:', result.quality);

      return result;
    } catch (error) {
      // Only reset session on critical errors
      if (error instanceof Error && error.name === 'AbortError') {
        this.sessionActive = false;
        throw new Error('Fingerprint capture timed out');
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
   * Clear cache with minimal session disruption
   */
  clearCache(): void {
    this.availabilityCache = null;
    this.consecutiveFailures = 0;
    console.log('✅ Service cache cleared');
  }

  /**
   * Gentle session reset - only when really needed
   */
  async forceSessionReset(): Promise<void> {
    if (this.isResetting) {
      console.log('⏳ Session reset already in progress...');
      return;
    }

    this.isResetting = true;
    
    try {
      console.log('🔄 Gently resetting MFS100 session...');
      this.clearCache();
      this.sessionActive = false;
      this.lastCaptureTime = 0;
      
      // Wait a moment for device to settle
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simple availability check to confirm device is responsive
      const available = await this.isServiceAvailable();
      
      if (available) {
        console.log('✅ Session reset successful');
      } else {
        console.warn('⚠️ Device may need manual restart');
      }
      
    } finally {
      this.isResetting = false;
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
      message = `MFS100 service unavailable after ${this.consecutiveFailures} attempts`;
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
