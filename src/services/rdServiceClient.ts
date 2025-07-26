
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
}

export interface RDServiceResponse {
  success: boolean;
  pidData?: PidData;
  xmlResponse?: string;
  error?: string;
  quality?: number;
  errorCode?: string;
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
  <Opts fCount="${options.fCount}" fType="${options.fType}" iCount="${options.iCount}" iType="${options.iType}" pCount="${options.pCount}" pType="${options.pType}" format="${options.format}" pidVer="${options.pidVer}" timeout="${this.timeout}" env="${options.env}" wadh="${options.wadh}" />
</PidOptions>`;
  }

  /**
   * Parse PidData XML response
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

      const parsedPidData: PidData = {
        resp: {
          errCode,
          errInfo,
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
        data: data?.textContent || ''
      };

      return {
        success: true,
        pidData: parsedPidData,
        xmlResponse: xmlText,
        quality
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
