import { Router } from 'express';
import { identifyContact } from '../controllers/identityController'; // Ensure this path is correct

const router = Router();

// POST /api/identify
router.post('/identify', identifyContact);

export default router;
