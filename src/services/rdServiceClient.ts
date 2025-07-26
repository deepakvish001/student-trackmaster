
/**
 * RD Service Client - UIDAI-compliant fingerprint capture
 * Communicates with local RD Service at http://127.0.0.1:11100
 */

export interface RDServiceOptions {
  timeout?: number;
  fCount?: number;
  fType?: number;
  iCount?: number;
  iType?: number;
  pCount?: number;
  pType?: number;
  format?: number;
  pidVer?: string;
  env?: string;
  wadh?: string;
}

export interface PidData {
  resp: {
    errCode: string;
    errInfo: string;
    fCount: string;
    fType: string;
    iCount: string;
    iType: string;
    pCount: string;
    pType: string;
    nmPoints: string;
    qScore: string;
  };
  deviceInfo: {
    dpId: string;
    rdsId: string;
    rdsVer: string;
    mi: string;
    mc: string;
    dc: string;
  };
  skey: {
    ci: string;
    value: string;
  };
  hmac: string;
  data: string;
  biometricData?: {
    templateData: string;
    imageData?: string;
    quality: number;
  };
}

export interface RDServiceResponse {
  success: boolean;
  pidData?: PidData;
  xmlResponse?: string;
  error?: string;
  quality?: number;
  errorCode?: string;
  imageData?: string;
}

export class RDServiceClient {
  private baseUrl = 'http://127.0.0.1:11100';
  private timeout = 30000;

  constructor(options: { baseUrl?: string; timeout?: number } = {}) {
    this.baseUrl = options.baseUrl || this.baseUrl;
    this.timeout = options.timeout || this.timeout;
  }

