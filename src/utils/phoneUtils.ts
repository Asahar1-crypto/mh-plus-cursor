import { parsePhoneNumber, PhoneNumber } from 'libphonenumber-js';

/**
 * Phone number normalization and validation utility for Israeli phone numbers
 */

export interface PhoneNumberInfo {
  e164: string;
  national: string;
  type: 'mobile' | 'fixed' | 'voip' | 'special' | null;
  isValid: boolean;
  extension?: string;
  raw: string;
}

export interface PhoneValidationResult {
  success: boolean;
  data?: PhoneNumberInfo;
  error?: string;
}

/**
 * Normalize Israeli phone number to E.164 format
 */
export function normalizeILPhoneNumber(input: string): PhoneValidationResult {
  try {
    // Store original input
    const rawInput = input.trim();

    // Pre-clean: handle common patterns
    let cleaned = rawInput
      .replace(/^\s*00/, '+')           // 00972 -> +972
      .replace(/[^\d+]/g, '');         // Remove all non-digits except +

    // Handle Israeli local format (starting with 0)
    if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
      cleaned = '+972' + cleaned.substring(1);
    }
    
    // Handle Israeli international without + (starting with 972)
    if (cleaned.startsWith('972') && !cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    // Handle special numbers (emergency, service numbers)
    if (isSpecialNumber(rawInput)) {
      return {
        success: true,
        data: {
          e164: rawInput,
          national: rawInput,
          type: 'special',
          isValid: true,
          raw: rawInput
        }
      };
    }

    // Parse with libphonenumber-js
    const phoneNumber = parsePhoneNumber(cleaned, 'IL');
    
    if (!phoneNumber || !phoneNumber.isValid()) {
      return {
        success: false,
        error: 'מספר טלפון לא תקין'
      };
    }

    // Determine phone type
    const type = getPhoneType(phoneNumber);

    return {
      success: true,
      data: {
        e164: phoneNumber.number,
        national: phoneNumber.nationalNumber,
        type,
        isValid: true,
        raw: rawInput
      }
    };

  } catch (error) {
    console.error('Phone normalization error:', error);
    return {
      success: false,
      error: 'שגיאה בעיבוד מספר הטלפון'
    };
  }
}

/**
 * Format phone number for display
 */
export function formatPhoneForDisplay(e164: string, locale: 'IL' | 'international' = 'IL'): string {
  try {
    if (isSpecialNumber(e164)) {
      return e164;
    }

    const phoneNumber = parsePhoneNumber(e164);
    if (!phoneNumber) return e164;

    if (locale === 'IL') {
      // Format for Israeli display: 054-1234567, 03-1234567
      const national = phoneNumber.nationalNumber;
      if (national.length === 9 && national.startsWith('5')) {
        // Mobile: 054-1234567
        return `0${national.substring(0, 2)}-${national.substring(2)}`;
      } else if (national.length === 8) {
        // Fixed line: 03-1234567
        return `0${national.substring(0, 1)}-${national.substring(1)}`;
      } else if (national.length === 9 && national.startsWith('7')) {
        // VoIP: 077-1234567
        return `0${national.substring(0, 2)}-${national.substring(2)}`;
      }
      // Default national format
      return phoneNumber.formatNational();
    } else {
      // International format: +972 54-1234567
      return phoneNumber.formatInternational();
    }
  } catch (error) {
    console.error('Phone formatting error:', error);
    return e164;
  }
}

/**
 * Check if number is a special service number
 */
function isSpecialNumber(input: string): boolean {
  const cleaned = input.replace(/[^\d]/g, '');
  
  // Emergency and service numbers
  const specialPatterns = [
    /^1\d{2,3}$/,        // 100, 101, 102, etc.
    /^1700\d{6}$/,       // 1-700 numbers
    /^1800\d{6}$/,       // 1-800 numbers
    /^120\d?$/,          // 120, 1201, etc.
    /^144$/,             // 144
    /^199$/              // 199
  ];

  return specialPatterns.some(pattern => pattern.test(cleaned));
}

/**
 * Determine phone type from parsed number
 */
function getPhoneType(phoneNumber: PhoneNumber): 'mobile' | 'fixed' | 'voip' | null {
  const national = phoneNumber.nationalNumber;
  
  if (national.length === 9) {
    const prefix = national.substring(0, 2);
    if (['50', '52', '53', '54', '55', '56', '57', '58'].includes(prefix)) {
      return 'mobile';
    }
    if (['72', '73', '74', '75', '76', '77', '78', '79'].includes(prefix)) {
      return 'voip';
    }
  }
  
  if (national.length === 8) {
    const prefix = national.substring(0, 1);
    if (['2', '3', '4', '8', '9'].includes(prefix)) {
      return 'fixed';
    }
  }

  return null;
}

/**
 * Validate phone number for specific use cases
 */
export function validatePhoneNumber(input: string): PhoneValidationResult {
  const result = normalizeILPhoneNumber(input);
  
  if (!result.success) {
    return result;
  }

  // Additional business logic validations can be added here
  return result;
}

/**
 * Check if two phone numbers are the same (comparing E.164 format)
 */
export function arePhoneNumbersEqual(phone1: string, phone2: string): boolean {
  const result1 = normalizeILPhoneNumber(phone1);
  const result2 = normalizeILPhoneNumber(phone2);
  
  if (!result1.success || !result2.success) {
    return false;
  }
  
  return result1.data!.e164 === result2.data!.e164;
}