const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { TEACHER_SUBJECTS } = require('../constants/studentAcademics');
const { requireAuth, requireTeacher } = require('../middleware/auth');
const PROTECTED_TEACHER_EMAIL = 'professor@tc4.fiap';

const matchesRegistrationCode = (providedCode, configuredCode) => {
  if (typeof providedCode !== 'string' || !configuredCode) return false;

  const providedBuffer = Buffer.from(providedCode);
  const configuredBuffer = Buffer.from(configuredCode);
  return providedBuffer.length === configuredBuffer.length
    && crypto.timingSafeEqual(providedBuffer, configuredBuffer);
};

router.get('/users', requireAuth, requireTeacher, async (req, res) => {
  try {
    const role = req.query.role;
    if (role !== 'teacher' && role !== 'student') {
      return res.status(400).json({ error: 'A valid user role is required.' });
    }

    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Number.parseInt(req.query.limit, 10) || 10;
    if (page < 1 || limit < 1) {
      return res.status(400).json({ error: 'Page and limit must be positive integers.' });
    }

    const pageSize = Math.min(limit, 100);
    const filter = { role };
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('name email role approved subject')
        .sort({ name: 1, _id: 1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      User.countDocuments(filter)
    ]);

    return res.status(200).json({
      users,
      page,
      limit: pageSize,
      total,
      pages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('Error listing users:', error);
    return res.status(500).json({ error: 'Internal server error while listing users.' });
  }
});

router.get('/users/:id', requireAuth, requireTeacher, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name email role approved subject')
      .lean();
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.status(200).json(user);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }
    console.error('Error getting user:', error);
    return res.status(500).json({ error: 'Internal server error while getting user.' });
  }
});

router.post('/users', requireAuth, requireTeacher, async (req, res) => {
  try {
    const { name, email, password, role, subject } = req.body || {};
    if (
      typeof name !== 'string' || !name.trim()
      || typeof email !== 'string' || !email.trim()
      || typeof password !== 'string' || password.length < 8
      || !['teacher', 'student'].includes(role)
      || (role === 'teacher' && !TEACHER_SUBJECTS.includes(subject))
    ) {
      return res.status(400).json({
        error: 'Name, email, a password of at least 8 characters, a valid role, and a valid teacher subject are required.'
      });
    }

    const user = new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
      subject: role === 'teacher' ? subject : undefined,
      approved: role === 'teacher'
    });
    await user.save();

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      subject: user.subject,
      approved: user.approved
    });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'This email is already registered.' });
    }
    return res.status(500).json({ error: 'Internal server error while creating user.' });
  }
});

router.put('/users/:id', requireAuth, requireTeacher, async (req, res) => {
  try {
    const { name, email, password, role, subject } = req.body || {};
    if (
      (name !== undefined && (typeof name !== 'string' || !name.trim()))
      || (email !== undefined && (typeof email !== 'string' || !email.trim()))
      || (password !== undefined && (typeof password !== 'string' || password.length < 8))
      || (role !== undefined && !['teacher', 'student'].includes(role))
      || (subject !== undefined && !TEACHER_SUBJECTS.includes(subject))
      || (role === 'teacher' && subject !== undefined && !TEACHER_SUBJECTS.includes(subject))
    ) {
      return res.status(400).json({ error: 'One or more user fields are invalid.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (user.email.toLowerCase() === PROTECTED_TEACHER_EMAIL) {
      return res.status(400).json({ error: 'Esta conta não pode ser alterada.' });
    }

    if (name !== undefined) user.name = name.trim();
    if (email !== undefined) user.email = email.trim().toLowerCase();
    if (password !== undefined) user.password = password;
    if (subject !== undefined) user.subject = subject;
    if (role !== undefined) {
      user.role = role;
      user.approved = role === 'teacher';
    }

    await user.save();
    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      subject: user.subject,
      approved: user.approved
    });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'This email is already registered.' });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }
    return res.status(500).json({ error: 'Internal server error while updating user.' });
  }
});

router.delete('/users/:id', requireAuth, requireTeacher, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (user.email.toLowerCase() === PROTECTED_TEACHER_EMAIL) {
      return res.status(403).json({ error: 'This teacher account cannot be deleted.' });
    }

    await user.deleteOne();

    return res.status(200).json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Error deleting user:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }
    return res.status(500).json({ error: 'Internal server error while deleting user.' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const registrationCode = process.env.TEACHER_REGISTRATION_CODE;
    if (!registrationCode) {
      return res.status(503).json({ error: 'Teacher registration is not configured.' });
    }

    if (!matchesRegistrationCode(req.body?.registrationCode, registrationCode)) {
      return res.status(403).json({ error: 'A valid teacher invitation code is required.' });
    }

    const { name, email, password } = req.body || {};
    if (
      typeof name !== 'string' || !name.trim()
      || typeof email !== 'string' || !email.trim()
      || typeof password !== 'string' || password.length < 8
    ) {
      return res.status(400).json({ error: 'Name, email, and a password of at least 8 characters are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ error: 'This email is already registered.' });
    }

    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'teacher',
      approved: true
    });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'This email is already registered.' });
    }
    res.status(500).json({ error: 'Internal server error while registering user.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const secret = process.env.JWT_SECRET;
    if (!secret || Buffer.byteLength(secret) < 32) {
      console.error('JWT_SECRET must be configured with at least 32 characters.');
      return res.status(500).json({ error: 'Authentication is not configured.' });
    }

    const user = typeof email === 'string'
      ? await User.findOne({ email: email.trim().toLowerCase() })
      : null;
    if (!user || user.role !== 'teacher' || user.approved !== true) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = typeof password === 'string'
      && await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { sub: user._id.toString() },
      secret,
      { algorithm: 'HS256', expiresIn: '8h' }
    );

    res.status(200).json({ 
      message: 'Login successful', 
      token,
      role: user.role,
      name: user.name,
      email: user.email 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

module.exports = router;