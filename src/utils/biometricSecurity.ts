
/**
 * Phase 2: Biometric Security Enhancement
 * Advanced security utilities for fingerprint data encryption and validation
 */

import { logSecurityEvent } from './inputSanitization';

// AES-GCM encryption configuration
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256; // bits
const IV_LENGTH = 12; // bytes for GCM
const TAG_LENGTH = 16; // bytes for authentication tag

/**
 * Generate a cryptographically secure random key for AES encryption
 */
export const generateEncryptionKey = async (): Promise<CryptoKey> => {
  try {
    const key = await crypto.subtle.generateKey(
      {
        name: ALGORITHM,
        length: KEY_LENGTH,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
    
    logSecurityEvent('ENCRYPTION_KEY_GENERATED', { 
      algorithm: ALGORITHM,
      keyLength: KEY_LENGTH 
    });
    
    return key;
  } catch (error) {
    logSecurityEvent('ENCRYPTION_KEY_GENERATION_FAILED', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw new Error('Failed to generate encryption key');
  }
};

/**
 * Import encryption key from base64 string
 */
export const importEncryptionKey = async (keyData: string): Promise<CryptoKey> => {
  try {
    const keyBuffer = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      {
        name: ALGORITHM,
        length: KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt']
    );
    
    return key;
  } catch (error) {
    logSecurityEvent('ENCRYPTION_KEY_IMPORT_FAILED', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw new Error('Failed to import encryption key');
  }
};

/**
 * Export encryption key to base64 string for storage
 */
export const exportEncryptionKey = async (key: CryptoKey): Promise<string> => {
  try {
    const keyBuffer = await crypto.subtle.exportKey('raw', key);
    const keyArray = new Uint8Array(keyBuffer);
    return btoa(String.fromCharCode(...keyArray));
  } catch (error) {
    logSecurityEvent('ENCRYPTION_KEY_EXPORT_FAILED', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw new Error('Failed to export encryption key');
  }
};

/**
 * Encrypt fingerprint template using AES-GCM
 */
export const encryptFingerprintData = async (
  data: string, 
  key: CryptoKey,
  metadata?: { fingerId: number; userId: string }
): Promise<{
  encryptedData: string;
  iv: string;
  authTag: string;
  timestamp: number;
}> => {
  try {
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    // Convert string to ArrayBuffer
    const dataBuffer = new TextEncoder().encode(data);
    
    // Add metadata to additional authenticated data (AAD)
    const aad = metadata ? 
      new TextEncoder().encode(JSON.stringify(metadata)) : 
      new Uint8Array(0);
    
    // Encrypt the data
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
        additionalData: aad.length > 0 ? aad : undefined,
        tagLength: TAG_LENGTH * 8, // Convert bytes to bits
      },
      key,
      dataBuffer
    );
    
    // Extract encrypted data and auth tag
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const encryptedData = encryptedArray.slice(0, -TAG_LENGTH);
    const authTag = encryptedArray.slice(-TAG_LENGTH);
    
    const result = {
      encryptedData: btoa(String.fromCharCode(...encryptedData)),
      iv: btoa(String.fromCharCode(...iv)),
      authTag: btoa(String.fromCharCode(...authTag)),
      timestamp: Date.now()
    };
    
    logSecurityEvent('BIOMETRIC_DATA_ENCRYPTED', {
      fingerId: metadata?.fingerId,
      userId: metadata?.userId,
      dataSize: data.length,
      timestamp: result.timestamp
    });
    
    return result;
  } catch (error) {
    logSecurityEvent('BIOMETRIC_ENCRYPTION_FAILED', {
      error: error instanceof Error ? error.message : 'Unknown error',
      fingerId: metadata?.fingerId,
      userId: metadata?.userId
    });
    throw new Error('Failed to encrypt biometric data');
  }
};

/**
 * Decrypt fingerprint template using AES-GCM
 */
export const decryptFingerprintData = async (
  encryptedData: string,
  iv: string,
  authTag: string,
  key: CryptoKey,
  metadata?: { fingerId: number; userId: string }
): Promise<string> => {
  try {
    // Convert base64 to ArrayBuffer
    const dataArray = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const ivArray = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
    const tagArray = Uint8Array.from(atob(authTag), c => c.charCodeAt(0));
    
    // Combine encrypted data and auth tag
    const combinedBuffer = new Uint8Array(dataArray.length + tagArray.length);
    combinedBuffer.set(dataArray);
    combinedBuffer.set(tagArray, dataArray.length);
    
    // Add metadata to additional authenticated data (AAD)
    const aad = metadata ? 
      new TextEncoder().encode(JSON.stringify(metadata)) : 
      new Uint8Array(0);
    
    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: ivArray,
        additionalData: aad.length > 0 ? aad : undefined,
        tagLength: TAG_LENGTH * 8, // Convert bytes to bits
      },
      key,
      combinedBuffer
    );
    
    const decryptedData = new TextDecoder().decode(decryptedBuffer);
    
    logSecurityEvent('BIOMETRIC_DATA_DECRYPTED', {
      fingerId: metadata?.fingerId,
      userId: metadata?.userId,
      dataSize: decryptedData.length
    });
    
    return decryptedData;
  } catch (error) {
    logSecurityEvent('BIOMETRIC_DECRYPTION_FAILED', {
      error: error instanceof Error ? error.message : 'Unknown error',
      fingerId: metadata?.fingerId,
      userId: metadata?.userId
    });
    throw new Error('Failed to decrypt biometric data');
  }
};

/**
 * Validate fingerprint template integrity and format
 */
export const validateFingerprintTemplate = (template: string): {
  isValid: boolean;
  quality: number;
  format: string;
  errors: string[];
} => {
  const errors: string[] = [];
  let quality = 0;
  let format = 'unknown';
  
  try {
    // Basic validation
    if (!template || typeof template !== 'string') {
      errors.push('Invalid template format');
      return { isValid: false, quality: 0, format, errors };
    }
    
    // Check minimum length (ISO templates should be substantial)
    if (template.length < 100) {
      errors.push('Template data too short');
    }
    
    // Detect template format and validate
    if (template.startsWith('iVBOR') || template.startsWith('data:image/png')) {
      format = 'PNG Image';
      quality = 50; // Default quality for images
    } else if (template.startsWith('/9j/') || template.startsWith('data:image/jpeg')) {
      format = 'JPEG Image';
      quality = 50;
    } else if (template.startsWith('Qk0') || template.includes('BitmapData')) {
      // This is bitmap data from MFS100 scanner
      format = 'MFS100 Bitmap';
      quality = 60; // Good quality for scanner bitmap
    } else if (template.length >= 100 && template.includes('_quality_')) {
      // This is our enhanced capture format with quality info
      format = 'Enhanced MFS100 Template';
      const qualityMatch = template.match(/_quality_(\d+)_/);
      quality = qualityMatch ? parseInt(qualityMatch[1]) : 60;
    } else if (template.length > 500 && !template.includes('data:')) {
      format = 'ISO Template';
      // Estimate quality based on template characteristics
      quality = Math.min(90, Math.max(30, Math.floor(template.length / 20)));
    } else if (template.length >= 100) {
      // Accept any template with sufficient length
      format = 'Base64 Template Data';
      quality = 50;
    } else {
      format = 'Unknown';
      quality = 10;
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /data:text\/html/i,
      /eval\(/i,
      /function\(/i
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(template)) {
        errors.push('Suspicious content detected in template');
        logSecurityEvent('SUSPICIOUS_BIOMETRIC_TEMPLATE', {
          pattern: pattern.toString(),
          templatePreview: template.substring(0, 50)
        });
        break;
      }
    }
    
    // Additional security checks
    if (template.length > 100000) { // 100KB limit
      errors.push('Template data exceeds size limit');
    }
    
    
    console.log('🔍 Fingerprint Template Validation:', {
      templateLength: template.length,
      format,
      quality,
      errors: errors.length > 0 ? errors : 'none',
      templatePreview: template.substring(0, 100) + '...',
      isValid: errors.length === 0
    });
    
    logSecurityEvent('BIOMETRIC_TEMPLATE_VALIDATED', {
      format,
      quality,
      templateSize: template.length,
      isValid: errors.length === 0
    });
    
    return {
      isValid: errors.length === 0,
      quality: Math.max(0, Math.min(100, quality)),
      format,
      errors
    };
    
  } catch (error) {
    logSecurityEvent('BIOMETRIC_VALIDATION_ERROR', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    errors.push('Validation error occurred');
    return { isValid: false, quality: 0, format, errors };
  }
};

/**
 * Generate secure hash for fingerprint matching
 */
export const generateFingerprintHash = async (template: string): Promise<string> => {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(template);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    const hashHex = Array.from(hashArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    logSecurityEvent('BIOMETRIC_HASH_GENERATED', {
      templateSize: template.length,
      hashLength: hashHex.length
    });
    
    return hashHex;
  } catch (error) {
    logSecurityEvent('BIOMETRIC_HASH_GENERATION_FAILED', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw new Error('Failed to generate fingerprint hash');
  }
};

/**
 * Audit biometric data access
 */
export const auditBiometricAccess = (action: string, details: {
  userId?: string;
  fingerId?: number;
  studentId?: string;
  success: boolean;
  metadata?: any;
  [key: string]: any; // Allow additional properties
}) => {
  logSecurityEvent(`BIOMETRIC_AUDIT_${action.toUpperCase()}`, {
    action,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    sessionId: sessionStorage.getItem('session_id') || 'unknown',
    ...details
  });
};
