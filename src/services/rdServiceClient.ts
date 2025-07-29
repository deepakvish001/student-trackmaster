
/**
 * RD Service Client for Fingerprint Authentication
 * Updated to use MFS100 service on https://localhost:8003
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
  private baseUrl = 'https://localhost:8003/mfs100'; // Updated to use MFS100 service
  private deviceInfo: DeviceInfo | null = null;
  private lastAvailabilityCheck = 0;
  private availabilityCache: { result: boolean; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 5000; // 5 seconds cache

  constructor() {
    // Initialize device info on construction
    this.initializeDeviceInfo();
  }

  private async initializeDeviceInfo() {
    try {
      this.deviceInfo = await this.getDeviceInfo();
    } catch (error) {
      console.warn('Failed to initialize MFS100 device info:', error);
    }
  }

  /**
   * Check if MFS100 service is available
   */
  async isServiceAvailable(): Promise<boolean> {
    const now = Date.now();
    
    // Return cached result if still valid
    if (this.availabilityCache && (now - this.availabilityCache.timestamp < this.CACHE_DURATION)) {
      return this.availabilityCache.result;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch(`${this.baseUrl}/info`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const isAvailable = data.ErrorCode === "0";
      
      // Cache the result
      this.availabilityCache = {
        result: isAvailable,
        timestamp: now
      };
      
      console.log('MFS100 service availability:', isAvailable);
      return isAvailable;
    } catch (error) {
      console.warn('MFS100 service check failed:', error);
      
      // Cache the failed result
      this.availabilityCache = {
        result: false,
        timestamp: now
      };
      
      return false;
    }
  }

  /**
   * Get device information from MFS100
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    if (!await this.isServiceAvailable()) {
      throw new Error('MFS100 service is not available');
    }

    try {
      const response = await fetch(`${this.baseUrl}/info`, {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.ErrorCode !== "0") {
        throw new Error(data.ErrorDescription || 'Failed to get device info');
      }

      // Map MFS100 response to RD Service format
      const deviceInfo: DeviceInfo = {
        dpId: data.DeviceInfo?.SerialNo || '',
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
      throw new Error('Failed to get device information');
    }
  }

  /**
   * Capture fingerprint using MFS100
   */
  async captureFingerprint(timeout: number = 10000): Promise<RDServiceResponse> {
    if (!await this.isServiceAvailable()) {
      throw new Error('MFS100 service is not available');
    }

    const requestBody = {
      Quality: 60,
      TimeOut: Math.round(timeout / 1000) // Convert to seconds
    };

    try {
      const controller = new AbortController();
      const requestTimeout = setTimeout(() => controller.abort(), timeout + 2000);

      const response = await fetch(`${this.baseUrl}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

      // Map MFS100 response to RD Service format
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

      // Check if capture was successful
      if (result.errCode !== "0") {
        throw new Error(result.errInfo);
      }

      console.log('MFS100 capture successful:', {
        quality: result.quality,
        hasImage: !!result.imageData,
        hasTemplate: !!result.pidData
      });

      return result;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Fingerprint capture timed out');
        }
        throw error;
      }
      throw new Error('Failed to capture fingerprint');
    }
  }

  /**
   * Get cached device info
   */
  getCachedDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo;
  }

  /**
   * Clear availability cache
   */
  clearCache(): void {
    this.availabilityCache = null;
  }
}

// Export singleton instance
export const rdServiceClient = new RDServiceClient();
