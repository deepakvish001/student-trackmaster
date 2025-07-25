
/**
 * Enhanced input sanitization utilities for security
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
    .replace(/data:/gi, '') // Remove data URLs
    .replace(/vbscript:/gi, '') // Remove VBScript
    .substring(0, 1000); // Limit length to prevent buffer overflow
};

// Sanitize email input with enhanced validation
export const sanitizeEmail = (email: string): string => {
  if (!email || typeof email !== 'string') return '';
  
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  const sanitized = email.trim().toLowerCase();
  
  // Additional security checks
  if (sanitized.includes('..') || sanitized.startsWith('.') || sanitized.endsWith('.')) {
    return '';
  }
  
  return emailRegex.test(sanitized) ? sanitized : '';
};

// Enhanced phone number sanitization
export const sanitizePhoneNumber = (phone: string): string => {
  if (!phone || typeof phone !== 'string') return '';
  
  const sanitized = phone.replace(/[^\d\s+\-()]/g, '').trim();
  
  // Check for suspicious patterns
  if (sanitized.length > 20 || sanitized.includes('00000')) {
    logSecurityEvent('SUSPICIOUS_PHONE_INPUT', { input: phone.substring(0, 5) + '***' });
    return '';
  }
  
  return sanitized.substring(0, 20);
};

// Validate and sanitize UUID with enhanced security
export const validateUUID = (uuid: string): boolean => {
  if (!uuid || typeof uuid !== 'string') return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Enhanced security logging function with rate limiting
const logCache = new Map<string, number>();
const LOG_RATE_LIMIT = 10; // Max 10 logs per minute per event type

export const logSecurityEvent = (event: string, details: any = {}) => {
  const now = Date.now();
  const cacheKey = `${event}_${Math.floor(now / 60000)}`; // Group by minute
  
  const currentCount = logCache.get(cacheKey) || 0;
  if (currentCount >= LOG_RATE_LIMIT) {
    return; // Rate limited
  }
  
  logCache.set(cacheKey, currentCount + 1);
  
  // Clean old cache entries
  for (const [key, _] of logCache.entries()) {
    if (parseInt(key.split('_').pop() || '0') < Math.floor(now / 60000) - 5) {
      logCache.delete(key);
    }
  }
  
  console.warn(`[SECURITY] ${event}:`, {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    referrer: document.referrer,
    ...details
  });
};

// Content Security Policy validator
export const validateCSP = (): void => {
  if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
    logSecurityEvent('CSP_MISSING', {});
  }
};

// Input validation with rate limiting
const inputAttempts = new Map<string, number[]>();

export const validateInputWithRateLimit = (
  inputType: string, 
  value: string, 
  maxAttempts: number = 100
): boolean => {
  const now = Date.now();
  const key = `${inputType}_${window.location.pathname}`;
  
  if (!inputAttempts.has(key)) {
    inputAttempts.set(key, []);
  }
  
  const attempts = inputAttempts.get(key)!;
  // Remove attempts older than 1 hour
  const recentAttempts = attempts.filter(time => now - time < 3600000);
  inputAttempts.set(key, recentAttempts);
  
  if (recentAttempts.length >= maxAttempts) {
    logSecurityEvent('INPUT_RATE_LIMIT_EXCEEDED', { 
      inputType, 
      attempts: recentAttempts.length 
    });
    return false;
  }
  
  recentAttempts.push(now);
  return true;
};

// Enhanced form validation with security checks
export const validateFormInput = (fieldName: string, value: any, rules: any): string[] => {
  const errors: string[] = [];
  
  if (!validateInputWithRateLimit(fieldName, String(value))) {
    errors.push('Too many attempts. Please try again later.');
    return errors;
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /data:text\/html/i,
    /vbscript:/i
  ];
  
  const strValue = String(value);
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(strValue)) {
      logSecurityEvent('SUSPICIOUS_INPUT_DETECTED', { 
        fieldName, 
        pattern: pattern.toString(),
        value: strValue.substring(0, 50) + '...'
      });
      errors.push('Invalid input detected');
      return errors;
    }
  }
  
  // Apply standard validation rules
  if (rules.required && (!value || String(value).trim() === '')) {
    errors.push(`${fieldName} is required`);
  }
  
  if (rules.minLength && String(value).length < rules.minLength) {
    errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
  }
  
  if (rules.maxLength && String(value).length > rules.maxLength) {
    errors.push(`${fieldName} must not exceed ${rules.maxLength} characters`);
  }
  
  return errors;
};

// Initialize security monitoring
export const initSecurityMonitoring = (): void => {
  validateCSP();
  
  // Monitor for suspicious activity
  let clickCount = 0;
  let lastClickTime = 0;
  
  document.addEventListener('click', () => {
    const now = Date.now();
    if (now - lastClickTime < 100) { // Clicks faster than 100ms apart
      clickCount++;
      if (clickCount > 20) { // More than 20 rapid clicks
        logSecurityEvent('SUSPICIOUS_CLICK_PATTERN', { clickCount });
      }
    } else {
      clickCount = 0;
    }
    lastClickTime = now;
  });
  
  // Monitor for developer tools
  let devtools = false;
  setInterval(() => {
    if (window.outerHeight - window.innerHeight > 200 || 
        window.outerWidth - window.innerWidth > 200) {
      if (!devtools) {
        devtools = true;
        logSecurityEvent('DEVTOOLS_DETECTED', {});
      }
    } else {
      devtools = false;
    }
  }, 1000);
};
