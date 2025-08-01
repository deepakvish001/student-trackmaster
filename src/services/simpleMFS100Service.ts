
/**
 * Simple MFS100 Service - Minimal checking, maximum reliability
 * No aggressive polling, no complex recovery - just works
 */

export interface SimpleMFS100Result {
  success: boolean;
  template: string;
  imageData: string;
  quality: number;
  message: string;
}

class SimpleMFS100Service {
  private static instance: SimpleMFS100Service;
  private baseUrl = 'https://localhost:8003/mfs100';
  private isCurrentlyCapturing = false;

  private constructor() {}

  static getInstance(): SimpleMFS100Service {
    if (!SimpleMFS100Service.instance) {
      SimpleMFS100Service.instance = new SimpleMFS100Service();
    }
    return SimpleMFS100Service.instance;
  }

  // Simple one-time connection check - only when really needed
  async isServiceAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.baseUrl}/info`, {
        method: 'GET',
        signal: controller.signal,
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
      return false;
    }
  }

  // Direct capture - no pre-checks, no retries, just capture
  async captureFingerprint(quality: number = 60, timeout: number = 15): Promise<SimpleMFS100Result> {
    if (this.isCurrentlyCapturing) {
      return {
        success: false,
        template: '',
        imageData: '',
        quality: 0,
        message: 'Another capture is in progress'
      };
    }

    this.isCurrentlyCapturing = true;

    try {
      console.log('🔵 Starting direct fingerprint capture...');

      const controller = new AbortController();
      const requestTimeout = setTimeout(() => {
        controller.abort();
      }, (timeout * 1000) + 5000);

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
        throw new Error(`Service unavailable (${response.status})`);
      }

      const data = await response.json();

      if (data.ErrorCode === "0") {
        console.log(`✅ Fingerprint captured successfully, Quality: ${data.Quality}`);
        
        return {
          success: true,
          template: data.IsoTemplate || '',
          imageData: data.BitmapData || '',
          quality: data.Quality || 0,
          message: `Captured with quality ${data.Quality}%`
        };
      } else {
        throw new Error(data.ErrorDescription || 'Capture failed');
      }

    } catch (error) {
      let message = 'Capture failed';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          message = 'Capture timeout - please try again';
        } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
          message = 'MFS100 service not running - please restart the service';
        } else {
          message = error.message;
        }
      }

      console.error('❌ Capture failed:', message);
      
      return {
        success: false,
        template: '',
        imageData: '',
        quality: 0,
        message
      };

    } finally {
      this.isCurrentlyCapturing = false;
    }
  }

  // Check if currently capturing
  isCapturing(): boolean {
    return this.isCurrentlyCapturing;
  }
}

export const simpleMFS100Service = SimpleMFS100Service.getInstance();
