import { Router } from 'express';
import { getRoomsAscii, getLogs } from '../controllers/gameController';

const router = Router();

router.get('/rooms', getRoomsAscii);
router.get('/logs', getLogs);

export default router;
