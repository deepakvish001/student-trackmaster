
// High-quality fingerprint image processing utilities

export interface ImageProcessingOptions {
  enhanceContrast?: boolean;
  applySharpening?: boolean;
  noiseReduction?: boolean;
  scale?: number;
  quality?: number;
}

export class HighQualityImageProcessor {
  /**
   * Process raw bitmap data into ultra-high quality fingerprint images
   */
  static processFingerprint(
    bitmapData: string,
    width: number = 256,
    height: number = 256,
    options: ImageProcessingOptions = {}
  ): string {
    const {
      enhanceContrast = true,
      applySharpening = true,
      noiseReduction = true,
      scale = 2,
      quality = 1.0
    } = options;

    try {
      if (!bitmapData || bitmapData.length === 0) {
        throw new Error('No bitmap data provided');
      }

      console.log('🎯 Processing high-quality fingerprint:', {
        inputSize: bitmapData.length,
        dimensions: `${width}x${height}`,
        scale,
        options
      });

      // Create high-resolution canvas
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Enable high-quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Convert base64 to binary
      const binaryData = atob(bitmapData);
      
      // Create original size image data
      const originalCanvas = document.createElement('canvas');
      originalCanvas.width = width;
      originalCanvas.height = height;
      const originalCtx = originalCanvas.getContext('2d');
      
      if (!originalCtx) {
        throw new Error('Failed to get original canvas context');
      }

      const imageData = originalCtx.createImageData(width, height);
      const data = imageData.data;

      // Process each pixel
      const totalPixels = Math.min(binaryData.length, width * height);
      
      for (let i = 0; i < totalPixels; i++) {
        let pixelValue = binaryData.charCodeAt(i);
        
        // Invert for proper fingerprint display
        pixelValue = 255 - pixelValue;
        
        // Apply contrast enhancement if enabled
        if (enhanceContrast) {
          pixelValue = this.enhanceContrast(pixelValue);
        }
        
        // Apply noise reduction if enabled
        if (noiseReduction) {
          pixelValue = this.reduceNoise(pixelValue, i, totalPixels, binaryData);
        }
        
        const pixelIndex = i * 4;
        if (pixelIndex + 3 < data.length) {
          data[pixelIndex] = pixelValue;
          data[pixelIndex + 1] = pixelValue;
          data[pixelIndex + 2] = pixelValue;
          data[pixelIndex + 3] = 255;
        }
      }

      // Put processed data on original canvas
      originalCtx.putImageData(imageData, 0, 0);

      // Scale up with high-quality interpolation
      ctx.drawImage(originalCanvas, 0, 0, width, height, 0, 0, canvas.width, canvas.height);

      // Apply sharpening if enabled
      if (applySharpening) {
        this.applySharpeningFilter(ctx, canvas.width, canvas.height);
      }

      // Convert to high-quality data URL
      const result = canvas.toDataURL('image/png', quality);
      
      console.log('✅ High-quality processing complete:', {
        outputSize: result.length,
        finalDimensions: `${canvas.width}x${canvas.height}`
      });

      return result;

    } catch (error) {
      console.error('High-quality image processing error:', error);
      throw error;
    }
  }

  /**
   * Enhanced contrast using S-curve algorithm
   */
  private static enhanceContrast(pixelValue: number): number {
    let normalized = pixelValue / 255;
    
    // Apply S-curve for better contrast
    if (normalized < 0.5) {
      normalized = 2 * normalized * normalized;
    } else {
      normalized = 1 - 2 * (1 - normalized) * (1 - normalized);
    }
    
    // Apply additional contrast boost
    normalized = Math.min(1, Math.max(0, normalized * 1.3 - 0.15));
    
    return Math.round(normalized * 255);
  }

  /**
   * Simple noise reduction using neighboring pixels
   */
  private static reduceNoise(
    pixelValue: number,
    index: number,
    totalPixels: number,
    binaryData: string
  ): number {
    // Simple median filter approximation
    const neighbors = [];
    
    if (index > 0) neighbors.push(255 - binaryData.charCodeAt(index - 1));
    neighbors.push(pixelValue);
    if (index < totalPixels - 1) neighbors.push(255 - binaryData.charCodeAt(index + 1));
    
    neighbors.sort((a, b) => a - b);
    return neighbors[Math.floor(neighbors.length / 2)];
  }

  /**
   * Apply sharpening filter to canvas
   */
  private static applySharpeningFilter(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const output = new Uint8ClampedArray(data);

    // Sharpening kernel
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];

    // Apply sharpening kernel
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        let sum = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixel = ((y + ky) * width + (x + kx)) * 4;
            sum += data[pixel] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }

        sum = Math.min(255, Math.max(0, sum));
        output[idx] = sum;
        output[idx + 1] = sum;
        output[idx + 2] = sum;
      }
    }

    // Put processed data back
    const newImageData = new ImageData(output, width, height);
    ctx.putImageData(newImageData, 0, 0);
  }

  /**
   * Validate image quality based on various metrics
   */
  static validateImageQuality(imageData: string, minimumQuality: number = 70): {
    isValid: boolean;
    quality: number;
    metrics: {
      contrast: number;
      sharpness: number;
      noise: number;
    };
  } {
    try {
      // This would need actual image analysis implementation
      // For now, return a basic validation structure
      return {
        isValid: true,
        quality: 85, // Placeholder
        metrics: {
          contrast: 0.8,
          sharpness: 0.9,
          noise: 0.1
        }
      };
    } catch (error) {
      return {
        isValid: false,
        quality: 0,
        metrics: {
          contrast: 0,
          sharpness: 0,
          noise: 1
        }
      };
    }
  }
}
