/**
 * Medical History Routes
 * Handles CRUD operations for user medical records
 */
const express = require('express');
const MedicalRecord = require('../models/MedicalRecord');
const { protect } = require('../middleware/auth');
const { validateMedicalRecord } = require('../middleware/validate');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

const router = express.Router();

/**
 * GET /api/history/records
 * Get user's medical records with optional filters
 */
router.get('/records', protect, async (req, res, next) => {
  try {
    const { type, startDate, endDate, page = 1, limit = 20 } = req.query;

    const filter = { userId: req.user._id };

    if (type) {
      filter.type = type;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const records = await MedicalRecord.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await MedicalRecord.countDocuments(filter);

    return successResponse(res, {
      records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    }, 'Medical records retrieved');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/history/records
 * Add a new medical record
 */
router.post('/records', protect, validateMedicalRecord, async (req, res, next) => {
  try {
    const record = await MedicalRecord.create({
      ...req.body,
      userId: req.user._id,
    });

    return successResponse(res, { record }, 'Medical record created', 201);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/history/records/:id
 * Update a medical record
 */
router.put('/records/:id', protect, validateMedicalRecord, async (req, res, next) => {
  try {
    const record = await MedicalRecord.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!record) {
      return errorResponse(res, 'Medical record not found', 404);
    }

    return successResponse(res, { record }, 'Medical record updated');
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/history/records/:id
 * Delete a medical record
 */
router.delete('/records/:id', protect, async (req, res, next) => {
  try {
    const record = await MedicalRecord.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!record) {
      return errorResponse(res, 'Medical record not found', 404);
    }

    return successResponse(res, null, 'Medical record deleted');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
