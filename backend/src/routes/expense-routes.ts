import { Router } from 'express';
import { getMonths, addMonth, getAccounts, addAccount, addTransaction } from '../controllers/expense-controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Secure all data pathways using your authentication gate
router.use(authenticateToken);

router.get('/months', getMonths);
router.post('/months', addMonth);
router.get('/accounts', getAccounts);
router.post('/accounts', addAccount);
router.post('/transactions', addTransaction);

export default router;