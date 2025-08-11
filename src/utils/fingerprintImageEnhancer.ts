export interface EnhancementOptions {
  enhanceContrast?: boolean;
}

// Simple fingerprint image enhancement
export const enhanceFingerprintImage = async (
  imageData: string,
  options: EnhancementOptions = {}
): Promise<string> => {
  const { enhanceContrast = true } = options;

  try {
    // Create image element from data
    const img = await loadImageFromDataUrl(imageData);
    
    // Create canvas with original dimensions
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Draw original image
    ctx.drawImage(img, 0, 0);

    // Apply basic contrast enhancement if requested
    if (enhanceContrast) {
      const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageDataObj.data;
      
      // Simple contrast enhancement
      for (let i = 0; i < data.length; i += 4) {
        // Apply to RGB channels only
        for (let j = 0; j < 3; j++) {
          let value = data[i + j];
          // Simple contrast formula
          value = ((value - 128) * 1.2) + 128;
          data[i + j] = Math.max(0, Math.min(255, value));
        }
      }
      
      ctx.putImageData(imageDataObj, 0, 0);
    }

    return canvas.toDataURL('image/png', 1.0);

  } catch (error) {
    console.error('Error enhancing fingerprint image:', error);
    return imageData;
  }
};

// Utility function to load image from data URL

// Utility functions
const loadImageFromDataUrl = (dataUrl: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
};

// Simple quality enhancement - just basic contrast
export const quickEnhanceFingerprint = (imageData: string): Promise<string> => {
  return enhanceFingerprintImage(imageData, {
    enhanceContrast: true
  });
};

// Same as quick enhance - no complex processing
export const maxQualityEnhanceFingerprint = (imageData: string): Promise<string> => {
  return enhanceFingerprintImage(imageData, {
    enhanceContrast: true
  });
};

// Same as others - simple and fast
export const ultraMaxQualityEnhanceFingerprint = (imageData: string): Promise<string> => {
  return enhanceFingerprintImage(imageData, {
    enhanceContrast: true
  });
};
