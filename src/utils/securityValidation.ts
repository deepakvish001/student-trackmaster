
/**
 * Enhanced server-side validation utilities for security
 */

import { logSecurityEvent, validateFormInput, sanitizeTextInput, sanitizeEmail, sanitizePhoneNumber } from './inputSanitization';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

// Enhanced student data validation with comprehensive security checks
export const validateStudentData = (data: any): ValidationResult => {
  const errors: string[] = [];
  const sanitizedData: any = {};

  try {
    // Validate and sanitize student name with enhanced security
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

    // Validate and sanitize mobile number with enhanced checks
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

    // Enhanced batch ID validation with security checks
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

    // Enhanced email validation (optional field)
    if (data.email && data.email.trim()) {
      const sanitizedEmail = sanitizeEmail(data.email);
      if (!sanitizedEmail) {
        errors.push('Invalid email format');
      } else {
        sanitizedData.email = sanitizedEmail;
      }
    }

    // Enhanced fingerprint validation with security checks
    if (!Array.isArray(data.fingerprints)) {
      errors.push('Fingerprint data must be an array');
    } else if (data.fingerprints.length !== 5) {
      errors.push('Exactly 5 fingerprints are required');
    } else {
      const validFingerprints = data.fingerprints.filter((fp, index) => {
        if (!fp || typeof fp !== 'string') {
          logSecurityEvent('INVALID_FINGERPRINT_DATA', { 
            index, 
            type: typeof fp 
          });
          return false;
        }
        
        // Check for minimum data length (fingerprint templates should be substantial)
        if (fp.length < 100) {
          logSecurityEvent('SUSPICIOUS_FINGERPRINT_SIZE', { 
            index, 
            size: fp.length 
          });
          return false;
        }
        
        return true;
      });
      
      if (validFingerprints.length < 5) {
        errors.push('All 5 fingerprints must be properly captured');
      } else {
        // Store fingerprints in separate fields for database
        sanitizedData.finger_1 = data.fingerprints[0];
        sanitizedData.finger_2 = data.fingerprints[1];
        sanitizedData.finger_3 = data.fingerprints[2];
        sanitizedData.finger_4 = data.fingerprints[3];
        sanitizedData.finger_5 = data.fingerprints[4];
        
        // Store fingerprint images if provided
        if (data.fingerprintImages && Array.isArray(data.fingerprintImages)) {
          sanitizedData.finger_1_image = data.fingerprintImages[0] || null;
          sanitizedData.finger_2_image = data.fingerprintImages[1] || null;
          sanitizedData.finger_3_image = data.fingerprintImages[2] || null;
          sanitizedData.finger_4_image = data.fingerprintImages[3] || null;
          sanitizedData.finger_5_image = data.fingerprintImages[4] || null;
        }
      }
    }

    // Security audit logging
    if (errors.length > 0) {
      logSecurityEvent('STUDENT_VALIDATION_FAILED', { 
        errorCount: errors.length,
        errors: errors.slice(0, 3) // Log first 3 errors only for security
      });
    }

  } catch (error) {
    logSecurityEvent('STUDENT_VALIDATION_ERROR', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    errors.push('Validation error occurred');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? sanitizedData : undefined
  };
};

// Enhanced batch data validation
export const validateBatchData = (data: any): ValidationResult => {
  const errors: string[] = [];
  const sanitizedData: any = {};

  try {
    // Enhanced batch name validation
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

    // Serial number validation
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

    // Max students validation
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
      logSecurityEvent('BATCH_VALIDATION_FAILED', { 
        errorCount: errors.length,
        errors: errors.slice(0, 3)
      });
    }

  } catch (error) {
    logSecurityEvent('BATCH_VALIDATION_ERROR', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    errors.push('Validation error occurred');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? sanitizedData : undefined
  };
};
