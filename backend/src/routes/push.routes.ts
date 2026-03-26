import { Router } from 'express';
import { getVapidPublicKeyHandler, subscribePush, unsubscribePush } from '../controllers/push.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/vapid-public-key', getVapidPublicKeyHandler);

router.post('/subscribe', authenticate, subscribePush);
router.post('/unsubscribe', authenticate, unsubscribePush);

export default router;
