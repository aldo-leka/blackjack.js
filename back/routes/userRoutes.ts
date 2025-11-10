import { Router } from 'express';
import { getUser } from '../controllers/userController';

const router = Router();

router.get('/:email', getUser);

export default router;
