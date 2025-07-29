
/**
 * RD Service Client for Fingerprint Authentication
 * Updated to handle MFS100 service connectivity issues
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
  private fallbackUrl = 'http://127.0.0.1:11100/rd'; // Standard RD Service port
  private deviceInfo: DeviceInfo | null = null;
  private lastAvailabilityCheck = 0;
  private availabilityCache: { result: boolean; timestamp: number; service?: string } | null = null;
  private readonly CACHE_DURATION = 5000; // 5 seconds cache
  private activeServiceUrl = '';

  constructor() {
    // Don't initialize automatically to avoid startup errors
    console.log('RDServiceClient initialized. Call checkServiceAvailability() to detect services.');
  }

  /**
   * Check if MFS100 service or RD Service is available
   */
  async isServiceAvailable(): Promise<boolean> {
    const now = Date.now();
    
    // Return cached result if still valid
    if (this.availabilityCache && (now - this.availabilityCache.timestamp < this.CACHE_DURATION)) {
      this.activeServiceUrl = this.availabilityCache.service || '';
      return this.availabilityCache.result;
    }

    // Try MFS100 service first
    const mfs100Available = await this.checkMFS100Service();
    if (mfs100Available) {
      this.activeServiceUrl = this.baseUrl;
      this.availabilityCache = {
        result: true,
        timestamp: now,
        service: this.baseUrl
      };
      console.log('✅ MFS100 service is available at:', this.baseUrl);
      return true;
    }

    // Try standard RD Service as fallback
    const rdServiceAvailable = await this.checkRDService();
    if (rdServiceAvailable) {
      this.activeServiceUrl = this.fallbackUrl;
      this.availabilityCache = {
        result: true,
        timestamp: now,
        service: this.fallbackUrl
      };
      console.log('✅ RD Service is available at:', this.fallbackUrl);
      return true;
    }

    // No service available
    this.availabilityCache = {
      result: false,
      timestamp: now
    };
    
    console.warn('❌ No fingerprint service available. Please ensure one of the following is running:');
    console.warn('   1. MFS100 service at https://localhost:8003');
    console.warn('   2. Standard RD Service at http://127.0.0.1:11100');
    
    return false;
  }

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
      console.debug('MFS100 service not available:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  private async checkRDService(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.fallbackUrl}/info`, {
        method: 'RDSERVICE',
        signal: controller.signal,
        cache: 'no-cache',
        headers: {
          'Content-Type': 'text/xml',
          'Accept': 'text/xml'
        }
      });

      clearTimeout(timeout);
      return response.ok;
    } catch (error) {
      console.debug('RD Service not available:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Get device information from the active service
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    if (!await this.isServiceAvailable()) {
      throw new Error('No fingerprint service is available. Please start MFS100 service or RD Service.');
    }

    if (this.activeServiceUrl === this.baseUrl) {
      return this.getMFS100DeviceInfo();
    } else {
      return this.getRDServiceDeviceInfo();
    }
  }

  private async getMFS100DeviceInfo(): Promise<DeviceInfo> {
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
      throw new Error('Failed to get device information from MFS100');
    }
  }

  private async getRDServiceDeviceInfo(): Promise<DeviceInfo> {
    try {
      const response = await fetch(`${this.fallbackUrl}/info`, {
        method: 'RDSERVICE',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'text/xml',
          'Accept': 'text/xml'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlText = await response.text();
      // Parse XML response for RD Service (simplified)
      const deviceInfo: DeviceInfo = {
        dpId: 'RD_DEVICE',
        rdsId: 'RD_SERVICE',
        rdsVer: '1.0.0',
        dc: '',
        mi: 'Generic',
        mc: 'RD_Device'
      };

      this.deviceInfo = deviceInfo;
      return deviceInfo;
    } catch (error) {
      console.error('Failed to get RD Service device info:', error);
      throw new Error('Failed to get device information from RD Service');
    }
  }

  /**
   * Capture fingerprint using the available service
   */
  async captureFingerprint(timeout: number = 10000): Promise<RDServiceResponse> {
    if (!await this.isServiceAvailable()) {
      throw new Error('No fingerprint service is available');
    }

    if (this.activeServiceUrl === this.baseUrl) {
      return this.captureMFS100Fingerprint(timeout);
    } else {
      return this.captureRDServiceFingerprint(timeout);
    }
  }

  private async captureMFS100Fingerprint(timeout: number): Promise<RDServiceResponse> {
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

  private async captureRDServiceFingerprint(timeout: number): Promise<RDServiceResponse> {
    // Implementation for standard RD Service capture
    // This would use XML format instead of JSON
    throw new Error('RD Service capture not yet implemented');
  }

  /**
   * Get cached device info
   */
  getCachedDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo;
  }

  /**
   * Get the currently active service URL
   */
  getActiveService(): string {
    return this.activeServiceUrl;
  }

  /**
   * Clear availability cache and reset
   */
  clearCache(): void {
    this.availabilityCache = null;
    this.activeServiceUrl = '';
    console.log('Service cache cleared');
  }

  /**
   * Check service availability and return status info
   */
  async getServiceStatus(): Promise<{
    available: boolean;
    service: string;
    message: string;
  }> {
    const available = await this.isServiceAvailable();
    
    return {
      available,
      service: this.activeServiceUrl,
      message: available 
        ? `Connected to ${this.activeServiceUrl.includes('8003') ? 'MFS100' : 'RD Service'}`
        : 'No fingerprint service found. Please start MFS100 service at https://localhost:8003 or RD Service at http://127.0.0.1:11100'
    };
  }
}

// Export singleton instance
export const rdServiceClient = new RDServiceClient();
