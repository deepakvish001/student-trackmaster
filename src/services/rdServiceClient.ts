
/**
 * RD Service Client for Fingerprint Authentication
 * Zero-polling mode - NO automatic background checks
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
  private readonly CACHE_DURATION = 30000; // Increased to 30 seconds
  private consecutiveFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 5; // Increased tolerance
  private sessionActive = false;
  private lastCaptureTime = 0;
  private readonly SESSION_TIMEOUT = 120000; // Increased to 2 minutes
  private isResetting = false;

  constructor() {
    console.log('🔵 RDServiceClient initialized in ZERO-POLLING mode - NO background checks');
  }

  /**
   * ZERO-POLLING: Only check when explicitly requested
   */
  async isServiceAvailable(): Promise<boolean> {
    // Skip frequent checks completely in zero-polling mode
    const now = Date.now();
    
    // Return cached result if very recent (within 30 seconds)
    if (this.availabilityCache && (now - this.availabilityCache.timestamp < this.CACHE_DURATION)) {
      return this.availabilityCache.result;
    }

    try {
      const mfs100Available = await this.checkMFS100ServiceOnce();
      
      this.availabilityCache = {
        result: mfs100Available,
        timestamp: now
      };

      if (mfs100Available) {
        this.consecutiveFailures = 0;
      } else {
        this.consecutiveFailures++;
      }

      return mfs100Available;

    } catch (error) {
      this.consecutiveFailures++;
      this.availabilityCache = {
        result: false,
        timestamp: now
      };
      
      return false;
    }
  }

  /**
   * Single service check - no retries, no logging unless explicitly requested
   */
  private async checkMFS100ServiceOnce(logErrors = false): Promise<boolean> {
    try {
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
        return false;
      }

      const data = await response.json();
      const isAvailable = data.ErrorCode === "0";
      
      if (isAvailable && data.DeviceInfo) {
        this.deviceInfo = {
          dpId: data.DeviceInfo.SerialNo || 'MFS100',
          rdsId: data.DeviceInfo.Make || 'MANTRA',
          rdsVer: data.DeviceInfo.Model || 'MFS100',
          dc: data.DeviceInfo.Certificate || '',
          mi: data.DeviceInfo.Make || 'MANTRA',
          mc: data.DeviceInfo.Model || 'MFS100'
        };
      }
      
      return isAvailable;
    } catch (error) {
      if (logErrors) {
        console.debug('MFS100 service check failed:', error instanceof Error ? error.message : 'Unknown error');
      }
      return false;
    }
  }

  /**
   * Get device information - only when explicitly requested
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
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
      throw new Error('Failed to get device information from MFS100');
    }
  }

  /**
   * ZERO-POLLING capture - direct communication only when called
   */
  async captureFingerprint(timeout: number = 15000): Promise<RDServiceResponse> {
    const requestBody = {
      Quality: 60,
      TimeOut: Math.round(timeout / 1000)
    };

    try {
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

      this.lastCaptureTime = now;
      
      // Update availability cache on successful capture
      this.availabilityCache = {
        result: true,
        timestamp: now
      };
      this.consecutiveFailures = 0;

      return result;
    } catch (error) {
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
   * Clear cache - minimal disruption
   */
  clearCache(): void {
    this.availabilityCache = null;
    this.consecutiveFailures = 0;
  }

  /**
   * ZERO-POLLING session reset - only when explicitly requested
   */
  async forceSessionReset(): Promise<void> {
    if (this.isResetting) {
      return;
    }

    this.isResetting = true;
    
    try {
      this.clearCache();
      this.sessionActive = false;
      this.lastCaptureTime = 0;
      
      // Wait for device to settle
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } finally {
      this.isResetting = false;
    }
  }

  /**
   * Get service status - ZERO-POLLING mode
   */
  async getServiceStatus(): Promise<{
    available: boolean;
    service: string;
    message: string;
    sessionActive: boolean;
  }> {
    // Only check if explicitly requested - no automatic polling
    const available = await this.isServiceAvailable();
    
    let message: string;
    if (available) {
      message = `Zero-polling mode: MFS100 service ready${this.sessionActive ? ' (session active)' : ''}`;
    } else {
      message = 'Zero-polling mode: MFS100 service not available';
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
