/**
 * Medical Record Model
 * Stores user medical history entries
 */
const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['diagnosis', 'prescription', 'lab_result', 'vaccination', 'allergy', 'surgery'],
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
  },
  doctor: {
    type: String,
    trim: true,
  },
  facility: {
    type: String,
    trim: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

// Index for efficient querying
medicalRecordSchema.index({ userId: 1, date: -1 });
medicalRecordSchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
