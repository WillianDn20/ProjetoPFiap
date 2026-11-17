const express = require('express');
const mongoose = require('mongoose');
const Student = require('../models/Student');
const { BIMESTERS, GRADE_LEVELS, SUBJECTS_BY_GRADE } = require('../constants/studentAcademics');
const { requireAuth, requireTeacher } = require('../middleware/auth');

const router = express.Router();
const MAX_PAGE_SIZE = 100;
const MAX_GUARDIANS = 5;

const validateStudent = (body, { requireProfile = true } = {}) => {
  const { name, gradeLevel, address = '', guardians = [], grades } = body || {};
  if (typeof name !== 'string' || !name.trim()) return 'Student name is required.';
  if (!GRADE_LEVELS.includes(gradeLevel)) return 'A valid grade level is required.';
  if (typeof address !== 'string' || (requireProfile && !address.trim())) return 'Student address is required.';
  if (!Array.isArray(guardians) || guardians.length > MAX_GUARDIANS) {
    return `Provide no more than ${MAX_GUARDIANS} guardian contacts.`;
  }
  const hasValidGuardian = guardians.some((guardian) => (
    guardian
    && typeof guardian.name === 'string'
    && guardian.name.trim()
    && ((typeof guardian.phone === 'string' && guardian.phone.trim())
      || (typeof guardian.email === 'string' && guardian.email.trim()))
  ));
  if (requireProfile && !hasValidGuardian) {
    return 'At least one guardian name and a phone number or email address are required.';
  }
  if (grades !== undefined && !Array.isArray(grades)) return 'Grades must be a list.';

  const availableSubjects = SUBJECTS_BY_GRADE[gradeLevel];
  const seenGrades = new Set();
  for (const grade of grades || []) {
    const bimester = grade?.bimester ?? 1;
    const key = `${grade?.subject}:${bimester}`;
    if (
      !grade || typeof grade.subject !== 'string'
      || !availableSubjects.includes(grade.subject)
      || !BIMESTERS.includes(bimester)
      || seenGrades.has(key)
      || typeof grade.score !== 'number'
      || !Number.isFinite(grade.score)
      || grade.score < 0
      || grade.score > 10
    ) {
      return 'Grades must contain unique subjects for the selected grade and scores from 0 to 10.';
    }
    seenGrades.add(key);
  }

  for (const guardian of guardians) {
    if (!guardian || typeof guardian !== 'object') return 'Guardian contacts are invalid.';
    if (['name', 'phone', 'email'].some((field) => (
      guardian[field] !== undefined && typeof guardian[field] !== 'string'
    ))) {
      return 'Guardian name, phone, and email must be text.';
    }
    if (guardian.phone?.trim() && guardian.phone.replace(/\D/g, '').length !== 11) {
      return 'Guardian phone numbers must contain 11 digits, in the format (11) 111111111.';
    }
    if (
      requireProfile
      &&
      [guardian.name, guardian.phone, guardian.email].some((value) => typeof value === 'string' && value.trim())
      && !guardian.name?.trim()
    ) {
      return 'Every guardian contact must include a name.';
    }
    if (
      requireProfile
      &&
      guardian.name?.trim()
      && !guardian.phone?.trim()
      && !guardian.email?.trim()
    ) {
      return 'Each guardian must have a phone number or email address.';
    }
    if (guardian.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardian.email.trim())) {
      return 'A guardian email address is invalid.';
    }
  }

  return null;
};

const normalizeStudent = (body) => ({
  name: body.name.trim(),
  gradeLevel: body.gradeLevel,
  address: (body.address || '').trim(),
  guardians: (body.guardians || [])
    .map((guardian) => ({
      name: (guardian.name || '').trim(),
      phone: guardian.phone?.trim()
        ? `(${guardian.phone.replace(/\D/g, '').slice(0, 2)}) ${guardian.phone.replace(/\D/g, '').slice(2)}`
        : '',
      email: (guardian.email || '').trim().toLowerCase(),
    }))
    .filter((guardian) => guardian.name || guardian.phone || guardian.email),
  grades: body.grades?.map((grade) => ({ ...grade, bimester: grade.bimester ?? 1 })),
});