  /**
   * Check if RD Service is available
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/rd/info`, {
        method: 'RDSERVICE',
        headers: {
          'Content-Type': 'text/xml',
        },
        signal: AbortSignal.timeout(5000),
      });
      
      return response.ok;
    } catch (error) {
      console.error('RD Service availability check failed:', error);
      return false;
    }
  }

  /**
   * Get device information
   */
  async getDeviceInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/rd/info`, {
        method: 'RDSERVICE',
        headers: {
          'Content-Type': 'text/xml',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      return this.parseDeviceInfoXML(xmlText);
    } catch (error) {
      console.error('Failed to get device info:', error);
      throw error;
    }
  }

  /**
   * Capture fingerprint using RD Service
   */
  async captureFingerprint(options: RDServiceOptions = {}): Promise<RDServiceResponse> {
    const {
      timeout = this.timeout,
      fCount = 1,
      fType = 0,
      iCount = 0,
      iType = 0,
      pCount = 0,
      pType = 0,
      format = 0,
      pidVer = '2.0',
      env = 'P',
      wadh = ''
    } = options;

    const captureXML = this.buildCaptureXML({
      timeout,
      fCount,
      fType,
      iCount,
      iType,
      pCount,
      pType,
      format,
      pidVer,
      env,
      wadh
    });

    try {
      console.log('Sending CAPTURE request to RD Service...');
      
      const response = await fetch(`${this.baseUrl}/rd/capture`, {
        method: 'CAPTURE',
        headers: {
          'Content-Type': 'text/xml',
        },
        body: captureXML,
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlResponse = await response.text();
      console.log('RD Service XML response:', xmlResponse);
      
      return this.parsePidDataXML(xmlResponse);
    } catch (error) {
      console.error('Fingerprint capture failed:', error);
      
      if (error instanceof Error) {
        if (error.name === 'TimeoutError') {
          return {
            success: false,
            error: 'Capture timeout - please place finger on scanner and try again',
            errorCode: 'TIMEOUT'
          };
        }
        
        if (error.message.includes('fetch')) {
          return {
            success: false,
            error: 'RD Service not available - please ensure MFS100 RD Service is running',
            errorCode: 'SERVICE_UNAVAILABLE'
          };
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown capture error',
        errorCode: 'CAPTURE_FAILED'
      };
    }
  }

  /**
   * Build XML for capture request
   */
  private buildCaptureXML(options: Required<RDServiceOptions>): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<PidOptions ver="1.0">
  <Opts fCount="${options.fCount}" fType="${options.fType}" iCount="${options.iCount}" iType="${options.iType}" pCount="${options.pCount}" pType="${options.pType}" format="${options.format}" pidVer="${options.pidVer}" timeout="${options.timeout}" env="${options.env}" wadh="${options.wadh}" />
</PidOptions>`;
  }

  /**
   * Parse PidData XML response and extract image data
   */
  private parsePidDataXML(xmlText: string): RDServiceResponse {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      // Check for XML parsing errors
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        throw new Error('Invalid XML response from RD Service');
      }

      const pidData = xmlDoc.querySelector('PidData');
      if (!pidData) {
        throw new Error('No PidData found in response');
      }

      const resp = pidData.querySelector('Resp');
      if (!resp) {
        throw new Error('No Resp element found in PidData');
      }

      const errorCode = resp.getAttribute('errCode') || '';
      const errorInfo = resp.getAttribute('errInfo') || '';
      const quality = parseInt(resp.getAttribute('qScore') || '0');

      // Check if capture was successful
      if (errorCode !== '0') {
        return {
          success: false,
          error: errorInfo || `Capture failed with error code: ${errorCode}`,
          errorCode,
          xmlResponse: xmlText
        };
      }

      // Parse device info
      const deviceInfo = pidData.querySelector('DeviceInfo');
      const skey = pidData.querySelector('Skey');
      const hmac = pidData.querySelector('Hmac');
      const data = pidData.querySelector('Data');

      // Extract biometric data - look for both template and image data
      const biometricData = this.extractBiometricData(data?.textContent || '');
      
      const parsedPidData: PidData = {
        resp: {
          errCode: errorCode,
          errInfo: errorInfo,
          fCount: resp.getAttribute('fCount') || '0',
          fType: resp.getAttribute('fType') || '0',
          iCount: resp.getAttribute('iCount') || '0',
          iType: resp.getAttribute('iType') || '0',
          pCount: resp.getAttribute('pCount') || '0',
          pType: resp.getAttribute('pType') || '0',
          nmPoints: resp.getAttribute('nmPoints') || '0',
          qScore: resp.getAttribute('qScore') || '0'
        },
        deviceInfo: {
          dpId: deviceInfo?.getAttribute('dpId') || '',
          rdsId: deviceInfo?.getAttribute('rdsId') || '',
          rdsVer: deviceInfo?.getAttribute('rdsVer') || '',
          mi: deviceInfo?.getAttribute('mi') || '',
          mc: deviceInfo?.getAttribute('mc') || '',
          dc: deviceInfo?.getAttribute('dc') || ''
        },
        skey: {
          ci: skey?.getAttribute('ci') || '',
          value: skey?.textContent || ''
        },
        hmac: hmac?.textContent || '',
        data: data?.textContent || '',
        biometricData
      };

      return {
        success: true,
        pidData: parsedPidData,
        xmlResponse: xmlText,
        quality,
        imageData: biometricData?.imageData
      };
    } catch (error) {
      console.error('Failed to parse PidData XML:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse response',
        errorCode: 'PARSE_ERROR',
        xmlResponse: xmlText
      };
    }
  }

  /**
   * Extract biometric data from base64 encoded data
   */
  private extractBiometricData(base64Data: string): PidData['biometricData'] {
    if (!base64Data) return undefined;

    try {
      // The data field contains base64 encoded biometric data
      // In actual MFS100 implementation, this would contain both template and image data
      // For now, we'll simulate the process of extracting image data
      
      // Decode base64 to get binary data
      const binaryData = atob(base64Data);
      
      // In a real implementation, you would parse the binary format
      // to extract template and image data separately
      // For demonstration, we'll create a mock image data URL
      
      return {
        templateData: base64Data,
        imageData: this.generateMockFingerprintImage(base64Data),
        quality: 75 // Default quality if not specified
      };
    } catch (error) {
      console.error('Failed to extract biometric data:', error);
      return {
        templateData: base64Data,
        quality: 0
      };
    }
  }

  /**
   * Generate mock fingerprint image for demonstration
   * In production, this would extract actual image data from the PidData
   */
  private generateMockFingerprintImage(templateData: string): string {
    // Create a simple SVG fingerprint representation
    const svg = `
      <svg width="120" height="150" viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="fingerprint-${templateData.substring(0, 8)}" patternUnits="userSpaceOnUse" width="4" height="4">
            <path d="M 0 2 Q 2 0 4 2 T 8 2" stroke="#4a5568" stroke-width="0.5" fill="none"/>
          </pattern>
        </defs>
        <rect width="120" height="150" fill="url(#fingerprint-${templateData.substring(0, 8)})"/>
        <ellipse cx="60" cy="75" rx="40" ry="60" fill="none" stroke="#2d3748" stroke-width="1"/>
        <ellipse cx="60" cy="75" rx="30" ry="45" fill="none" stroke="#2d3748" stroke-width="0.8"/>
        <ellipse cx="60" cy="75" rx="20" ry="30" fill="none" stroke="#2d3748" stroke-width="0.6"/>
        <ellipse cx="60" cy="75" rx="10" ry="15" fill="none" stroke="#2d3748" stroke-width="0.4"/>
        <text x="60" y="140" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#4a5568">
          PidData ${templateData.substring(0, 6)}
        </text>
      </svg>
    `;

    // Convert SVG to base64 data URL
    const base64SVG = btoa(svg);
    return `data:image/svg+xml;base64,${base64SVG}`;
  }

  /**
   * Parse device info XML
   */
  private parseDeviceInfoXML(xmlText: string): any {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      const deviceInfo = xmlDoc.querySelector('DeviceInfo');
      if (!deviceInfo) {
        throw new Error('No DeviceInfo found in response');
      }

      return {
        dpId: deviceInfo.getAttribute('dpId'),
        rdsId: deviceInfo.getAttribute('rdsId'),
        rdsVer: deviceInfo.getAttribute('rdsVer'),
        mi: deviceInfo.getAttribute('mi'),
        mc: deviceInfo.getAttribute('mc'),
        dc: deviceInfo.getAttribute('dc'),
        status: deviceInfo.getAttribute('status') || 'UNKNOWN'
      };
    } catch (error) {
      console.error('Failed to parse device info XML:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const rdServiceClient = new RDServiceClient();
