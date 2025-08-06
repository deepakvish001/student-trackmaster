
/**
 * Ultra Simple MFS100 Service - Zero background processes, maximum stability
 * Only communicates with device when user explicitly requests it
 */

export interface UltraSimpleMFS100Result {
  success: boolean;
  template: string;
  imageData: string;
  quality: number;
  message: string;
}

class UltraSimpleMFS100Service {
  private static instance: UltraSimpleMFS100Service;
  private baseUrl = 'http://localhost:8003/mfs100';

  private constructor() {}

  static getInstance(): UltraSimpleMFS100Service {
    if (!UltraSimpleMFS100Service.instance) {
      UltraSimpleMFS100Service.instance = new UltraSimpleMFS100Service();
    }
    return UltraSimpleMFS100Service.instance;
  }

  // Direct capture with minimal checks - no retries, no background processes
  async captureFingerprint(quality: number = 60, timeout: number = 15): Promise<UltraSimpleMFS100Result> {
    try {
      console.log('🔵 Direct fingerprint capture initiated');

      const controller = new AbortController();
      const requestTimeout = setTimeout(() => {
        controller.abort();
      }, (timeout * 1000) + 3000);

      const response = await fetch(`${this.baseUrl}/capture`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          Quality: quality,
          TimeOut: timeout
        })
      });

      clearTimeout(requestTimeout);

      if (!response.ok) {
        throw new Error('Service not available - please ensure MFS100 service is running');
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
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          message = 'Capture timeout - please try again';
        } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
          message = 'Service not running - please restart MFS100 service';
        }
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

export const ultraSimpleMFS100Service = UltraSimpleMFS100Service.getInstance();
