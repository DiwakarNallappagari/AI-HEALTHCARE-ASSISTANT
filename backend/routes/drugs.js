/**
 * Drug Routes
 * Handles drug interaction checking and drug search
 */
const express = require('express');
const { protect } = require('../middleware/auth');
const { validateDrugCheck } = require('../middleware/validate');
const { searchDrugs, getDrugDetails, checkInteractions, getAllDrugs } = require('../services/drugService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

const router = express.Router();

/**
 * POST /api/drugs/check
 * Check interactions between multiple drugs
 */
router.post('/check', protect, validateDrugCheck, async (req, res, next) => {
  try {
    const { drugs } = req.body;
    const result = checkInteractions(drugs);
    return successResponse(res, result, 'Drug interaction check complete');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/drugs/search?q=
 * Search drug database
 */
router.get('/search', protect, async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return successResponse(res, { drugs: getAllDrugs() }, 'All drugs returned');
    }

    const results = searchDrugs(q);
    return successResponse(res, { drugs: results }, `Found ${results.length} drug(s)`);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/drugs/:name
 * Get drug details
 */
router.get('/:name', protect, async (req, res, next) => {
  try {
    const drug = getDrugDetails(req.params.name);

    if (!drug) {
      return errorResponse(res, 'Drug not found in database', 404);
    }

    return successResponse(res, { drug }, 'Drug details retrieved');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
