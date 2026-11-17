const mongoose = require('mongoose');
const {
  BIMESTERS,
  GRADE_LEVELS,
  SUBJECTS_BY_GRADE,
} = require('../constants/studentAcademics');

const gradeSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
    enum: [...new Set(Object.values(SUBJECTS_BY_GRADE).flat())],
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 10,
  },
  bimester: {
    type: Number,
    required: true,
    enum: BIMESTERS,
    default: 1,
  },
}, { _id: false });

const observationSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now },
  authorName: { type: String, trim: true, default: '' },
}, { _id: true });

const guardianSchema = new mongoose.Schema({
  name: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, lowercase: true, default: '' },
}, { _id: false });

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  gradeLevel: { type: String, required: true, enum: GRADE_LEVELS },
  address: { type: String, trim: true, default: '' },
  guardians: { type: [guardianSchema], default: [] },
  grades: { type: [gradeSchema], default: [] },
  observations: { type: [observationSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
