/**
 * Multi-Fingerprint Capture Service
 * Unified service for capturing 5 fingerprints with enhanced quality and coordination
 */
import { captureHighQualityFingerprint, checkDeviceConnectionHealth } from '@/utils/mfs100Enhanced';

export interface FingerprintCaptureState {
  index: number;
  name: string;
  status: 'pending' | 'capturing' | 'captured' | 'failed' | 'retrying';
  imageData: string;
  template: string;
  quality: number;
  retryCount: number;
  timestamp?: Date;
}

export interface MultiFingerprintResult {
  fingerprints: FingerprintCaptureState[];
  completedCount: number;
  averageQuality: number;
  allCaptured: boolean;
}

class MultiFingerprintCaptureService {
  private static instance: MultiFingerprintCaptureService;
  
  private fingerprints: FingerprintCaptureState[] = [
    { index: 0, name: 'Right Thumb', status: 'pending', imageData: '', template: '', quality: 0, retryCount: 0 },
    { index: 1, name: 'Right Index', status: 'pending', imageData: '', template: '', quality: 0, retryCount: 0 },
    { index: 2, name: 'Right Middle', status: 'pending', imageData: '', template: '', quality: 0, retryCount: 0 },
    { index: 3, name: 'Left Index', status: 'pending', imageData: '', template: '', quality: 0, retryCount: 0 },
    { index: 4, name: 'Left Thumb', status: 'pending', imageData: '', template: '', quality: 0, retryCount: 0 }
  ];
  
  private subscribers: Set<(result: MultiFingerprintResult) => void> = new Set();
  private isCapturing = false;
  private currentController: AbortController | null = null;

  private constructor() {}

  static getInstance(): MultiFingerprintCaptureService {
    if (!MultiFingerprintCaptureService.instance) {
      MultiFingerprintCaptureService.instance = new MultiFingerprintCaptureService();
    }
    return MultiFingerprintCaptureService.instance;
  }

  // Subscribe to state changes
  subscribe(callback: (result: MultiFingerprintResult) => void): () => void {
    this.subscribers.add(callback);
    callback(this.getResult());
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    const result = this.getResult();
    this.subscribers.forEach(callback => callback(result));
  }

  private getResult(): MultiFingerprintResult {
    const completedCount = this.fingerprints.filter(fp => fp.status === 'captured').length;
    const capturedFingerprints = this.fingerprints.filter(fp => fp.status === 'captured');
    const averageQuality = capturedFingerprints.length > 0 
      ? capturedFingerprints.reduce((sum, fp) => sum + fp.quality, 0) / capturedFingerprints.length 
      : 0;

    return {
      fingerprints: [...this.fingerprints],
      completedCount,
      averageQuality: Math.round(averageQuality),
      allCaptured: completedCount === 5
    };
  }

  // Wait for SDK to be available
  private async waitForSDK(maxWait: number = 5000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      if (window.GetMFS100Info && window.CaptureFinger) {
        console.log('✅ MFS100 SDK is available');
        return true;
      }
      console.log('⏳ Waiting for MFS100 SDK to load...');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.error('❌ MFS100 SDK failed to load within timeout');
    return false;
  }

