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

  // Enhanced image processing with 4x quality improvement
  private enhanceImageQuality(bitmapData: string): string {
    try {
      console.log('🎨 Applying ultimate image enhancement...');
      
      // Create ultra-high-resolution canvas (8x scaling for maximum detail)
      const canvas = document.createElement('canvas');
      const scale = 8; // Increased to 8x for ultimate quality
      canvas.width = 256 * scale;
      canvas.height = 256 * scale;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return "";
      
      // Process bitmap data with advanced filtering
      const binaryData = atob(bitmapData);
      const originalImageData = ctx.createImageData(256, 256);
      const originalData = originalImageData.data;
      
      // Step 1: Base processing with ultra contrast enhancement
      for (let i = 0; i < Math.min(binaryData.length, 256 * 256); i++) {
        let pixelValue = 255 - binaryData.charCodeAt(i);
        
        // Ultra-advanced contrast enhancement with optimal gamma correction
        pixelValue = Math.pow(pixelValue / 255, 0.75) * 255;
        pixelValue = Math.min(255, Math.max(0, pixelValue * 1.6 + 20)); // Increased contrast
        
        const pixelIndex = i * 4;
        originalData[pixelIndex] = pixelValue;
        originalData[pixelIndex + 1] = pixelValue;
        originalData[pixelIndex + 2] = pixelValue;
        originalData[pixelIndex + 3] = 255;
      }
      
      // Step 2: Apply noise reduction using median filter
      const denoisedData = this.applyMedianFilter(originalData, 256, 256);
      
      // Step 3: Scale up with bicubic interpolation
      const scaledImageData = ctx.createImageData(256 * scale, 256 * scale);
      this.bicubicResize(denoisedData, 256, 256, scaledImageData.data, 256 * scale, 256 * scale);
      
      // Step 4: Apply sharpening filter
      const sharpenedData = this.applySharpeningFilter(scaledImageData.data, 256 * scale, 256 * scale);
      
      // Create final image
      const finalImageData = new ImageData(sharpenedData, 256 * scale, 256 * scale);
      ctx.putImageData(finalImageData, 0, 0);
      
      console.log('✨ Ultimate image enhancement complete - 8x resolution with advanced filtering');
      return canvas.toDataURL('image/png', 1.0);
      
    } catch (error) {
      console.error('Image enhancement error:', error);
      return this.fallbackImageProcessing(bitmapData);
    }
  }

  // Advanced median filter for noise reduction
  private applyMedianFilter(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
    const filtered = new Uint8ClampedArray(data.length);
    const filterSize = 3;
    const offset = Math.floor(filterSize / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const values: number[] = [];
        
        for (let fy = -offset; fy <= offset; fy++) {
          for (let fx = -offset; fx <= offset; fx++) {
            const ny = Math.max(0, Math.min(height - 1, y + fy));
            const nx = Math.max(0, Math.min(width - 1, x + fx));
            const index = (ny * width + nx) * 4;
            values.push(data[index]);
          }
        }
        
        values.sort((a, b) => a - b);
        const median = values[Math.floor(values.length / 2)];
        
        const index = (y * width + x) * 4;
        filtered[index] = median;
        filtered[index + 1] = median;
        filtered[index + 2] = median;
        filtered[index + 3] = 255;
      }
    }
    
    return filtered;
  }

  // Bicubic interpolation for high-quality scaling
  private bicubicResize(src: Uint8ClampedArray, srcWidth: number, srcHeight: number, 
                       dst: Uint8ClampedArray, dstWidth: number, dstHeight: number): void {
    const scaleX = srcWidth / dstWidth;
    const scaleY = srcHeight / dstHeight;
    
    for (let y = 0; y < dstHeight; y++) {
      for (let x = 0; x < dstWidth; x++) {
        const srcX = x * scaleX;
        const srcY = y * scaleY;
        
        const x1 = Math.floor(srcX);
        const y1 = Math.floor(srcY);
        
        // Bicubic interpolation
        let value = 0;
        for (let dy = -1; dy <= 2; dy++) {
          for (let dx = -1; dx <= 2; dx++) {
            const sx = Math.max(0, Math.min(srcWidth - 1, x1 + dx));
            const sy = Math.max(0, Math.min(srcHeight - 1, y1 + dy));
            const srcIndex = (sy * srcWidth + sx) * 4;
            
            const weight = this.bicubicWeight(srcX - (x1 + dx)) * this.bicubicWeight(srcY - (y1 + dy));
            value += src[srcIndex] * weight;
          }
        }
        
        const dstIndex = (y * dstWidth + x) * 4;
        dst[dstIndex] = Math.max(0, Math.min(255, value));
        dst[dstIndex + 1] = dst[dstIndex];
        dst[dstIndex + 2] = dst[dstIndex];
        dst[dstIndex + 3] = 255;
      }
    }
  }

  private bicubicWeight(x: number): number {
    const a = -0.5;
    const absX = Math.abs(x);
    
    if (absX <= 1) {
      return (a + 2) * Math.pow(absX, 3) - (a + 3) * Math.pow(absX, 2) + 1;
    } else if (absX <= 2) {
      return a * Math.pow(absX, 3) - 5 * a * Math.pow(absX, 2) + 8 * a * absX - 4 * a;
    }
    return 0;
  }

  // Sharpening filter for final enhancement
  private applySharpeningFilter(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
    const sharpened = new Uint8ClampedArray(data.length);
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let value = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const index = ((y + ky) * width + (x + kx)) * 4;
            const weight = kernel[(ky + 1) * 3 + (kx + 1)];
            value += data[index] * weight;
          }
        }
        
        const index = (y * width + x) * 4;
        sharpened[index] = Math.max(0, Math.min(255, value));
        sharpened[index + 1] = sharpened[index];
        sharpened[index + 2] = sharpened[index];
        sharpened[index + 3] = 255;
      }
    }
    
    return sharpened;
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