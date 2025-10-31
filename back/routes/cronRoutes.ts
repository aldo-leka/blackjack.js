import { Router } from 'express';
import { dailyRefillTempUsers } from '../controllers/cronController';

const router = Router();

router.post('/daily-refill', dailyRefillTempUsers);

export default router;
