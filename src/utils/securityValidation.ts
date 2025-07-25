
/**
 * Server-side validation utilities for enhanced security
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

// Validate student data with security checks
export const validateStudentData = (data: any): ValidationResult => {
  const errors: string[] = [];
  const sanitizedData: any = {};

  // Validate and sanitize student name
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Student name is required');
  } else {
    const sanitizedName = data.name.trim().replace(/[<>\"'&]/g, '');
    if (sanitizedName.length < 2) {
      errors.push('Student name must be at least 2 characters');
    } else if (sanitizedName.length > 100) {
      errors.push('Student name must not exceed 100 characters');
    } else {
      sanitizedData.name = sanitizedName;
    }
  }

  // Validate and sanitize mobile number
  if (!data.mobile || typeof data.mobile !== 'string') {
    errors.push('Mobile number is required');
  } else {
    const sanitizedMobile = data.mobile.replace(/[^\d+\-\s()]/g, '');
    if (sanitizedMobile.length < 10) {
      errors.push('Mobile number must be at least 10 digits');
    } else if (sanitizedMobile.length > 15) {
      errors.push('Mobile number must not exceed 15 digits');
    } else {
      sanitizedData.mobile = sanitizedMobile;
    }
  }

  // Validate batch ID (UUID format)
  if (!data.batchId || typeof data.batchId !== 'string') {
    errors.push('Batch selection is required');
  } else {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(data.batchId)) {
      errors.push('Invalid batch selection');
    } else {
      sanitizedData.batchId = data.batchId;
    }
  }

  // Validate and sanitize address
  if (!data.address || typeof data.address !== 'string') {
    errors.push('Address is required');
  } else {
    const sanitizedAddress = data.address.trim().replace(/[<>\"']/g, '');
    if (sanitizedAddress.length < 5) {
      errors.push('Address must be at least 5 characters');
    } else if (sanitizedAddress.length > 500) {
      errors.push('Address must not exceed 500 characters');
    } else {
      sanitizedData.address = sanitizedAddress;
    }
  }

  // Validate email if provided
  if (data.email && data.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitizedEmail = data.email.trim().toLowerCase();
    if (!emailRegex.test(sanitizedEmail)) {
      errors.push('Invalid email format');
    } else {
      sanitizedData.email = sanitizedEmail;
    }
  }

  // Validate fingerprints array
  if (!Array.isArray(data.fingerprints) || data.fingerprints.length !== 5) {
    errors.push('All 5 fingerprints are required');
  } else {
    const validFingerprints = data.fingerprints.filter(fp => fp && fp.length > 10);
    if (validFingerprints.length < 5) {
      errors.push('All 5 fingerprints must be captured');
    } else {
      sanitizedData.fingerprints = data.fingerprints;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? sanitizedData : undefined
  };
};

// Validate batch data
export const validateBatchData = (data: any): ValidationResult => {
  const errors: string[] = [];
  const sanitizedData: any = {};

  // Validate batch name
  if (!data.batch_name || typeof data.batch_name !== 'string') {
    errors.push('Batch name is required');
  } else {
    const sanitizedName = data.batch_name.trim().replace(/[<>\"'&]/g, '');
    if (sanitizedName.length < 2) {
      errors.push('Batch name must be at least 2 characters');
    } else {
      sanitizedData.batch_name = sanitizedName;
    }
  }

  // Validate admin name
  if (!data.admin_name || typeof data.admin_name !== 'string') {
    errors.push('Admin name is required');
  } else {
    const sanitizedAdmin = data.admin_name.trim().replace(/[<>\"'&]/g, '');
    if (sanitizedAdmin.length < 2) {
      errors.push('Admin name must be at least 2 characters');
    } else {
      sanitizedData.admin_name = sanitizedAdmin;
    }
  }

  // Validate username
  if (!data.username || typeof data.username !== 'string') {
    errors.push('Username is required');
  } else {
    const sanitizedUsername = data.username.trim().replace(/[^a-zA-Z0-9_]/g, '');
    if (sanitizedUsername.length < 3) {
      errors.push('Username must be at least 3 characters');
    } else {
      sanitizedData.username = sanitizedUsername;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? sanitizedData : undefined
  };
};
