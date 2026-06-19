import { Router } from 'express';
import { compareSync, hashSync } from 'bcryptjs';
import { db } from '../db.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  (req as any).session.user = { id: user.id, email: user.email, role: user.role };

  return res.json({ user: { id: user.id, email: user.email, role: user.role } });
});

// Logout
router.post('/logout', (req, res) => {
  (req as any).session.destroy();
  res.json({ success: true });
});

// Get current user
router.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

// Change password
router.post('/password', requireAuth, (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!user || !compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .run(hashSync(newPassword, 10), req.user!.id);

  res.json({ success: true });
});

export default router;
