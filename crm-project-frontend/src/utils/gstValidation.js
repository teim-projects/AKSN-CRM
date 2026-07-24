/**
 * GST Number Validation Utility
 * 
 * GST Format: 2 digits (state code) + 10 characters (PAN) + 1 digit (entity number) + 1 letter (Z) + 1 digit (check digit)
 * Example: 22AAAAA0000A1Z5
 */

/**
 * Validates GST number format and PAN within it
 * @param {string} gstNumber - The GST number to validate
 * @param {string} panNumber - Optional PAN number to cross-validate
 * @returns {object} - { isValid: boolean, error: string|null, panFromGST: string|null }
 */
export const validateGSTNumber = (gstNumber, panNumber = null) => {
  if (!gstNumber || typeof gstNumber !== 'string') {
    return { isValid: false, error: "GST number is required", panFromGST: null };
  }

  const gst = gstNumber.trim().toUpperCase();

  // Check length
  if (gst.length !== 15) {
    return { isValid: false, error: "GST must be exactly 15 characters", panFromGST: null };
  }

  // Validate GST format using regex
  // Pattern: 2 digits + 5 letters + 4 digits + 1 letter + 1 alphanumeric + 1 'Z' + 1 alphanumeric
  const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
  
  if (!gstPattern.test(gst)) {
    return { 
      isValid: false, 
      error: "Invalid GST format. Expected: 22AAAAA0000A1Z5", 
      panFromGST: null 
    };
  }

  // Extract PAN from GST (characters 2-12, 0-indexed)
  const panFromGST = gst.substring(2, 12);
  
  // Validate PAN format within GST
  const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panPattern.test(panFromGST)) {
    return { 
      isValid: false, 
      error: "Invalid PAN format within GST number", 
      panFromGST: null 
    };
  }

  // Cross-validate with provided PAN if available
  if (panNumber && panNumber.trim().toUpperCase() !== panFromGST) {
    return { 
      isValid: false, 
      error: "PAN number doesn't match the PAN in GST number", 
      panFromGST 
    };
  }

  return { isValid: true, error: null, panFromGST };
};

/**
 * Validates PAN number format
 * @param {string} panNumber - The PAN number to validate
 * @returns {object} - { isValid: boolean, error: string|null }
 */
export const validatePANNumber = (panNumber) => {
  if (!panNumber || typeof panNumber !== 'string') {
    return { isValid: false, error: "PAN number is required" };
  }

  const pan = panNumber.trim().toUpperCase();

  // Check length
  if (pan.length !== 10) {
    return { isValid: false, error: "PAN must be exactly 10 characters" };
  }

  // Validate PAN format: 5 letters + 4 digits + 1 letter
  const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  
  if (!panPattern.test(pan)) {
    return { 
      isValid: false, 
      error: "Invalid PAN format. Expected: ABCDE1234F" 
    };
  }

  return { isValid: true, error: null };
};

/**
 * Extract state code from GST number
 * @param {string} gstNumber - The GST number
 * @returns {string|null} - State code or null if invalid
 */
export const getStateCodeFromGST = (gstNumber) => {
  if (!gstNumber || gstNumber.length < 2) {
    return null;
  }
  
  return gstNumber.substring(0, 2);
};

/**
 * Extract PAN from GST number
 * @param {string} gstNumber - The GST number
 * @returns {string|null} - PAN or null if invalid
 */
export const getPANFromGST = (gstNumber) => {
  if (!gstNumber || gstNumber.length < 12) {
    return null;
  }
  
  return gstNumber.substring(2, 12);
};

/**
 * Format GST number (convert to uppercase and remove spaces)
 * @param {string} gstNumber - The GST number to format
 * @returns {string} - Formatted GST number
 */
export const formatGSTNumber = (gstNumber) => {
  if (!gstNumber) return '';
  return gstNumber.replace(/\s/g, '').toUpperCase();
};

/**
 * Format PAN number (convert to uppercase and remove spaces)
 * @param {string} panNumber - The PAN number to format
 * @returns {string} - Formatted PAN number
 */
export const formatPANNumber = (panNumber) => {
  if (!panNumber) return '';
  return panNumber.replace(/\s/g, '').toUpperCase();
};