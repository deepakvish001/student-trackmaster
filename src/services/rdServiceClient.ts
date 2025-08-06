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

// Global flag to prevent repeated initialization logs
let clientInitialized = false;

export class RDServiceClient {
  private baseUrl = 'http://localhost:8003/mfs100';
  private deviceInfo: DeviceInfo | null = null;
  private isResetting = false;

  constructor() {
    if (!clientInitialized) {
      console.log('🔵 RDServiceClient initialized - COMPLETELY PASSIVE MODE');
      clientInitialized = true;
    }
  }

  /**
   * PASSIVE: Only check when explicitly requested - NO retries, NO caching
   */
  async isServiceAvailable(): Promise<boolean> {
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
      return data.ErrorCode === "0";
      
    } catch (error) {
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
   * PASSIVE capture - direct communication only when called
   */
  async captureFingerprint(timeout: number = 15000): Promise<RDServiceResponse> {
    const requestBody = {
      Quality: 60,
      TimeOut: Math.round(timeout / 1000)
    };

    try {
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

      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
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
   * PASSIVE session reset - only when explicitly requested
   */
  async forceSessionReset(): Promise<void> {
    if (this.isResetting) {
      return;
    }

    this.isResetting = true;
    
    try {
      this.deviceInfo = null;
      
      // Wait for device to settle
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } finally {
      this.isResetting = false;
    }
  }

  /**
   * Get service status - PASSIVE mode
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
      message = 'Passive mode: MFS100 service ready';
    } else {
      message = 'Passive mode: MFS100 service not available';
    }
    
    return {
      available,
      service: this.baseUrl,
      message,
      sessionActive: false
    };
  }
}

// Export singleton instance
export const rdServiceClient = new RDServiceClient();
