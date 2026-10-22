// Only lets through members whose email is listed in ADMIN_EMAILS (backend/.env).
// Everyone else gets "Not found", so the admin area isn't advertised.
const db = require('../db');
const auth = require('./auth');

const admins = () => String(process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

module.exports = function admin(req, res, next) {
  auth(req, res, async () => {
    try {
      const [u] = await db.promise().query('SELECT email FROM users WHERE id = ?', [req.user.id]);
      if (!u.length || !admins().includes(String(u[0].email).toLowerCase())) return res.status(404).json({ message: 'Not found' });
      next();
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
};
