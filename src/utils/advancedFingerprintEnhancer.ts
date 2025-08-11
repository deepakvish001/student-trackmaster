/**
 * Advanced Fingerprint Image Enhancement
 * Specifically designed to improve side area clarity and remove white artifacts
 */

export interface EnhancementConfig {
  removeEdgeArtifacts: boolean;
  enhanceSideAreas: boolean;
  adaptiveContrast: boolean;
  ridgeEnhancement: boolean;
  noiseReduction: boolean;
  fullFrameCapture: boolean;
}

// Advanced fingerprint enhancement with side area improvement
export const enhanceFullFingerprintImage = async (
  imageData: string,
  config: EnhancementConfig = {
    removeEdgeArtifacts: true,
    enhanceSideAreas: true,
    adaptiveContrast: true,
    ridgeEnhancement: true,
    noiseReduction: true,
    fullFrameCapture: true
  }
): Promise<string> => {
  try {
    const img = await loadImageFromDataUrl(imageData);
    
    // Create high-resolution canvas for better processing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Use original dimensions or enhance for full frame capture
    const width = config.fullFrameCapture ? Math.max(img.naturalWidth, 512) : img.naturalWidth;
    const height = config.fullFrameCapture ? Math.max(img.naturalHeight, 512) : img.naturalHeight;
    
    canvas.width = width;
    canvas.height = height;

    // Draw original image
    ctx.drawImage(img, 0, 0, width, height);
    
    let imageDataObj = ctx.getImageData(0, 0, width, height);
    let data = imageDataObj.data;
    
    // Step 1: Remove edge artifacts and white lines
    if (config.removeEdgeArtifacts) {
      data = removeEdgeArtifacts(data, width, height);
    }
    
    // Step 2: Enhance side areas specifically
    if (config.enhanceSideAreas) {
      data = enhanceSideAreas(data, width, height);
    }
    
    // Step 3: Apply adaptive contrast enhancement
    if (config.adaptiveContrast) {
      data = applyAdaptiveContrast(data, width, height);
    }
    
    // Step 4: Ridge enhancement for better clarity
    if (config.ridgeEnhancement) {
      data = enhanceRidgeStructure(data, width, height);
    }
    
    // Step 5: Noise reduction while preserving details
    if (config.noiseReduction) {
      data = applySelectiveNoiseReduction(data, width, height);
    }
    
    // Apply processed data back to canvas
    const newImageData = new ImageData(data, width, height);
    ctx.putImageData(newImageData, 0, 0);
    
    // Apply final sharpening
    await applyFinalSharpening(ctx, width, height);
    
    return canvas.toDataURL('image/png', 1.0);
    
  } catch (error) {
    console.error('Advanced fingerprint enhancement error:', error);
    return imageData;
  }
};

// Remove white lines and edge artifacts
const removeEdgeArtifacts = (data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray => {
  const newData = new Uint8ClampedArray(data);
  const edgeThreshold = 20; // Pixels from edge to process
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      // Check if pixel is near edges
      const nearLeftEdge = x < edgeThreshold;
      const nearRightEdge = x > width - edgeThreshold;
      const nearTopEdge = y < edgeThreshold;
      const nearBottomEdge = y > height - edgeThreshold;
      
      if (nearLeftEdge || nearRightEdge || nearTopEdge || nearBottomEdge) {
        // Get current pixel intensity
        const intensity = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        // If pixel is too bright (white artifact), replace with interpolated value
        if (intensity > 240) {
          const neighbors = getNeighborAverage(data, x, y, width, height, 3);
          newData[idx] = neighbors.r;
          newData[idx + 1] = neighbors.g;
          newData[idx + 2] = neighbors.b;
        }
      }
    }
  }
  
  return newData;
};

// Enhance side areas with better contrast and clarity
const enhanceSideAreas = (data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray => {
  const newData = new Uint8ClampedArray(data);
  const centerX = width / 2;
  const sideThreshold = width * 0.25; // Areas within 25% from edges
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const distanceFromCenter = Math.abs(x - centerX);
      
      // Check if pixel is in side area
      if (distanceFromCenter > sideThreshold) {
        // Calculate enhancement factor (stronger towards edges)
        const enhancementFactor = 1.2 + (distanceFromCenter / centerX) * 0.5;
        
        for (let i = 0; i < 3; i++) {
          let value = data[idx + i];
          
          // Apply contrast enhancement
          value = ((value - 128) * enhancementFactor) + 128;
          
          // Apply gamma correction for better visibility
          value = 255 * Math.pow(value / 255, 0.8);
          
          newData[idx + i] = Math.max(0, Math.min(255, value));
        }
      } else {
        // Keep center area unchanged
        newData[idx] = data[idx];
        newData[idx + 1] = data[idx + 1];
        newData[idx + 2] = data[idx + 2];
      }
      newData[idx + 3] = data[idx + 3]; // Alpha channel
    }
  }
  
  return newData;
};

