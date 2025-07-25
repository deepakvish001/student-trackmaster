
// Enhanced MFS100 utilities for real-time fingerprint capture
import { toast } from "sonner";

// Enhanced type definitions
export interface MFS100DeviceStatus {
  isConnected: boolean;
  deviceInfo: DeviceInfo | null;
  lastChecked: Date;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  error?: string;
}

export interface CaptureResult {
  success: boolean;
  imageData?: string;
  template?: string;
  quality?: number;
  error?: string;
}

export interface DeviceInfo {
  SerialNo: string;
  Make: string;
  Model: string;
  Certificate: string;
  Width: number;
  Height: number;
  LocalMac: string;
  LocalIP: string;
  SystemID: string;
  PublicIP: string;
}

// Global device status
let deviceStatus: MFS100DeviceStatus = {
  isConnected: false,
  deviceInfo: null,
  lastChecked: new Date(),
  connectionQuality: 'disconnected'
};

// Enhanced device monitoring with health checks
export const monitorDeviceStatus = (): MFS100DeviceStatus => {
  return deviceStatus;
};

// Enhanced bitmap processing for crystal-clear fingerprint images
export const processHighQualityFingerprint = (
  bitmapData: string, 
  width: number = 256, 
  height: number = 256
): string => {
  try {
    if (!bitmapData || bitmapData.length === 0) {
      console.warn('No bitmap data provided');
      return "";
    }

    console.log(`Processing fingerprint bitmap: ${bitmapData.length} bytes, dimensions: ${width}x${height}`);
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Convert base64 bitmap data to binary
    let binaryData;
    try {
      binaryData = atob(bitmapData);
    } catch (error) {
      console.error('Failed to decode base64 bitmap data:', error);
      return "";
    }

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    // Clear the canvas with white background first
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255;     // Red
      data[i + 1] = 255; // Green
      data[i + 2] = 255; // Blue
      data[i + 3] = 255; // Alpha
    }
    
    // Process each pixel - MFS100 provides raw grayscale bitmap data
    const expectedPixels = width * height;
    const actualDataLength = Math.min(binaryData.length, expectedPixels);
    
    console.log(`Processing ${actualDataLength} pixels out of expected ${expectedPixels}`);
    
    for (let i = 0; i < actualDataLength; i++) {
      let pixelValue = binaryData.charCodeAt(i);
      
      // MFS100 typically returns values where:
      // - 0 = black (ridge)
      // - 255 = white (valley)
      // We want ridges to be dark, so invert if needed
      
      // Apply contrast and brightness enhancement
      pixelValue = Math.min(255, Math.max(0, pixelValue * 1.2));
      
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
    
    // Apply additional sharpening filter for better ridge definition
    ctx.filter = 'contrast(1.5) brightness(1.0) saturate(0)';
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (tempCtx) {
      tempCtx.filter = 'contrast(1.5) brightness(1.0)';
      tempCtx.drawImage(canvas, 0, 0);
      
      // Convert to high-quality PNG data URI
      const result = tempCanvas.toDataURL('image/png', 1.0);
      console.log(`Fingerprint image processed successfully: ${result.substring(0, 50)}...`);
      
      return result;
    } else {
      // Fallback without additional filtering
      const result = canvas.toDataURL('image/png', 1.0);
      console.log(`Fingerprint image processed (no filter): ${result.substring(0, 50)}...`);
      return result;
    }
    
  } catch (error) {
    console.error('Fingerprint bitmap processing error:', error);
    return "";
  }
};

