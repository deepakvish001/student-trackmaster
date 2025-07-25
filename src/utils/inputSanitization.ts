
/**
 * Input sanitization utilities for security
 */

// HTML encode function to prevent XSS attacks
export const htmlEncode = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

// Sanitize text input by removing potentially dangerous characters
export const sanitizeTextInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length to prevent buffer overflow
};

// Sanitize email input
export const sanitizeEmail = (email: string): string => {
  if (!email || typeof email !== 'string') return '';
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = email.trim().toLowerCase();
  
  return emailRegex.test(sanitized) ? sanitized : '';
};

// Sanitize phone number (allow only digits, spaces, +, -, (, ))
export const sanitizePhoneNumber = (phone: string): string => {
  if (!phone || typeof phone !== 'string') return '';
  
  return phone.replace(/[^\d\s+\-()]/g, '').trim().substring(0, 20);
};

// Validate and sanitize UUID
export const validateUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Security logging function
export const logSecurityEvent = (event: string, details: any = {}) => {
  console.warn(`[SECURITY] ${event}:`, {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    ...details
  });
};