router.get('/', requireAuth, requireTeacher, async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Number.parseInt(req.query.limit, 10) || 10;
    if (page < 1 || limit < 1) {
      return res.status(400).json({ error: 'Page and limit must be positive integers.' });
    }

    const pageSize = Math.min(limit, MAX_PAGE_SIZE);
    const [students, total] = await Promise.all([
      Student.find()
        .sort({ name: 1, _id: 1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Student.countDocuments(),
    ]);

    return res.status(200).json({
      students,
      page,
      limit: pageSize,
      total,
      pages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Error listing students:', error);
    return res.status(500).json({ error: 'Internal server error while listing students.' });
  }
});

router.get('/:id', requireAuth, requireTeacher, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).lean();
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    return res.status(200).json(student);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid student ID.' });
    }
    console.error('Error getting student:', error);
    return res.status(500).json({ error: 'Internal server error while getting student.' });
  }
});

router.post('/', requireAuth, requireTeacher, async (req, res) => {
  const validationError = validateStudent(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const student = await Student.create(normalizeStudent(req.body));
    return res.status(201).json(student);
  } catch (error) {
    console.error('Error creating student:', error);
    return res.status(500).json({ error: 'Internal server error while creating student.' });
  }
});

router.put('/:id', requireAuth, requireTeacher, async (req, res) => {
  const validationError = validateStudent(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      normalizeStudent(req.body),
      { new: true, runValidators: true }
    );
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    return res.status(200).json(student);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid student ID.' });
    }
    console.error('Error updating student:', error);
    return res.status(500).json({ error: 'Internal server error while updating student.' });
  }
});

router.put('/:id/grades', requireAuth, requireTeacher, async (req, res) => {
  if (!Array.isArray(req.body?.grades)) {
    return res.status(400).json({ error: 'Grades must be a list.' });
  }

  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    const validationError = validateStudent({
      name: student.name,
      gradeLevel: student.gradeLevel,
      address: student.address,
      guardians: student.guardians,
      grades: req.body.grades,
    }, { requireProfile: false });
    if (validationError) return res.status(400).json({ error: validationError });

    student.grades = req.body.grades.map((grade) => ({
      ...grade,
      bimester: grade.bimester ?? 1,
    }));
    await student.save();
    return res.status(200).json({ grades: student.grades });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid student ID.' });
    }
    console.error('Error updating student grades:', error);
    return res.status(500).json({ error: 'Internal server error while updating student grades.' });
  }
});

router.post('/:id/observations', requireAuth, requireTeacher, async (req, res) => {
  const text = req.body?.text;
  if (typeof text !== 'string' || !text.trim() || text.trim().length > 2000) {
    return res.status(400).json({ error: 'Observation must contain between 1 and 2000 characters.' });
  }

  try {
    const observation = {
      _id: new mongoose.Types.ObjectId(),
      text: text.trim(),
      authorName: req.user.name,
      createdAt: new Date(),
    };
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { $push: { observations: observation } },
      { new: true, projection: { observations: 1 } }
    ).lean();
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    return res.status(201).json({ observations: student.observations });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid student ID.' });
    }
    console.error('Error adding student observation:', error);
    return res.status(500).json({ error: 'Internal server error while adding student observation.' });
  }
});

router.delete('/:id/observations/:observationId', requireAuth, requireTeacher, async (req, res) => {
  const { id, observationId } = req.params;
  if (!mongoose.isValidObjectId(observationId)) {
    return res.status(400).json({ error: 'Invalid observation ID.' });
  }

  try {
    const result = await Student.updateOne(
      { _id: id, 'observations._id': observationId },
      { $pull: { observations: { _id: observationId } } }
    );
    if (!result.matchedCount) {
      const studentExists = await Student.exists({ _id: id });
      if (!studentExists) return res.status(404).json({ error: 'Student not found.' });
      return res.status(404).json({ error: 'Observation not found.' });
    }

    const student = await Student.findById(id).select('observations').lean();
    return res.status(200).json({ observations: student.observations });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid student ID.' });
    }
    console.error('Error deleting student observation:', error);
    return res.status(500).json({ error: 'Internal server error while deleting student observation.' });
  }
});

router.delete('/:id', requireAuth, requireTeacher, async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    return res.status(200).json({ message: 'Student deleted successfully.' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid student ID.' });
    }
    console.error('Error deleting student:', error);
    return res.status(500).json({ error: 'Internal server error while deleting student.' });
  }
});

module.exports = router;
