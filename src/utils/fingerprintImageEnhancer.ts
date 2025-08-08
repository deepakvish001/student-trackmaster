import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js for optimal performance
env.allowLocalModels = false;
env.useBrowserCache = true;

const MAX_IMAGE_DIMENSION = 1024;
const ENHANCEMENT_SCALE = 2; // 2x upscaling

export interface EnhancementOptions {
  removeBackground?: boolean;
  enhanceContrast?: boolean;
  upscale?: boolean;
  denoiseLevel?: number; // 0-1
  sharpenLevel?: number; // 0-1
}

// Advanced image enhancement function
export const enhanceFingerprintImage = async (
  imageData: string,
  options: EnhancementOptions = {}
): Promise<string> => {
  const {
    removeBackground = true,
    enhanceContrast = true,
    upscale = true,
    denoiseLevel = 0.3,
    sharpenLevel = 0.5
  } = options;

  try {
    console.log('🚀 Starting AI-powered fingerprint enhancement...');
    
    // Create image element from data
    const img = await loadImageFromDataUrl(imageData);
    
    // Create high-resolution canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Set enhanced dimensions
    const originalWidth = img.naturalWidth;
    const originalHeight = img.naturalHeight;
    
    const targetWidth = upscale ? originalWidth * ENHANCEMENT_SCALE : originalWidth;
    const targetHeight = upscale ? originalHeight * ENHANCEMENT_SCALE : originalHeight;
    
    canvas.width = Math.min(targetWidth, MAX_IMAGE_DIMENSION);
    canvas.height = Math.min(targetHeight, MAX_IMAGE_DIMENSION);
    
    console.log(`📐 Enhanced dimensions: ${canvas.width}x${canvas.height} (original: ${originalWidth}x${originalHeight})`);

    // Draw with high-quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Apply initial image enhancements
    let imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageDataObj.data;

    // Apply advanced image processing
    if (enhanceContrast) {
      console.log('🎨 Applying contrast enhancement...');
      enhanceImageContrast(data, 1.4, 15); // Increased contrast and brightness
    }

    if (denoiseLevel > 0) {
      console.log('🔧 Applying noise reduction...');
      applyNoiseReduction(data, canvas.width, canvas.height, denoiseLevel);
    }

    if (sharpenLevel > 0) {
      console.log('⚡ Applying sharpening filter...');
      applySharpeningFilter(data, canvas.width, canvas.height, sharpenLevel);
    }

    // Apply enhanced fingerprint processing
    applyFingerprintSpecificEnhancement(data);

    ctx.putImageData(imageDataObj, 0, 0);

    // AI-powered background removal if requested
    if (removeBackground) {
      console.log('🤖 Applying AI background removal...');
      try {
        const enhancedBlob = await removeBackgroundWithAI(canvas);
        const enhancedDataUrl = await blobToDataUrl(enhancedBlob);
        console.log('✅ AI enhancement completed successfully');
        return enhancedDataUrl;
      } catch (error) {
        console.warn('⚠️ AI background removal failed, using standard enhancement:', error);
      }
    }

    // Return enhanced image as high-quality PNG
    const result = canvas.toDataURL('image/png', 1.0);
    console.log('✅ Fingerprint enhancement completed');
    return result;

  } catch (error) {
    console.error('❌ Error enhancing fingerprint image:', error);
    // Return original image if enhancement fails
    return imageData;
  }
};

// AI-powered background removal using Hugging Face transformers
const removeBackgroundWithAI = async (canvas: HTMLCanvasElement): Promise<Blob> => {
  try {
    console.log('🧠 Initializing AI segmentation model...');
    const segmenter = await pipeline(
      'image-segmentation', 
      'Xenova/segformer-b0-finetuned-ade-512-512',
      { device: 'webgpu' }
    );
    
    // Convert canvas to image data
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    
    console.log('🔍 Processing image with AI model...');
    const result = await segmenter(imageData);
    
    if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
      throw new Error('Invalid segmentation result');
    }
    
    // Create output canvas for masked image
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = canvas.width;
    outputCanvas.height = canvas.height;
    const outputCtx = outputCanvas.getContext('2d');
    
    if (!outputCtx) throw new Error('Could not get output canvas context');
    
    // Draw original image
    outputCtx.drawImage(canvas, 0, 0);
    
    // Apply AI mask
    const outputImageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
    const data = outputImageData.data;
    
    // Apply inverted mask to keep the fingerprint
    for (let i = 0; i < result[0].mask.data.length; i++) {
      const alpha = Math.round((1 - result[0].mask.data[i]) * 255);
      data[i * 4 + 3] = alpha;
    }
    
    outputCtx.putImageData(outputImageData, 0, 0);
    
    return new Promise((resolve, reject) => {
      outputCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/png',
        1.0
      );
    });
  } catch (error) {
    console.error('AI background removal error:', error);
    throw error;
  }
};

