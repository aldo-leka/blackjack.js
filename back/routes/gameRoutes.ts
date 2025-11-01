import { Router } from 'express';
import { getRoomsAscii } from '../controllers/gameController';

const router = Router();

router.get('/rooms', getRoomsAscii);

export default router;
