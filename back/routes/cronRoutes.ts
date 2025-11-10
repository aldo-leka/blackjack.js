import { Router } from 'express';
import { refillUsers } from '../controllers/cronController';

const router = Router();

router.post('/refill', refillUsers);

export default router;
