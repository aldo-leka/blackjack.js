import { Router } from 'express';
import { getRoomsAscii, getLogs, getTopPlayers } from '../controllers/gameController';

const router = Router();

router.get('/rooms', getRoomsAscii);
router.get('/logs', getLogs);
router.get('/leaderboard', getTopPlayers);

export default router;