// Apply adaptive contrast based on local image statistics
const applyAdaptiveContrast = (data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray => {
  const newData = new Uint8ClampedArray(data);
  const windowSize = 15; // Local window size
  
  for (let y = windowSize; y < height - windowSize; y++) {
    for (let x = windowSize; x < width - windowSize; x++) {
      const idx = (y * width + x) * 4;
      
      // Calculate local statistics
      const localStats = calculateLocalStatistics(data, x, y, width, height, windowSize);
      
      for (let i = 0; i < 3; i++) {
        let value = data[idx + i];
        
        // Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        const normalizedValue = (value - localStats.min) / (localStats.max - localStats.min + 1);
        value = normalizedValue * 255;
        
        // Apply sigmoid function for better contrast
        value = 255 / (1 + Math.exp(-((value - 128) / 30)));
        
        newData[idx + i] = Math.max(0, Math.min(255, value));
      }
      newData[idx + 3] = data[idx + 3];
    }
  }
  
  return newData;
};

// Enhance ridge structure for better fingerprint clarity
const enhanceRidgeStructure = (data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray => {
  const newData = new Uint8ClampedArray(data);
  
  // Directional filters for ridge enhancement
  const horizontalKernel = [-1, -1, -1, 2, 2, 2, -1, -1, -1];
  const verticalKernel = [-1, 2, -1, -1, 2, -1, -1, 2, -1];
  const diagonal1Kernel = [2, -1, -1, -1, 2, -1, -1, -1, 2];
  const diagonal2Kernel = [-1, -1, 2, -1, 2, -1, 2, -1, -1];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      for (let c = 0; c < 3; c++) {
        // Apply all directional filters
        const h = applyKernel(data, x, y, width, height, c, horizontalKernel);
        const v = applyKernel(data, x, y, width, height, c, verticalKernel);
        const d1 = applyKernel(data, x, y, width, height, c, diagonal1Kernel);
        const d2 = applyKernel(data, x, y, width, height, c, diagonal2Kernel);
        
        // Take the maximum response for ridge enhancement
        const maxResponse = Math.max(Math.abs(h), Math.abs(v), Math.abs(d1), Math.abs(d2));
        let enhancedValue = data[idx + c] + maxResponse * 0.3;
        
        newData[idx + c] = Math.max(0, Math.min(255, enhancedValue));
      }
      newData[idx + 3] = data[idx + 3];
    }
  }
  
  return newData;
};

// Apply selective noise reduction that preserves ridge details
const applySelectiveNoiseReduction = (data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray => {
  const newData = new Uint8ClampedArray(data);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      for (let c = 0; c < 3; c++) {
        const currentValue = data[idx + c];
        const neighbors = [];
        
        // Collect 8-connected neighbors
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nIdx = ((y + dy) * width + (x + dx)) * 4 + c;
            neighbors.push(data[nIdx]);
          }
        }
        
        // Calculate variance to detect edges vs noise
        const mean = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
        const variance = neighbors.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / neighbors.length;
        
        // If low variance (smooth area), apply noise reduction
        if (variance < 100) {
          newData[idx + c] = mean;
        } else {
          // High variance (edge area), preserve original value
          newData[idx + c] = currentValue;
        }
      }
      newData[idx + 3] = data[idx + 3];
    }
  }
  
  return newData;
};

// Apply final sharpening for crisp edges
const applyFinalSharpening = async (ctx: CanvasRenderingContext2D, width: number, height: number): Promise<void> => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const newData = new Uint8ClampedArray(data);
  
  // Unsharp mask kernel
  const kernel = [
    0, -0.5, 0,
    -0.5, 3, -0.5,
    0, -0.5, 0
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        const sharpened = applyKernel(data, x, y, width, height, c, kernel);
        const idx = (y * width + x) * 4 + c;
        newData[idx] = Math.max(0, Math.min(255, sharpened));
      }
    }
  }
  
  ctx.putImageData(new ImageData(newData, width, height), 0, 0);
};

// Helper functions
const loadImageFromDataUrl = (dataUrl: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
};

const getNeighborAverage = (data: Uint8ClampedArray, x: number, y: number, width: number, height: number, radius: number) => {
  let r = 0, g = 0, b = 0, count = 0;
  
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const idx = (ny * width + nx) * 4;
        r += data[idx];
        g += data[idx + 1];
        b += data[idx + 2];
        count++;
      }
    }
  }
  
  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count)
  };
};

const calculateLocalStatistics = (data: Uint8ClampedArray, x: number, y: number, width: number, height: number, windowSize: number) => {
  let min = 255, max = 0, sum = 0, count = 0;
  
  for (let dy = -windowSize; dy <= windowSize; dy++) {
    for (let dx = -windowSize; dx <= windowSize; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const idx = (ny * width + nx) * 4;
        const intensity = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        min = Math.min(min, intensity);
        max = Math.max(max, intensity);
        sum += intensity;
        count++;
      }
    }
  }
  
  return { min, max, mean: sum / count };
};

const applyKernel = (data: Uint8ClampedArray, x: number, y: number, width: number, height: number, channel: number, kernel: number[]): number => {
  let sum = 0;
  let kernelIndex = 0;
  
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = Math.max(0, Math.min(width - 1, x + dx));
      const ny = Math.max(0, Math.min(height - 1, y + dy));
      const idx = (ny * width + nx) * 4 + channel;
      sum += data[idx] * kernel[kernelIndex];
      kernelIndex++;
    }
  }
  
  return sum;
};

// Export the main enhancement function with default settings for full clarity
export const enhanceFullClarityFingerprint = (imageData: string): Promise<string> => {
  return enhanceFullFingerprintImage(imageData, {
    removeEdgeArtifacts: true,
    enhanceSideAreas: true,
    adaptiveContrast: true,
    ridgeEnhancement: true,
    noiseReduction: true,
    fullFrameCapture: true
  });
};
