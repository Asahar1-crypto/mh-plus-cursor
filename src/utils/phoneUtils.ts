import { parsePhoneNumber, PhoneNumber, CountryCode } from 'libphonenumber-js';

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
  countryCode?: CountryCode;
}

/**
 * Normalize phone number to E.164 format with international support
 */
export function normalizePhoneNumber(input: string, defaultCountry: CountryCode = 'IL'): PhoneValidationResult {
  try {
    // Store original input
    const rawInput = input.trim();

    // Pre-clean: handle common patterns
    let cleaned = rawInput
      .replace(/^\s*00/, '+')           // 00972 -> +972
      .replace(/[^\d+]/g, '');         // Remove all non-digits except +

    // Handle country-specific local formats
    if (defaultCountry === 'IL') {
      // Handle Israeli local format (starting with 0)
      if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
        cleaned = '+972' + cleaned.substring(1);
      }
      
      // Handle Israeli international without + (starting with 972)
      if (cleaned.startsWith('972') && !cleaned.startsWith('+')) {
        cleaned = '+' + cleaned;
      }
    }

    // Handle special numbers (emergency, service numbers) - only for IL
    if (defaultCountry === 'IL' && isSpecialNumber(rawInput)) {
      return {
        success: true,
        data: {
          e164: rawInput,
          national: rawInput,
          type: 'special',
          isValid: true,
          raw: rawInput
        },
        countryCode: 'IL'
      };
    }

    // Parse with libphonenumber-js
    const phoneNumber = parsePhoneNumber(cleaned, defaultCountry);
    
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
      },
      countryCode: phoneNumber.country || defaultCountry
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
 * Legacy function - use normalizePhoneNumber instead
 */
export function normalizeILPhoneNumber(input: string): PhoneValidationResult {
  return normalizePhoneNumber(input, 'IL');
}

/**
 * Format phone number for display
 */
export function formatPhoneForDisplay(e164: string, locale: 'local' | 'international' = 'local', defaultCountry: CountryCode = 'IL'): string {
  try {
    if (isSpecialNumber(e164)) {
      return e164;
    }

    const phoneNumber = parsePhoneNumber(e164);
    if (!phoneNumber) return e164;

    const phoneCountry = phoneNumber.country;
    
    if (locale === 'local') {
      // For local display, show national format for same country, international for others
      if (phoneCountry === defaultCountry) {
        if (defaultCountry === 'IL') {
          // Special Israeli formatting: 054-1234567, 03-1234567
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
        }
        // Default national format for current country
        return phoneNumber.formatNational();
      } else {
        // International format for foreign numbers
        return phoneNumber.formatInternational();
      }
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
export function validatePhoneNumber(input: string, defaultCountry: CountryCode = 'IL'): PhoneValidationResult {
  const result = normalizePhoneNumber(input, defaultCountry);
  
  if (!result.success) {
    return result;
  }

  // Additional business logic validations can be added here
  return result;
}

/**
 * Check if two phone numbers are the same (comparing E.164 format)
 */
export function arePhoneNumbersEqual(phone1: string, phone2: string, defaultCountry: CountryCode = 'IL'): boolean {
  const result1 = normalizePhoneNumber(phone1, defaultCountry);
  const result2 = normalizePhoneNumber(phone2, defaultCountry);
  
  if (!result1.success || !result2.success) {
    return false;
  }
  
  return result1.data!.e164 === result2.data!.e164;
}

/**
 * Get common countries for country selection
 */
export function getCommonCountries(): Array<{ 
  code: CountryCode; 
  name: string; 
  flag: string; 
  callingCode: string; 
  nameHe?: string;
}> {
  return [
    { code: 'IL', name: 'Israel', nameHe: 'ישראל', flag: '🇮🇱', callingCode: '+972' },
    { code: 'US', name: 'United States', nameHe: 'ארצות הברית', flag: '🇺🇸', callingCode: '+1' },
    { code: 'GB', name: 'United Kingdom', nameHe: 'בריטניה', flag: '🇬🇧', callingCode: '+44' },
    { code: 'DE', name: 'Germany', nameHe: 'גרמניה', flag: '🇩🇪', callingCode: '+49' },
    { code: 'FR', name: 'France', nameHe: 'צרפת', flag: '🇫🇷', callingCode: '+33' },
    { code: 'CA', name: 'Canada', nameHe: 'קנדה', flag: '🇨🇦', callingCode: '+1' },
    { code: 'AU', name: 'Australia', nameHe: 'אוסטרליה', flag: '🇦🇺', callingCode: '+61' },
    { code: 'NL', name: 'Netherlands', nameHe: 'הולנד', flag: '🇳🇱', callingCode: '+31' },
    { code: 'ES', name: 'Spain', nameHe: 'ספרד', flag: '🇪🇸', callingCode: '+34' },
    { code: 'IT', name: 'Italy', nameHe: 'איטליה', flag: '🇮🇹', callingCode: '+39' },
  ];
}