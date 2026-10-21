const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// REGISTER
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const [existing] = await db.promise().query(
      'SELECT * FROM users WHERE email = ?', [email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.promise().query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashed]
    );
    // Create user_stats row automatically
    await db.promise().query(
      'INSERT INTO user_stats (user_id) VALUES (?)',
      [result.insertId]
    );
    res.json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await db.promise().query(
      'SELECT * FROM users WHERE email = ?', [email]
    );
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    // Update streak
    // Update daily streak: +1 if last active yesterday, unchanged if today, else reset to 1.
    try {
      const [statsRows] = await db.promise().query(
        'SELECT streak_days, last_active FROM user_stats WHERE user_id = ?', [user.id]
      );
      const toDay = (d) => {
        if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) { const [y, m, dd] = d.slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, dd); }
        const x = new Date(d); return Date.UTC(x.getFullYear(), x.getMonth(), x.getDate());
      };
      const today = toDay(new Date());
      if (statsRows.length === 0) {
        await db.promise().query('INSERT INTO user_stats (user_id, streak_days, last_active) VALUES (?, 1, CURDATE())', [user.id]);
      } else {
        const { streak_days, last_active } = statsRows[0];
        const diff = last_active ? Math.round((today - toDay(last_active)) / 86400000) : null;
        const streak = diff === 0 ? (streak_days || 1) : diff === 1 ? (streak_days || 0) + 1 : 1;
        await db.promise().query(
          'UPDATE user_stats SET streak_days = ?, last_active = CURDATE() WHERE user_id = ?', [streak, user.id]
        );
      }
    } catch (e) {
      console.error('Streak update failed:', e.message);
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