// Improved device connection checker with better error handling
export const checkDeviceConnectionHealth = async (): Promise<MFS100DeviceStatus> => {
  try {
    if (!window.GetMFS100Info) {
      deviceStatus = {
        isConnected: false,
        deviceInfo: null,
        lastChecked: new Date(),
        connectionQuality: 'disconnected',
        error: 'MFS100 SDK not loaded'
      };
      return deviceStatus;
    }

    console.log('Checking device connection...');
    const response = window.GetMFS100Info();
    console.log('Device response:', response);
    const now = new Date();
    
    if (response.httpStaus && response.data?.ErrorCode === "0") {
      const info = response.data.DeviceInfo;
      
      if (info) {
        deviceStatus = {
          isConnected: true,
          deviceInfo: info,
          lastChecked: now,
          connectionQuality: 'excellent'
        };
        console.log('Device health check: Connected', info);
      } else {
        deviceStatus = {
          isConnected: false,
          deviceInfo: null,
          lastChecked: now,
          connectionQuality: 'poor',
          error: 'Device info not available'
        };
      }
    } else {
      const error = response.err || response.data?.ErrorDescription || 'Unknown device error';
      deviceStatus = {
        isConnected: false,
        deviceInfo: null,
        lastChecked: now,
        connectionQuality: 'disconnected',
        error: error
      };
      console.log('Device health check: Disconnected -', error);
    }
    
    return deviceStatus;
  } catch (error) {
    console.error('Device health check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
    deviceStatus = {
      isConnected: false,
      deviceInfo: null,
      lastChecked: new Date(),
      connectionQuality: 'disconnected',
      error: errorMessage
    };
    return deviceStatus;
  }
};

// Enhanced fingerprint capture with proper image processing
export const captureHighQualityFingerprint = async (
  quality: number = 60,
  timeout: number = 30,
  onProgress?: (status: string) => void
): Promise<CaptureResult> => {
  try {
    if (!window.CaptureFinger) {
      return {
        success: false,
        error: 'MFS100 SDK not available. Please ensure the device is connected and drivers are installed.'
      };
    }

    // Check device status first
    const deviceCheck = await checkDeviceConnectionHealth();
    if (!deviceCheck.isConnected) {
      return {
        success: false,
        error: `Device not connected: ${deviceCheck.error || 'Unknown connection issue'}`
      };
    }

    onProgress?.('Activating scanner and preparing for capture...');
    console.log('Starting fingerprint capture with quality:', quality);
    
    const result = window.CaptureFinger(quality, timeout);
    console.log('MFS100 capture result:', result);
    
    if (!result.httpStaus) {
      return {
        success: false,
        error: result.err || 'Failed to communicate with device'
      };
    }
    
    if (result.data?.ErrorCode !== "0") {
      return {
        success: false,
        error: result.data?.ErrorDescription || 'Device capture error'
      };
    }
    
    onProgress?.('Processing captured fingerprint image...');
    
    const captureQuality = result.data.Quality || 0;
    let imageData = "";
    
    // Debug: Log the raw response data structure
    console.log('Raw MFS100 response data:', {
      ErrorCode: result.data.ErrorCode,
      Quality: result.data.Quality,
      BitmapDataLength: result.data.BitmapData ? result.data.BitmapData.length : 'No BitmapData',
      InWidth: result.data.InWidth,
      InHeight: result.data.InHeight,
      IsoTemplateLength: result.data.IsoTemplate ? result.data.IsoTemplate.length : 'No IsoTemplate',
      AllKeys: Object.keys(result.data)
    });
    
    // Process the raw bitmap data from MFS100 into a viewable image
    if (result.data.BitmapData && result.data.BitmapData.length > 0) {
      console.log('Processing bitmap data:', {
        bitmapLength: result.data.BitmapData.length,
        width: result.data.InWidth || 256,
        height: result.data.InHeight || 256,
        firstFewChars: result.data.BitmapData.substring(0, 20)
      });
      
      imageData = processHighQualityFingerprint(
        result.data.BitmapData,
        result.data.InWidth || 256,
        result.data.InHeight || 256
      );
      
      if (imageData) {
        console.log('Fingerprint image processed successfully, data URI length:', imageData.length);
        onProgress?.('Fingerprint image ready for preview');
      } else {
        console.warn('Failed to process fingerprint image');
        onProgress?.('Warning: Image processing failed');
      }
    } else {
      console.warn('No bitmap data received from device');
      return {
        success: false,
        error: 'No fingerprint image data received from device'
      };
    }
    
    return {
      success: true,
      imageData,
      template: result.data.IsoTemplate,
      quality: captureQuality
    };
    
  } catch (error) {
    console.error('Fingerprint capture error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown capture error'
    };
  }
};

// Automatic quality-based capture with better error handling
export const captureWithAutoQuality = async (
  targetQuality: number = 70,
  maxAttempts: number = 3,
  onProgress?: (status: string, attempt?: number) => void
): Promise<CaptureResult> => {
  let lastError = '';
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    onProgress?.(`Attempt ${attempt}/${maxAttempts}...`, attempt);
    
    const result = await captureHighQualityFingerprint(targetQuality, 20, onProgress);
    
    if (result.success && result.quality && result.quality >= targetQuality) {
      onProgress?.(`Success! Quality: ${result.quality}%`);
      return result;
    }
    
    lastError = result.error || `Low quality: ${result.quality}%`;
    
    if (attempt < maxAttempts) {
      onProgress?.(`Quality ${result.quality}% too low. Retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return {
    success: false,
    error: `Failed to capture fingerprint with quality >= ${targetQuality}% after ${maxAttempts} attempts. Last error: ${lastError}`
  };
};
