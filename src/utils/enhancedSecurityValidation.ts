
/**
 * Phase 2: Enhanced Security Validation with Biometric Integration
 * Advanced validation for biometric systems with encryption support
 */

import { validateFingerprintTemplate, auditBiometricAccess } from './biometricSecurity';
import { logSecurityEvent, validateFormInput, sanitizeTextInput, sanitizeEmail, sanitizePhoneNumber } from './inputSanitization';

export interface BiometricValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
  biometricSummary?: {
    validFingerprints: number;
    totalQuality: number;
    averageQuality: number;
    securityLevel: 'low' | 'medium' | 'high';
  };
}

/**
 * Enhanced student data validation with biometric security
 */
export const validateStudentDataWithBiometrics = async (data: any): Promise<BiometricValidationResult> => {
  const errors: string[] = [];
  const sanitizedData: any = {};
  let validFingerprints = 0;
  let totalQuality = 0;

  try {
    // Basic field validation (reusing existing logic)
    const nameValidation = validateFormInput('name', data.name, {
      required: true,
      minLength: 2,
      maxLength: 100
    });
    
    if (nameValidation.length > 0) {
      errors.push(...nameValidation);
    } else {
      const sanitizedName = sanitizeTextInput(data.name);
      if (sanitizedName.length < 2) {
        errors.push('Student name must be at least 2 characters after sanitization');
      } else {
        sanitizedData.student_name = sanitizedName;
      }
    }

    // Enhanced mobile validation
    const mobileValidation = validateFormInput('mobile', data.mobile, {
      required: true,
      minLength: 10,
      maxLength: 15
    });
    
    if (mobileValidation.length > 0) {
      errors.push(...mobileValidation);
    } else {
      const sanitizedMobile = sanitizePhoneNumber(data.mobile);
      if (!sanitizedMobile || sanitizedMobile.length < 10) {
        errors.push('Valid mobile number is required');
      } else {
        sanitizedData.mobile = sanitizedMobile;
      }
    }

    // Enhanced batch ID validation
    if (!data.batchId || typeof data.batchId !== 'string') {
      errors.push('Batch selection is required');
    } else {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(data.batchId)) {
        logSecurityEvent('INVALID_BATCH_ID_FORMAT', { 
          batchId: data.batchId.substring(0, 8) + '...' 
        });
        errors.push('Invalid batch selection format');
      } else {
        sanitizedData.batch_id = data.batchId;
      }
    }

    // Enhanced address validation
    const addressValidation = validateFormInput('address', data.address, {
      required: true,
      minLength: 5,
      maxLength: 500
    });
    
    if (addressValidation.length > 0) {
      errors.push(...addressValidation);
    } else {
      const sanitizedAddress = sanitizeTextInput(data.address);
      if (sanitizedAddress.length < 5) {
        errors.push('Address must be at least 5 characters after sanitization');
      } else {
        sanitizedData.address = sanitizedAddress;
      }
    }

    // Enhanced email validation (optional)
    if (data.email && data.email.trim()) {
      const sanitizedEmail = sanitizeEmail(data.email);
      if (!sanitizedEmail) {
        errors.push('Invalid email format');
      } else {
        sanitizedData.email = sanitizedEmail;
      }
    }

    // Advanced biometric validation with security checks
    if (!Array.isArray(data.fingerprints)) {
      errors.push('Fingerprint data must be an array');
      auditBiometricAccess('VALIDATION_FAILED', {
        reason: 'Invalid fingerprint array format',
        success: false
      });
    } else if (data.fingerprints.length !== 5) {
      errors.push('Exactly 5 fingerprints are required');
      auditBiometricAccess('VALIDATION_FAILED', {
        reason: `Invalid fingerprint count: ${data.fingerprints.length}`,
        success: false
      });
    } else {
      // Validate each fingerprint with advanced security checks
      for (let i = 0; i < 5; i++) {
        const fingerprint = data.fingerprints[i];
        
        if (!fingerprint || typeof fingerprint !== 'string') {
          logSecurityEvent('INVALID_FINGERPRINT_DATA', { 
            index: i, 
            type: typeof fingerprint 
          });
          continue;
        }

        // Advanced template validation
        const validation = validateFingerprintTemplate(fingerprint);
        
        if (validation.isValid) {
          validFingerprints++;
          totalQuality += validation.quality;
          
          // Store validated fingerprint data
          sanitizedData[`finger_${i + 1}`] = fingerprint;
          
          auditBiometricAccess('FINGERPRINT_VALIDATED', {
            fingerId: i + 1,
            quality: validation.quality,
            format: validation.format,
            success: true
          });
        } else {
          logSecurityEvent('FINGERPRINT_VALIDATION_FAILED', {
            fingerId: i + 1,
            errors: validation.errors,
            quality: validation.quality
          });
          
          auditBiometricAccess('FINGERPRINT_VALIDATION_FAILED', {
            fingerId: i + 1,
            errors: validation.errors,
            success: false
          });
        }
      }

      // Store fingerprint images if provided
      if (data.fingerprintImages && Array.isArray(data.fingerprintImages)) {
        for (let i = 0; i < 5; i++) {
          if (data.fingerprintImages[i]) {
            sanitizedData[`finger_${i + 1}_image`] = data.fingerprintImages[i];
          }
        }
      }

      // Check minimum fingerprint requirement
      if (validFingerprints < 5) {
        errors.push(`All 5 fingerprints must be properly captured. Valid: ${validFingerprints}/5`);
      }
    }

    // Calculate security metrics
    const averageQuality = validFingerprints > 0 ? totalQuality / validFingerprints : 0;
    const securityLevel: 'low' | 'medium' | 'high' = 
      averageQuality >= 80 && validFingerprints === 5 ? 'high' :
      averageQuality >= 60 && validFingerprints >= 4 ? 'medium' : 'low';

    const biometricSummary = {
      validFingerprints,
      totalQuality,
      averageQuality: Math.round(averageQuality),
      securityLevel
    };

    // Security audit logging
    if (errors.length > 0) {
      logSecurityEvent('STUDENT_BIOMETRIC_VALIDATION_FAILED', { 
        errorCount: errors.length,
        errors: errors.slice(0, 3), // Log first 3 errors only for security
        biometricSummary
      });
    } else {
      logSecurityEvent('STUDENT_BIOMETRIC_VALIDATION_SUCCESS', {
        biometricSummary,
        securityLevel
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined,
      biometricSummary
    };

  } catch (error) {
    logSecurityEvent('STUDENT_BIOMETRIC_VALIDATION_ERROR', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    errors.push('Biometric validation error occurred');
    
    return {
      isValid: false,
      errors,
      biometricSummary: {
        validFingerprints: 0,
        totalQuality: 0,
        averageQuality: 0,
        securityLevel: 'low'
      }
    };
  }
};

/**
 * Enhanced batch validation with security audit
 */
export const validateBatchDataWithSecurity = (data: any): BiometricValidationResult => {
  const errors: string[] = [];
  const sanitizedData: any = {};

  try {
    // Enhanced batch name validation with security patterns
    const nameValidation = validateFormInput('batch_name', data.batch_name, {
      required: true,
      minLength: 2,
      maxLength: 100
    });
    
    if (nameValidation.length > 0) {
      errors.push(...nameValidation);
    } else {
      const sanitizedName = sanitizeTextInput(data.batch_name);
      if (sanitizedName.length < 2) {
        errors.push('Batch name must be at least 2 characters after sanitization');
      } else {
        sanitizedData.batch_name = sanitizedName;
      }
    }

    // Enhanced admin name validation
    const adminValidation = validateFormInput('admin_name', data.admin_name, {
      required: true,
      minLength: 2,
      maxLength: 100
    });
    
    if (adminValidation.length > 0) {
      errors.push(...adminValidation);
    } else {
      const sanitizedAdmin = sanitizeTextInput(data.admin_name);
      if (sanitizedAdmin.length < 2) {
        errors.push('Admin name must be at least 2 characters after sanitization');
      } else {
        sanitizedData.admin_name = sanitizedAdmin;
      }
    }

    // Enhanced username validation with security patterns
    const usernameValidation = validateFormInput('username', data.username, {
      required: true,
      minLength: 3,
      maxLength: 50
    });
    
    if (usernameValidation.length > 0) {
      errors.push(...usernameValidation);
    } else {
      // Username should only contain alphanumeric and underscore
      const sanitizedUsername = data.username.trim().replace(/[^a-zA-Z0-9_]/g, '');
      if (sanitizedUsername.length < 3) {
        errors.push('Username must be at least 3 characters and contain only letters, numbers, and underscores');
      } else if (sanitizedUsername !== data.username.trim()) {
        logSecurityEvent('USERNAME_SANITIZED', { 
          original: data.username.substring(0, 5) + '...',
          sanitized: sanitizedUsername.substring(0, 5) + '...'
        });
        sanitizedData.username = sanitizedUsername;
      } else {
        sanitizedData.username = sanitizedUsername;
      }
    }

    // Additional validations (serial number, max students) - keeping existing logic
    if (data.serial_number !== undefined) {
      const serialValidation = validateFormInput('serial_number', data.serial_number, {
        required: false,
        maxLength: 50
      });
      
      if (serialValidation.length > 0) {
        errors.push(...serialValidation);
      } else if (data.serial_number) {
        sanitizedData.serial_number = sanitizeTextInput(String(data.serial_number));
      }
    }

    if (data.max_students !== undefined) {
      const maxStudents = Number(data.max_students);
      if (isNaN(maxStudents) || maxStudents < 1 || maxStudents > 10000) {
        errors.push('Maximum students must be between 1 and 10000');
      } else {
        sanitizedData.max_students = maxStudents;
      }
    }

    // Security audit logging
    if (errors.length > 0) {
      logSecurityEvent('BATCH_SECURITY_VALIDATION_FAILED', { 
        errorCount: errors.length,
        errors: errors.slice(0, 3)
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined
    };

  } catch (error) {
    logSecurityEvent('BATCH_SECURITY_VALIDATION_ERROR', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    errors.push('Security validation error occurred');
    
    return {
      isValid: false,
      errors
    };
  }
};
