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
  private baseUrl = 'http://localhost:8003/mfs100';
  // RD fallback disabled per requirements to use only one service (MFS100 on port 8003)
  private fallbackUrl = '' as unknown as string;
  private deviceInfo: DeviceInfo | null = null;
  private lastAvailabilityCheck = 0;
  private availabilityCache: { result: boolean; timestamp: number; service?: string } | null = null;
  private readonly CACHE_DURATION = 60000; // Increased to 60 seconds to reduce frequent checks
  private activeServiceUrl = '';
  private consecutiveFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 3; // Reduced to fail faster
  private backoffDelay = 2000; // Start with 2 second backoff
  private isCheckingService = false; // Prevent concurrent checks

  constructor() {
    console.log('RDServiceClient initialized. Services will be checked on demand.');
  }

  /**
   * Check if MFS100 service is available with improved connection handling
   */
  async isServiceAvailable(): Promise<boolean> {
    const now = Date.now();
    
    // Prevent concurrent service checks
    if (this.isCheckingService) {
      return this.availabilityCache?.result || false;
    }
    
    // Return cached result if still valid
    if (this.availabilityCache && (now - this.availabilityCache.timestamp < this.CACHE_DURATION)) {
      this.activeServiceUrl = this.availabilityCache.service || '';
      return this.availabilityCache.result;
    }

    // If we've had too many consecutive failures, increase backoff
    if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      this.backoffDelay = Math.min(this.backoffDelay * 2, 30000); // Max 30 second backoff
      console.log(`⏳ Service check backoff: ${this.backoffDelay}ms after ${this.consecutiveFailures} failures`);
      
      // Check if enough time has passed since last check
      if (now - this.lastAvailabilityCheck < this.backoffDelay) {
        return false;
      }
    }

    this.isCheckingService = true;
    this.lastAvailabilityCheck = now;

    try {
      // Try MFS100 service
      const mfs100Available = await this.checkMFS100Service();
      if (mfs100Available) {
        this.activeServiceUrl = this.baseUrl;
        this.availabilityCache = {
          result: true,
          timestamp: now,
          service: this.baseUrl
        };
        this.consecutiveFailures = 0;
        this.backoffDelay = 2000; // Reset backoff
        console.log('✅ MFS100 service is available and stable');
        return true;
      }
      
      // Service not available
      this.consecutiveFailures++;
      this.availabilityCache = {
        result: false,
        timestamp: now
      };

      // Only log error message occasionally to reduce console spam
      if (this.consecutiveFailures <= 2 || this.consecutiveFailures % 5 === 0) {
        console.log('❌ MFS100 service not available at http://localhost:8003');
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
    } finally {
      this.isCheckingService = false;
    }
  }

  private async checkMFS100Service(): Promise<boolean> {
    try {
      console.log('🔍 Checking MFS100 service at:', this.baseUrl);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        console.log('⏰ MFS100 service check timeout after 5 seconds');
        controller.abort();
      }, 5000);

      const response = await fetch(`${this.baseUrl}/info`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeout);
      
      console.log('📡 MFS100 service response status:', response.status);
      
      if (!response.ok) {
        console.warn(`❌ MFS100 service responded with status: ${response.status}`);
        return false;
      }

      const data = await response.json();
      console.log('📊 MFS100 service response data:', data);
      
      const isAvailable = data.ErrorCode === "0";
      
      if (isAvailable) {
        console.log('✅ MFS100 service health check passed');
      } else {
        console.warn('❌ MFS100 service returned error:', data.ErrorDescription || 'Unknown error');
      }
      
      return isAvailable;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('❌ MFS100 service check timed out - service likely not running');
        } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
          console.error('❌ MFS100 service connection refused - service not running on port 8003');
        } else if (error.message.includes('ERR_CONNECTION_RESET')) {
          console.error('❌ MFS100 service connection reset - service may be restarting or unstable');
        } else {
          console.error(`❌ MFS100 service check failed: ${error.message}`);
        }
      } else {
        console.error('❌ MFS100 service check failed with unknown error:', error);
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
      throw new Error('No fingerprint service is available. Please start MFS100 service at http://localhost:8003');
    }

    // Always use MFS100 service
    return this.getMFS100DeviceInfo();
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
    console.log('🔍 Getting service status...');
    const available = await this.isServiceAvailable();
    
    let message: string;
    if (available) {
      message = 'Connected to MFS100 service';
      console.log('✅ Service status: Connected');
    } else if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      message = `Service unavailable (${this.consecutiveFailures} failures). Next check in ${Math.round(this.backoffDelay / 1000)}s`;
      console.log('⏳ Service status: In backoff mode');
    } else {
      message = 'MFS100 service not found. Is it running on port 8003?';
      console.log('❌ Service status: Not available');
    }
    
    console.log('📋 Final service status:', { available, service: this.activeServiceUrl, message });
    
    return {
      available,
      service: this.activeServiceUrl,
      message
    };
  }
}

// Export singleton instance
export const rdServiceClient = new RDServiceClient();
