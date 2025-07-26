
/**
 * RD Service Client for Fingerprint Authentication
 * Handles communication with RD Service running on localhost:11100
 */

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
  private baseUrl = 'http://127.0.0.1:11100';
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
      console.warn('Failed to initialize device info:', error);
    }
  }

  /**
   * Check if RD Service is available with caching
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

      const response = await fetch(`${this.baseUrl}/rd/info`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache'
      });

      clearTimeout(timeout);
      
      const isAvailable = response.ok;
      
      // Cache the result
      this.availabilityCache = {
        result: isAvailable,
        timestamp: now
      };
      
      return isAvailable;
    } catch (error) {
      // Cache the failed result as well
      this.availabilityCache = {
        result: false,
        timestamp: now
      };
      
      return false;
    }
  }

  /**
   * Get device information
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    if (!await this.isServiceAvailable()) {
      throw new Error('RD Service is not available');
    }

    try {
      const response = await fetch(`${this.baseUrl}/rd/info`, {
        method: 'GET',
        cache: 'no-cache'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      const deviceInfo: DeviceInfo = {
        dpId: xmlDoc.querySelector('dpId')?.textContent || '',
        rdsId: xmlDoc.querySelector('rdsId')?.textContent || '',
        rdsVer: xmlDoc.querySelector('rdsVer')?.textContent || '',
        dc: xmlDoc.querySelector('dc')?.textContent || '',
        mi: xmlDoc.querySelector('mi')?.textContent || '',
        mc: xmlDoc.querySelector('mc')?.textContent || ''
      };

      this.deviceInfo = deviceInfo;
      return deviceInfo;
    } catch (error) {
      console.error('Failed to get device info:', error);
      throw new Error('Failed to get device information');
    }
  }

  /**
   * Capture fingerprint with specified timeout
   */
  async captureFingerprint(timeout: number = 10000): Promise<RDServiceResponse> {
    if (!await this.isServiceAvailable()) {
      throw new Error('RD Service is not available');
    }

    const requestBody = `<?xml version="1.0" encoding="UTF-8"?>
      <PidOptions ver="1.0">
        <Opts fCount="1" fType="0" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="${timeout}" posh="UNKNOWN" env="P"/>
      </PidOptions>`;

    try {
      const controller = new AbortController();
      const requestTimeout = setTimeout(() => controller.abort(), timeout + 2000);

      const response = await fetch(`${this.baseUrl}/rd/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
        },
        body: requestBody,
        signal: controller.signal,
        cache: 'no-cache'
      });

      clearTimeout(requestTimeout);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      // Parse the response
      const result: RDServiceResponse = {
        errCode: xmlDoc.querySelector('Resp')?.getAttribute('errCode') || '',
        errInfo: xmlDoc.querySelector('Resp')?.getAttribute('errInfo') || '',
        fCount: xmlDoc.querySelector('Resp')?.getAttribute('fCount') || '',
        fType: xmlDoc.querySelector('Resp')?.getAttribute('fType') || '',
        nmPoints: xmlDoc.querySelector('Resp')?.getAttribute('nmPoints') || '',
        qScore: xmlDoc.querySelector('Resp')?.getAttribute('qScore') || '',
        pidData: xmlDoc.querySelector('PidData')?.textContent || '',
        imageData: xmlDoc.querySelector('Image')?.textContent || '',
        ci: xmlDoc.querySelector('Param')?.getAttribute('ci') || '',
        sessionKey: xmlDoc.querySelector('Param')?.getAttribute('sessionKey') || '',
        hmac: xmlDoc.querySelector('Hmac')?.textContent || ''
      };

      // Add quality score as number
      if (result.qScore) {
        result.quality = parseInt(result.qScore);
      }

      // Check if capture was successful
      if (result.errCode !== '0') {
        throw new Error(`Capture failed: ${result.errInfo}`);
      }

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
