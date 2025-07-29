
/**
 * RD Service Client for Fingerprint Authentication
 * Optimized for better error handling and improved connection stability
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
  private readonly CACHE_DURATION = 15000; // Reduced to 15 seconds for better responsiveness
  private activeServiceUrl = '';
  private consecutiveFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 3; // Reduced from 5 to 3 for faster recovery
  private backoffDelay = 500; // Reduced initial backoff to 500ms
  private readonly MAX_BACKOFF_DELAY = 10000; // Maximum 10 seconds backoff
  private readonly CONNECTION_TIMEOUT = 5000; // Increased connection timeout to 5 seconds

  constructor() {
    console.log('RDServiceClient initialized with improved connection handling.');
  }

  /**
   * Check if MFS100 service or RD Service is available with improved error handling
   */
  async isServiceAvailable(): Promise<boolean> {
    const now = Date.now();
    
    // Return cached result if still valid
    if (this.availabilityCache && (now - this.availabilityCache.timestamp < this.CACHE_DURATION)) {
      this.activeServiceUrl = this.availabilityCache.service || '';
      return this.availabilityCache.result;
    }

    // Check backoff delay
    if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      if (now - this.lastAvailabilityCheck < this.backoffDelay) {
        return false;
      }
    }

    this.lastAvailabilityCheck = now;

    try {
      // Try MFS100 service first with improved error handling
      const mfs100Available = await this.checkMFS100Service();
      if (mfs100Available) {
        this.activeServiceUrl = this.baseUrl;
        this.availabilityCache = {
          result: true,
          timestamp: now,
          service: this.baseUrl
        };
        this.resetFailureTracking();
        console.log('✅ MFS100 service is available and stable');
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
        this.resetFailureTracking();
        console.log('✅ RD Service is available and stable');
        return true;
      }

      // Both services failed
      this.handleServiceFailure();
      return false;

    } catch (error) {
      this.handleServiceFailure();
      return false;
    }
  }

  private resetFailureTracking() {
    this.consecutiveFailures = 0;
    this.backoffDelay = 500;
  }

  private handleServiceFailure() {
    this.consecutiveFailures++;
    this.availabilityCache = {
      result: false,
      timestamp: Date.now()
    };
    
    // Calculate exponential backoff with maximum limit
    this.backoffDelay = Math.min(
      this.backoffDelay * 2,
      this.MAX_BACKOFF_DELAY
    );
    
    // Only log detailed error message occasionally to reduce console noise
    if (this.consecutiveFailures <= 2 || this.consecutiveFailures % 5 === 0) {
      console.warn(`❌ Fingerprint service unavailable (${this.consecutiveFailures} failures). Retrying in ${this.backoffDelay}ms`);
      console.warn('   Please ensure MFS100 service or RD Service is running and accessible.');
    }
  }

  private async checkMFS100Service(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.CONNECTION_TIMEOUT);

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
        console.log('✅ MFS100 service health check passed');
      }
      
      return isAvailable;
    } catch (error) {
      if (this.consecutiveFailures <= 1) {
        console.debug('MFS100 service check failed:', error instanceof Error ? error.message : 'Unknown error');
      }
      return false;
    }
  }

  private async checkRDService(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.CONNECTION_TIMEOUT);

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
      const isAvailable = response.ok;
      
      if (isAvailable) {
        console.log('✅ RD Service health check passed');
      }
      
      return isAvailable;
    } catch (error) {
      if (this.consecutiveFailures <= 1) {
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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.CONNECTION_TIMEOUT);

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
      console.log('✅ Device info retrieved successfully');
      return deviceInfo;
    } catch (error) {
      console.error('Failed to get MFS100 device info:', error);
      throw new Error('Failed to get device information from MFS100');
    }
  }

  private async getRDServiceDeviceInfo(): Promise<DeviceInfo> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.CONNECTION_TIMEOUT);

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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const deviceInfo: DeviceInfo = {
        dpId: 'RD_DEVICE',
        rdsId: 'RD_SERVICE',
        rdsVer: '1.0.0',
        dc: '',
        mi: 'Generic',
        mc: 'RD_Device'
      };

      this.deviceInfo = deviceInfo;
      console.log('✅ RD Service device info retrieved successfully');
      return deviceInfo;
    } catch (error) {
      console.error('Failed to get RD Service device info:', error);
      throw new Error('Failed to get device information from RD Service');
    }
  }

  /**
   * Capture fingerprint with improved timeout and retry logic
   */
  async captureFingerprint(timeout: number = 20000): Promise<RDServiceResponse> {
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
      TimeOut: Math.max(Math.round(timeout / 1000), 15) // Minimum 15 seconds timeout
    };

    try {
      const controller = new AbortController();
      const requestTimeout = setTimeout(() => controller.abort(), timeout + 5000); // Add 5 seconds buffer

      console.log(`🔍 Starting fingerprint capture with ${requestBody.TimeOut}s timeout`);

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

      if (result.errCode === "0") {
        console.log(`✅ Fingerprint capture successful (Quality: ${result.quality}%)`);
        this.resetFailureTracking(); // Reset failure tracking on successful capture
      } else {
        console.warn(`❌ Fingerprint capture failed: ${result.errInfo}`);
        throw new Error(result.errInfo);
      }

      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('❌ Fingerprint capture timed out - please try again');
        throw new Error('Fingerprint capture timed out. Please place your finger properly and try again.');
      }
      
      console.error('❌ Fingerprint capture error:', error);
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
    this.resetFailureTracking();
    console.log('✅ Service cache cleared and failure tracking reset');
  }

  /**
   * Get service status with improved messaging
   */
  async getServiceStatus(): Promise<{
    available: boolean;
    service: string;
    message: string;
  }> {
    const available = await this.isServiceAvailable();
    
    let message: string;
    if (available) {
      const serviceName = this.activeServiceUrl.includes('8003') ? 'MFS100' : 'RD Service';
      message = `Connected to ${serviceName} (stable)`;
    } else if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      message = `Service unavailable (${this.consecutiveFailures} failures). Retrying in ${Math.round(this.backoffDelay / 1000)}s`;
    } else {
      message = 'Connecting to fingerprint service...';
    }
    
    return {
      available,
      service: this.activeServiceUrl,
      message
    };
  }

  /**
   * Force immediate service reconnection
   */
  async forceReconnect(): Promise<boolean> {
    console.log('🔄 Forcing service reconnection...');
    this.clearCache();
    return await this.isServiceAvailable();
  }
}

// Export singleton instance
export const rdServiceClient = new RDServiceClient();
