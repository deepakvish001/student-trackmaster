/**
 * Ultra-High Quality Fingerprint Enhancement
 * Provides maximum quality enhancement for complete fingerprint capture
 */

// Smart denoising function for ultra-quality
export const applySmartDenoise = (
  pixelValue: number, 
  x: number, 
  y: number, 
  data: Uint8ClampedArray, 
  scale: number
): number => {
  // Apply bilateral filter-like denoising
  let sum = 0;
  let weightSum = 0;
  const radius = 2;
  
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      const neighborIndex = (ny * 256 * scale + nx) * 4;
      
      if (neighborIndex >= 0 && neighborIndex < data.length) {
        const neighborValue = data[neighborIndex];
        const spatialWeight = Math.exp(-(dx * dx + dy * dy) / (2 * radius * radius));
        const intensityWeight = Math.exp(-Math.abs(pixelValue - neighborValue) / (2 * 30 * 30));
        const weight = spatialWeight * intensityWeight;
        
        sum += neighborValue * weight;
        weightSum += weight;
      }
    }
  }
  
  return weightSum > 0 ? sum / weightSum : pixelValue;
};

// Super sharpening for ultra-quality
export const applySuperSharpening = async (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strength: number
): Promise<void> => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const newData = new Uint8ClampedArray(data);
  
  // Enhanced unsharp masking kernel
  const kernel = [
    0, -1, 0,
    -1, 5 + strength, -1,
    0, -1, 0
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) { // RGB channels
        let sum = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const index = ((y + ky) * width + (x + kx)) * 4 + c;
            const kernelIndex = (ky + 1) * 3 + (kx + 1);
            sum += data[index] * kernel[kernelIndex];
          }
        }
        
        const index = (y * width + x) * 4 + c;
        newData[index] = Math.max(0, Math.min(255, sum));
      }
    }
  }
  
  ctx.putImageData(new ImageData(newData, width, height), 0, 0);
};

// Ultra-high quality bitmap to canvas conversion
export const convertBitmapToUltraCanvas = (
  bitmapData: string,
  targetWidth: number = 2048,
  targetHeight: number = 2048
): string => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return "";
    
    const binaryData = atob(bitmapData);
    const imageData = ctx.createImageData(targetWidth, targetHeight);
    const data = imageData.data;
    
    const scaleX = targetWidth / 256;
    const scaleY = targetHeight / 256;
    
    // Ultra-high quality bicubic interpolation
    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const sourceX = x / scaleX;
        const sourceY = y / scaleY;
        
        const pixelValue = getBicubicValue(binaryData, sourceX, sourceY, 256, 256);
        const enhanced = 255 - pixelValue; // Invert for fingerprint
        
        const index = (y * targetWidth + x) * 4;
        data[index] = enhanced;     // Red
        data[index + 1] = enhanced; // Green
        data[index + 2] = enhanced; // Blue
        data[index + 3] = 255;      // Alpha
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png', 1.0);
    
  } catch (error) {
    console.error('Ultra conversion error:', error);
    return "";
  }
};

// Bicubic interpolation for smooth scaling
const getBicubicValue = (
  data: string,
  x: number,
  y: number,
  width: number,
  height: number
): number => {
  const x1 = Math.floor(x);
  const y1 = Math.floor(y);
  
  let value = 0;
  for (let dy = -1; dy <= 2; dy++) {
    for (let dx = -1; dx <= 2; dx++) {
      const sx = Math.max(0, Math.min(width - 1, x1 + dx));
      const sy = Math.max(0, Math.min(height - 1, y1 + dy));
      const index = sy * width + sx;
      
      if (index < data.length) {
        const pixel = data.charCodeAt(index);
        const weight = cubicWeight(x - (x1 + dx)) * cubicWeight(y - (y1 + dy));
        value += pixel * weight;
      }
    }
  }
  
  return Math.max(0, Math.min(255, value));
};

const cubicWeight = (x: number): number => {
  const a = -0.5;
  const absX = Math.abs(x);
  
  if (absX <= 1) {
    return (a + 2) * Math.pow(absX, 3) - (a + 3) * Math.pow(absX, 2) + 1;
  } else if (absX <= 2) {
    return a * Math.pow(absX, 3) - 5 * a * Math.pow(absX, 2) + 8 * a * absX - 4 * a;
  }
  return 0;
};