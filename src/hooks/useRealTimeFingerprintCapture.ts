
import { useState, useCallback } from 'react';

interface FingerprintData {
  template: string;
  imageData: string;
  quality: number | null;
  timestamp: Date;
}

export const useRealTimeFingerprintCapture = () => {
  const [capturedFingerprints, setCapturedFingerprints] = useState<Record<number, FingerprintData>>({});
  const [isCapturing, setIsCapturing] = useState<Record<number, boolean>>({});

  // Process raw bitmap data to displayable image
  const processBitmapToImage = useCallback((bitmapData: string, width: number = 256, height: number = 256): string => {
    try {
      if (!bitmapData || bitmapData.length === 0) {
        console.warn('No bitmap data provided for processing');
        return "";
      }

      console.log(`Processing bitmap data: ${bitmapData.length} bytes, dimensions: ${width}x${height}`);
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Convert base64 bitmap data to binary
      const binaryData = atob(bitmapData);
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      
      // Process each pixel - MFS100 provides raw grayscale bitmap data
      const totalPixels = Math.min(binaryData.length, width * height);
      
      for (let i = 0; i < totalPixels; i++) {
        let pixelValue = binaryData.charCodeAt(i);
        
        // Invert the pixel values - MFS100 typically returns inverted images
        pixelValue = 255 - pixelValue;
        
        // Apply contrast and brightness enhancement
        pixelValue = Math.min(255, Math.max(0, pixelValue * 1.3 + 20));
        
        const pixelIndex = i * 4;
        if (pixelIndex + 3 < data.length) {
          data[pixelIndex] = pixelValue;     // Red
          data[pixelIndex + 1] = pixelValue; // Green
          data[pixelIndex + 2] = pixelValue; // Blue
          data[pixelIndex + 3] = 255;        // Alpha (fully opaque)
        }
      }
      
      // Put the processed image data onto the canvas
      ctx.putImageData(imageData, 0, 0);
      
      // Convert to high-quality PNG data URI
      const result = canvas.toDataURL('image/png', 1.0);
      console.log(`✅ Fingerprint image processed successfully, result length: ${result.length}`);
      
      return result;
      
    } catch (error) {
      console.error('Fingerprint bitmap processing error:', error);
      return "";
    }
  }, []);

  const startCapture = useCallback((fingerIndex: number) => {
    setIsCapturing(prev => ({ ...prev, [fingerIndex]: true }));
  }, []);

  const completeCapture = useCallback((
    fingerIndex: number, 
    template: string, 
    rawImageData: string, 
    quality: number | null
  ) => {
    // Process the raw bitmap data into a displayable image
    const processedImageData = processBitmapToImage(rawImageData);
    
    setCapturedFingerprints(prev => ({
      ...prev,
      [fingerIndex]: {
        template,
        imageData: processedImageData, // Store the processed image data
        quality,
        timestamp: new Date()
      }
    }));
    setIsCapturing(prev => ({ ...prev, [fingerIndex]: false }));
    
    console.log(`Fingerprint ${fingerIndex + 1} capture completed:`, {
      templateLength: template.length,
      rawImageLength: rawImageData.length,
      processedImageLength: processedImageData.length,
      quality
    });
  }, [processBitmapToImage]);

  const clearFingerprint = useCallback((fingerIndex: number) => {
    setCapturedFingerprints(prev => {
      const { [fingerIndex]: removed, ...rest } = prev;
      return rest;
    });
    setIsCapturing(prev => ({ ...prev, [fingerIndex]: false }));
  }, []);

  const clearAllFingerprints = useCallback(() => {
    setCapturedFingerprints({});
    setIsCapturing({});
  }, []);

  const getFingerprint = useCallback((fingerIndex: number): FingerprintData | null => {
    return capturedFingerprints[fingerIndex] || null;
  }, [capturedFingerprints]);

  const isFingerCapturing = useCallback((fingerIndex: number): boolean => {
    return isCapturing[fingerIndex] || false;
  }, [isCapturing]);

  const getTotalCaptured = useCallback((): number => {
    return Object.keys(capturedFingerprints).length;
  }, [capturedFingerprints]);

  const getAllCapturedData = useCallback(() => {
    const templates: Record<string, string> = {};
    const images: Record<string, string> = {};

    Object.entries(capturedFingerprints).forEach(([index, data]) => {
      const fingerNum = parseInt(index) + 1;
      templates[`finger_${fingerNum}`] = data.template;
      images[`finger_${fingerNum}_image`] = data.imageData;
    });

    return { templates, images };
  }, [capturedFingerprints]);

  return {
    capturedFingerprints,
    isCapturing,
    startCapture,
    completeCapture,
    clearFingerprint,
    clearAllFingerprints,
    getFingerprint,
    isFingerCapturing,
    getTotalCaptured,
    getAllCapturedData
  };
};
