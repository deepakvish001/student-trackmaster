
/**
 * Zero Polling MFS100 Service - Absolutely no background processes
 * Only communicates with device when user explicitly clicks capture
 */

export interface ZeroPollingMFS100Result {
  success: boolean;
  template: string;
  imageData: string;
  quality: number;
  message: string;
}

class ZeroPollingMFS100Service {
  private static instance: ZeroPollingMFS100Service;
  private baseUrl = 'http://localhost:8003/mfs100';

  private constructor() {
    console.log('🔵 Zero Polling MFS100 Service initialized - NO background processes');
  }

  static getInstance(): ZeroPollingMFS100Service {
    if (!ZeroPollingMFS100Service.instance) {
      ZeroPollingMFS100Service.instance = new ZeroPollingMFS100Service();
    }
    return ZeroPollingMFS100Service.instance;
  }

  // Direct capture - no checks, no retries, no background processes
  async captureFingerprint(quality: number = 60, timeout: number = 15): Promise<ZeroPollingMFS100Result> {
    try {
      console.log('🔵 Direct fingerprint capture - single request only');

      const response = await fetch(`${this.baseUrl}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          Quality: quality,
          TimeOut: timeout
        })
      });

      if (!response.ok) {
        return {
          success: false,
          template: '',
          imageData: '',
          quality: 0,
          message: 'Service not available - please ensure MFS100 service is running'
        };
      }

      const data = await response.json();

      if (data.ErrorCode === "0") {
        console.log(`✅ Fingerprint captured, Quality: ${data.Quality}`);
        
        return {
          success: true,
          template: data.IsoTemplate || '',
          imageData: data.BitmapData || '',
          quality: data.Quality || 0,
          message: `Captured with quality ${data.Quality}%`
        };
      } else {
        return {
          success: false,
          template: '',
          imageData: '',
          quality: 0,
          message: data.ErrorDescription || 'Capture failed - please try again'
        };
      }

    } catch (error) {
      let message = 'Capture failed - please try again';
      
      if (error instanceof Error && error.message.includes('ERR_CONNECTION_REFUSED')) {
        message = 'Service not running - please restart MFS100 service';
      }

      console.log('❌ Capture failed:', message);
      
      return {
        success: false,
        template: '',
        imageData: '',
        quality: 0,
        message
      };
    }
  }
}

export const zeroPollingMFS100Service = ZeroPollingMFS100Service.getInstance();
