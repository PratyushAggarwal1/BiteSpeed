import { Router } from 'express';
import { identifyContact } from '../controllers/identityController';

const router = Router();

router.post('/identify', identifyContact);

export default router;