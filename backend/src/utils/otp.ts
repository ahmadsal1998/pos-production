/**
 * Generate a random 6-digit OTP code
 * @returns {string} 6-digit OTP code
 */
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Calculate OTP expiration time (10 minutes from now)
 * @returns {Date} Expiration date
 */
export const getOTPExpiration = (): Date => {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes from now
  return expiresAt;
};

