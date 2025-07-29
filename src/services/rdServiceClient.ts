/**
 * RD Service Client for Fingerprint Authentication
 * Optimized for better error handling and reduced connection attempts
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
  private fallbackUrl = 'http://127.0.0.1:11100/rd';
  private deviceInfo: DeviceInfo | null = null;
  private lastAvailabilityCheck = 0;
  private availabilityCache: { result: boolean; timestamp: number; service?: string } | null = null;
  private readonly CACHE_DURATION = 30000; // Increased to 30 seconds to reduce frequent checks
  private activeServiceUrl = '';
  private consecutiveFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 5;
  private backoffDelay = 1000; // Start with 1 second backoff

  constructor() {
    console.log('RDServiceClient initialized. Services will be checked on demand.');
  }

  /**
   * Check if MFS100 service or RD Service is available with exponential backoff
   */
  async isServiceAvailable(): Promise<boolean> {
    const now = Date.now();
    
    // Return cached result if still valid
    if (this.availabilityCache && (now - this.availabilityCache.timestamp < this.CACHE_DURATION)) {
      this.activeServiceUrl = this.availabilityCache.service || '';
      return this.availabilityCache.result;
    }

    // If we've had too many consecutive failures, increase backoff
    if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      this.backoffDelay = Math.min(this.backoffDelay * 2, 60000); // Max 1 minute backoff
      console.log(`⏳ Service check backoff: ${this.backoffDelay}ms after ${this.consecutiveFailures} failures`);
      
      // Check if enough time has passed since last check
      if (now - this.lastAvailabilityCheck < this.backoffDelay) {
        return false;
      }
    }

    this.lastAvailabilityCheck = now;

    try {
      // Try MFS100 service first
      const mfs100Available = await this.checkMFS100Service();
      if (mfs100Available) {
        this.activeServiceUrl = this.baseUrl;
        this.availabilityCache = {
          result: true,
          timestamp: now,
          service: this.baseUrl
        };
        this.consecutiveFailures = 0;
        this.backoffDelay = 1000; // Reset backoff
        console.log('✅ MFS100 service is available');
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
        this.consecutiveFailures = 0;
        this.backoffDelay = 1000; // Reset backoff
        console.log('✅ RD Service is available');
        return true;
      }

      // Both services failed
      this.consecutiveFailures++;
      this.availabilityCache = {
        result: false,
        timestamp: now
      };
      
      // Only log detailed error message occasionally to reduce console noise
      if (this.consecutiveFailures <= 3 || this.consecutiveFailures % 10 === 0) {
        console.warn('❌ No fingerprint service available. Please ensure one of the following is running:');
        console.warn('   1. MFS100 service at https://localhost:8003');
        console.warn('   2. Standard RD Service at http://127.0.0.1:11100');
      }
      
      return false;

    } catch (error) {
      this.consecutiveFailures++;
      this.availabilityCache = {
        result: false,
        timestamp: now
      };
      
      if (this.consecutiveFailures <= 3) {
        console.error('Service availability check failed:', error);
      }
      
      return false;
    }
  }

  private async checkMFS100Service(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000); // Reduced timeout

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
      // Reduce console noise - only log first few failures
      if (this.consecutiveFailures <= 2) {
        console.debug('MFS100 service check failed:', error instanceof Error ? error.message : 'Unknown error');
      }
      return false;
    }
  }

  private async checkRDService(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000); // Reduced timeout

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
      // Reduce console noise - only log first few failures
      if (this.consecutiveFailures <= 2) {
        console.debug('RD Service check failed:', error instanceof Error ? error.message : 'Unknown error');
      }
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
   * Clear availability cache and reset failure tracking
   */
  clearCache(): void {
    this.availabilityCache = null;
    this.activeServiceUrl = '';
    this.consecutiveFailures = 0;
    this.backoffDelay = 1000;
    console.log('Service cache cleared and failure tracking reset');
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
    
    let message: string;
    if (available) {
      message = `Connected to ${this.activeServiceUrl.includes('8003') ? 'MFS100' : 'RD Service'}`;
    } else if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      message = `Service unavailable (${this.consecutiveFailures} failures). Next check in ${Math.round(this.backoffDelay / 1000)}s`;
    } else {
      message = 'No fingerprint service found. Please start MFS100 service or RD Service';
    }
    
    return {
      available,
      service: this.activeServiceUrl,
      message
    };
  }
}

// Export singleton instance
export const rdServiceClient = new RDServiceClient();
