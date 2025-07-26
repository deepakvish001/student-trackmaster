
/**
 * RD Service Client for UIDAI compliant fingerprint capture
 * Handles connection failures gracefully and provides fallback mechanisms
 */

interface RDServiceOptions {
  fCount: number;
  fType: number;
  iCount: number;
  iType: number;
  pCount: number;
  pType: number;
  format: number;
  pidVer: string;
  env: string;
  wadh: string;
  timeout: number;
}

interface RDServiceResponse {
  httpStaus: boolean;
  data: any;
  err: string;
}

interface CaptureResult {
  success: boolean;
  pidData?: string;
  imageData?: string;
  quality?: number;
  error?: string;
}

class RDServiceClient {
  private static instance: RDServiceClient;
  private baseUrl = 'http://127.0.0.1:11100';
  private isServiceAvailable = false;
  private lastCheckTime = 0;
  private checkInterval = 30000; // Check every 30 seconds
  private retryCount = 0;
  private maxRetries = 3;
  private connectionCheckInProgress = false;

  static getInstance(): RDServiceClient {
    if (!RDServiceClient.instance) {
      RDServiceClient.instance = new RDServiceClient();
    }
    return RDServiceClient.instance;
  }

  private constructor() {
    // Initial availability check
    this.checkServiceAvailability();
  }

  /**
   * Check if RD Service is available with throttling
   */
  async isServiceAvailable(): Promise<boolean> {
    const now = Date.now();
    
    // Throttle checks to prevent spam
    if (now - this.lastCheckTime < this.checkInterval && this.retryCount < this.maxRetries) {
      return this.isServiceAvailable;
    }

    if (this.connectionCheckInProgress) {
      return this.isServiceAvailable;
    }

    return this.checkServiceAvailability();
  }

  /**
   * Internal method to check service availability
   */
  private async checkServiceAvailability(): Promise<boolean> {
    if (this.connectionCheckInProgress) {
      return this.isServiceAvailable;
    }

    this.connectionCheckInProgress = true;
    this.lastCheckTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/rd/info`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        this.isServiceAvailable = true;
        this.retryCount = 0;
        console.log('✅ RD Service is available');
        return true;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      this.isServiceAvailable = false;
      this.retryCount++;
      
      // Only log every few attempts to reduce spam
      if (this.retryCount <= 3 || this.retryCount % 10 === 0) {
        console.warn(`⚠️ RD Service not available (attempt ${this.retryCount}):`, error instanceof Error ? error.message : 'Unknown error');
      }
      
      return false;
    } finally {
      this.connectionCheckInProgress = false;
    }
  }

  /**
   * Get device information
   */
  async getDeviceInfo(): Promise<any> {
    if (!await this.isServiceAvailable()) {
      throw new Error('RD Service is not available');
    }

    try {
      const response = await fetch(`${this.baseUrl}/rd/info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get device info:', error);
      throw error;
    }
  }

  /**
   * Capture fingerprint with PidData format
   */
  async captureFingerprint(): Promise<CaptureResult> {
    if (!await this.isServiceAvailable()) {
      return {
        success: false,
        error: 'RD Service is not available. Please ensure the RD Service is running on port 11100.'
      };
    }

    try {
      const captureXML = this.buildCaptureXML({
        fCount: 1,
        fType: 0,
        iCount: 0,
        iType: 0,
        pCount: 0,
        pType: 0,
        format: 0,
        pidVer: "2.0",
        env: "P",
        wadh: "",
        timeout: 10000
      });

      const response = await fetch(`${this.baseUrl}/rd/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
        },
        body: captureXML,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const xmlResponse = await response.text();
      return this.parseXMLResponse(xmlResponse);
    } catch (error) {
      console.error('❌ Fingerprint capture failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown capture error'
      };
    }
  }

  /**
   * Build capture XML request
   */
  private buildCaptureXML(options: RDServiceOptions): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<PidOptions ver="1.0">
  <Opts fCount="${options.fCount}" fType="${options.fType}" iCount="${options.iCount}" 
        iType="${options.iType}" pCount="${options.pCount}" pType="${options.pType}" 
        format="${options.format}" pidVer="${options.pidVer}" timeout="${options.timeout}" 
        env="${options.env}" wadh="${options.wadh}" />
</PidOptions>`;
  }

  /**
   * Parse XML response and extract fingerprint data
   */
  private parseXMLResponse(xmlResponse: string): CaptureResult {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlResponse, 'text/xml');
      
      const pidData = xmlDoc.querySelector('PidData');
      if (!pidData) {
        throw new Error('Invalid XML response: PidData not found');
      }

      const resp = pidData.querySelector('Resp');
      if (!resp) {
        throw new Error('Invalid XML response: Resp not found');
      }

      const errorCode = resp.getAttribute('errCode');
      const errorInfo = resp.getAttribute('errInfo');

      if (errorCode !== '0') {
        throw new Error(`Capture failed: ${errorInfo} (Code: ${errorCode})`);
      }

      // Extract quality from Data element
      const dataElement = pidData.querySelector('Data');
      const quality = dataElement ? parseInt(dataElement.getAttribute('qScore') || '0') : 0;

      // Extract image data from Bios element
      let imageData = '';
      const biosElement = pidData.querySelector('Bios');
      if (biosElement && biosElement.textContent) {
        imageData = this.extractImageFromBios(biosElement.textContent);
      }

      return {
        success: true,
        pidData: xmlResponse,
        imageData,
        quality
      };
    } catch (error) {
      console.error('❌ XML parsing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'XML parsing failed'
      };
    }
  }

  /**
   * Extract image data from Bios element
   */
  private extractImageFromBios(biosData: string): string {
    try {
      // Decode base64 Bios data
      const decodedBios = atob(biosData);
      
      // For demonstration, we'll create a simple image representation
      // In a real implementation, you would parse the actual biometric data format
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return '';
      
      // Create a simple pattern from the biometric data
      const imageData = ctx.createImageData(256, 256);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const pixelIndex = Math.floor(i / 4);
        const bioValue = decodedBios.charCodeAt(pixelIndex % decodedBios.length);
        
        // Create a fingerprint-like pattern
        const intensity = (bioValue + (pixelIndex % 256)) % 256;
        
        data[i] = intensity;     // Red
        data[i + 1] = intensity; // Green
        data[i + 2] = intensity; // Blue
        data[i + 3] = 255;       // Alpha
      }
      
      ctx.putImageData(imageData, 0, 0);
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('❌ Image extraction failed:', error);
      return '';
    }
  }

  /**
   * Reset connection state (useful for manual retry)
   */
  resetConnection(): void {
    this.isServiceAvailable = false;
    this.lastCheckTime = 0;
    this.retryCount = 0;
    this.connectionCheckInProgress = false;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): { isAvailable: boolean; retryCount: number; lastCheck: number } {
    return {
      isAvailable: this.isServiceAvailable,
      retryCount: this.retryCount,
      lastCheck: this.lastCheckTime
    };
  }
}

export const rdServiceClient = RDServiceClient.getInstance();
export type { CaptureResult, RDServiceResponse };
