/**
 * Infrastructure layer: cross-cutting concerns (logging, cache, email, auth tokens).
 * Use these from services and controllers; domain helpers remain in utils/.
 */
export { log } from './logger';
export { default as logger } from './logger';

export {
  initRedis,
  getRedisClient,
  getRedisClientSync,
  closeRedis,
  isRedisAvailable,
  getRedisStatus,
  cache,
} from './redis';

export { sendOTPEmail } from './email';

export { generateToken, generateRefreshToken, verifyToken, verifyRefreshToken } from './jwt';

export { generateOTP, getOTPExpiration } from './otp';