  // Simple 2x image enhancement
  private enhanceImageQuality(bitmapData: string): string {
    try {
      console.log('🎨 Applying simple 2x image enhancement...');
      
      const canvas = document.createElement('canvas');
      const scale = 2; // Simple 2x scaling
      canvas.width = 256 * scale;
      canvas.height = 256 * scale;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return "";
      
      // Process bitmap data with simple enhancement
      const binaryData = atob(bitmapData);
      const imageData = ctx.createImageData(256 * scale, 256 * scale);
      const data = imageData.data;
      
      // Simple processing with basic contrast enhancement
      for (let y = 0; y < 256 * scale; y++) {
        for (let x = 0; x < 256 * scale; x++) {
          const sourceX = Math.floor(x / scale);
          const sourceY = Math.floor(y / scale);
          const sourceIndex = sourceY * 256 + sourceX;
          
          if (sourceIndex < binaryData.length) {
            let pixelValue = 255 - binaryData.charCodeAt(sourceIndex);
            pixelValue = Math.min(255, Math.max(0, pixelValue * 1.3 + 20));
            
            const pixelIndex = (y * 256 * scale + x) * 4;
            data[pixelIndex] = pixelValue;
            data[pixelIndex + 1] = pixelValue;
            data[pixelIndex + 2] = pixelValue;
            data[pixelIndex + 3] = 255;
          }
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      console.log('✨ Simple 2x enhancement complete');
      return canvas.toDataURL('image/png', 1.0);
      
    } catch (error) {
      console.error('Image enhancement error:', error);
      return this.fallbackImageProcessing(bitmapData);
    }
  }


  // Fallback processing for error cases
  private fallbackImageProcessing(bitmapData: string): string {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return "";
      
      const binaryData = atob(bitmapData);
      const imageData = ctx.createImageData(256, 256);
      const data = imageData.data;
      
      for (let i = 0; i < Math.min(binaryData.length, 256 * 256); i++) {
        let pixelValue = 255 - binaryData.charCodeAt(i);
        pixelValue = Math.min(255, Math.max(0, pixelValue * 1.3 + 20));
        
        const pixelIndex = i * 4;
        data[pixelIndex] = pixelValue;
        data[pixelIndex + 1] = pixelValue;
        data[pixelIndex + 2] = pixelValue;
        data[pixelIndex + 3] = 255;
      }
      
      ctx.putImageData(imageData, 0, 0);
      return canvas.toDataURL('image/png', 1.0);
      
    } catch (error) {
      console.error('Fallback processing failed:', error);
      return "";
    }
  }

  // Capture fingerprint with enhanced quality using MFS100 SDK
  async captureFingerprint(index: number, quality: number = 70, timeout: number = 20): Promise<boolean> {
    if (this.isCapturing) {
      throw new Error('Another capture is in progress');
    }

    if (index < 0 || index >= 5) {
      throw new Error('Invalid fingerprint index');
    }

    this.isCapturing = true;
    this.fingerprints[index].status = 'capturing';
    this.notifySubscribers();

    try {
      console.log(`🔵 Capturing ${this.fingerprints[index].name} with enhanced quality...`);

      // Wait for SDK to be available first
      const sdkReady = await this.waitForSDK();
      if (!sdkReady) {
        throw new Error('MFS100 SDK not available. Please ensure the device is connected and drivers are installed.');
      }

      // Use the enhanced MFS100 capture function
      const result = await captureHighQualityFingerprint(
        quality, 
        timeout, 
        (status) => console.log(`📍 ${this.fingerprints[index].name}: ${status}`)
      );

      if (result.success && result.imageData) {
  // The imageData from mfs100Enhanced is already processed, so we can use it directly
        // Apply additional ultimate image enhancement only if it's raw bitmap data
        const finalImageData = result.imageData.startsWith('data:image') 
          ? result.imageData 
          : this.enhanceImageQuality(result.imageData);
        
        this.fingerprints[index] = {
          ...this.fingerprints[index],
          status: 'captured',
          imageData: finalImageData || result.imageData, // fallback to original if enhancement fails
          template: result.template || '',
          quality: result.quality || 0,
          timestamp: new Date(),
          retryCount: 0
        };

        console.log(`✅ ${this.fingerprints[index].name} captured successfully! Quality: ${result.quality}% (Ultra Enhanced)`);
        return true;

      } else {
        throw new Error(result.error || 'Capture failed - please try again');
      }

    } catch (error) {
      this.fingerprints[index].status = 'failed';
      this.fingerprints[index].retryCount++;
      
      const errorMessage = error instanceof Error ? error.message : 'Capture failed';
      console.error(`❌ ${this.fingerprints[index].name} capture failed:`, errorMessage);
      
      throw new Error(errorMessage);

    } finally {
      this.isCapturing = false;
      this.currentController = null;
      this.notifySubscribers();
    }
  }

  // Check device health before capture
  private async checkDeviceHealth(): Promise<void> {
    const deviceStatus = await checkDeviceConnectionHealth();
    if (!deviceStatus.isConnected) {
      throw new Error(`Device not connected: ${deviceStatus.error || 'Unknown connection issue'}`);
    }
  }

  // Retry capture for failed fingerprint
  async retryCapture(index: number): Promise<boolean> {
    if (index < 0 || index >= 5) {
      throw new Error('Invalid fingerprint index');
    }

    this.fingerprints[index].status = 'retrying';
    this.notifySubscribers();

    try {
      return await this.captureFingerprint(index);
    } catch (error) {
      throw error;
    }
  }

  // Check if capture is currently in progress
  isCurrentlyCapturing(): boolean {
    return this.isCapturing;
  }

  // Get current fingerprint status
  getFingerprintStatus(index: number): FingerprintCaptureState | null {
    if (index < 0 || index >= 5) return null;
    return { ...this.fingerprints[index] };
  }

  // Reset all fingerprints
  resetAll(): void {
    console.log('🔄 Resetting all fingerprints...');
    
    this.fingerprints = this.fingerprints.map((fp, index) => ({
      index,
      name: fp.name,
      status: 'pending' as const,
      imageData: '',
      template: '',
      quality: 0,
      retryCount: 0
    }));
    
    this.isCapturing = false;
    if (this.currentController) {
      this.currentController.abort();
      this.currentController = null;
    }
    
    this.notifySubscribers();
  }

  // Cancel current capture
  cancelCurrentCapture(): void {
    if (this.currentController) {
      console.log('🛑 Cancelling current capture...');
      this.currentController.abort();
      this.currentController = null;
    }
    
    this.isCapturing = false;
    
    // Reset any capturing status to failed
    this.fingerprints.forEach(fp => {
      if (fp.status === 'capturing' || fp.status === 'retrying') {
        fp.status = 'failed';
      }
    });
    
    this.notifySubscribers();
  }

  // Get all captured fingerprint data for saving
  getAllCapturedData(): { fingerprints: FingerprintCaptureState[], isComplete: boolean } {
    const capturedFingerprints = this.fingerprints.filter(fp => fp.status === 'captured');
    return {
      fingerprints: capturedFingerprints,
      isComplete: capturedFingerprints.length === 5
    };
  }
}

export const multiFingerprintCaptureService = MultiFingerprintCaptureService.getInstance();