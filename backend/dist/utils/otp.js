"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOTPExpiration = exports.generateOTP = void 0;
/**
 * Generate a random 6-digit OTP code
 * @returns {string} 6-digit OTP code
 */
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
exports.generateOTP = generateOTP;
/**
 * Calculate OTP expiration time (10 minutes from now)
 * @returns {Date} Expiration date
 */
const getOTPExpiration = () => {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes from now
    return expiresAt;
};
exports.getOTPExpiration = getOTPExpiration;