// Enhanced contrast and brightness adjustment
const enhanceImageContrast = (data: Uint8ClampedArray, contrast: number, brightness: number) => {
  const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));
  
  for (let i = 0; i < data.length; i += 4) {
    // Apply to RGB channels
    for (let j = 0; j < 3; j++) {
      let value = data[i + j];
      value = factor * (value - 128) + 128 + brightness;
      data[i + j] = Math.max(0, Math.min(255, value));
    }
  }
};

// Advanced noise reduction using bilateral filter concept
const applyNoiseReduction = (data: Uint8ClampedArray, width: number, height: number, strength: number) => {
  const newData = new Uint8ClampedArray(data);
  const kernelSize = 3;
  const halfKernel = Math.floor(kernelSize / 2);
  
  for (let y = halfKernel; y < height - halfKernel; y++) {
    for (let x = halfKernel; x < width - halfKernel; x++) {
      const centerIndex = (y * width + x) * 4;
      
      let rSum = 0, gSum = 0, bSum = 0, weightSum = 0;
      
      // Apply gaussian-like smoothing
      for (let ky = -halfKernel; ky <= halfKernel; ky++) {
        for (let kx = -halfKernel; kx <= halfKernel; kx++) {
          const neighborIndex = ((y + ky) * width + (x + kx)) * 4;
          const weight = Math.exp(-(kx * kx + ky * ky) / (2 * strength * strength));
          
          rSum += data[neighborIndex] * weight;
          gSum += data[neighborIndex + 1] * weight;
          bSum += data[neighborIndex + 2] * weight;
          weightSum += weight;
        }
      }
      
      newData[centerIndex] = rSum / weightSum;
      newData[centerIndex + 1] = gSum / weightSum;
      newData[centerIndex + 2] = bSum / weightSum;
    }
  }
  
  // Copy back the smoothed data
  for (let i = 0; i < data.length; i += 4) {
    data[i] = newData[i];
    data[i + 1] = newData[i + 1];
    data[i + 2] = newData[i + 2];
  }
};

// Unsharp masking for sharpening
const applySharpeningFilter = (data: Uint8ClampedArray, width: number, height: number, strength: number) => {
  const sharpenKernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];
  
  const newData = new Uint8ClampedArray(data);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const centerIndex = (y * width + x) * 4;
      
      for (let c = 0; c < 3; c++) { // RGB channels
        let sum = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const neighborIndex = ((y + ky) * width + (x + kx)) * 4;
            const kernelIndex = (ky + 1) * 3 + (kx + 1);
            sum += data[neighborIndex + c] * sharpenKernel[kernelIndex];
          }
        }
        
        const originalValue = data[centerIndex + c];
        const sharpenedValue = Math.max(0, Math.min(255, sum));
        newData[centerIndex + c] = originalValue + (sharpenedValue - originalValue) * strength;
      }
    }
  }
  
  // Copy back the sharpened data
  for (let i = 0; i < data.length; i += 4) {
    data[i] = newData[i];
    data[i + 1] = newData[i + 1];
    data[i + 2] = newData[i + 2];
  }
};

// Fingerprint-specific enhancement
const applyFingerprintSpecificEnhancement = (data: Uint8ClampedArray) => {
  for (let i = 0; i < data.length; i += 4) {
    // Convert to grayscale with optimal weights for fingerprint visibility
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    
    // Apply adaptive thresholding for better ridge visibility
    let enhanced = gray;
    if (gray < 128) {
      enhanced = Math.max(0, gray - 15); // Darken ridges
    } else {
      enhanced = Math.min(255, gray + 10); // Lighten valleys
    }
    
    // Apply gamma correction for better contrast
    enhanced = Math.pow(enhanced / 255, 0.8) * 255;
    
    data[i] = enhanced;     // Red
    data[i + 1] = enhanced; // Green
    data[i + 2] = enhanced; // Blue
  }
};

// Utility functions
const loadImageFromDataUrl = (dataUrl: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
};

const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Fast quality enhancement for real-time preview
export const quickEnhanceFingerprint = (imageData: string): Promise<string> => {
  return enhanceFingerprintImage(imageData, {
    removeBackground: false,
    enhanceContrast: true,
    upscale: false,
    denoiseLevel: 0.2,
    sharpenLevel: 0.3
  });
};

// Maximum quality enhancement for final save
export const maxQualityEnhanceFingerprint = (imageData: string): Promise<string> => {
  return enhanceFingerprintImage(imageData, {
    removeBackground: true,
    enhanceContrast: true,
    upscale: true,
    denoiseLevel: 0.4,
    sharpenLevel: 0.7
  });
};
