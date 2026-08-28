/**
 * Emergency Routes
 * Handles hospital search, emergency contacts, and first-aid guides
 */
const express = require('express');
const { findNearbyHospitals, getEmergencyContacts, getFirstAidGuide, getAllFirstAidTopics } = require('../services/emergencyService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

const router = express.Router();

/**
 * GET /api/emergency/hospitals
 * Get nearby hospitals (optional lat/lng query params)
 */
router.get('/hospitals', async (req, res, next) => {
  try {
    const { lat, lng, speciality, type, open24x7, limit } = req.query;

    const hospitals = await findNearbyHospitals(
      lat ? parseFloat(lat) : null,
      lng ? parseFloat(lng) : null,
      {
        speciality,
        type,
        open24x7: open24x7 === 'true' ? true : open24x7 === 'false' ? false : undefined,
        limit: limit ? parseInt(limit) : 25,
      }
    );

    return successResponse(res, { hospitals }, `Found ${hospitals.length} hospital(s)`);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/emergency/contacts
 * Get emergency contacts
 */
router.get('/contacts', async (req, res, next) => {
  try {
    const { category } = req.query;
    const contacts = getEmergencyContacts(category);
    return successResponse(res, { contacts }, 'Emergency contacts retrieved');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/emergency/first-aid
 * Get all first-aid topics
 */
router.get('/first-aid', async (req, res, next) => {
  try {
    const topics = getAllFirstAidTopics();
    return successResponse(res, { topics }, 'First-aid topics retrieved');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/emergency/first-aid/:condition
 * Get first-aid instructions for a condition
 */
router.get('/first-aid/:condition', async (req, res, next) => {
  try {
    const guide = getFirstAidGuide(req.params.condition);

    if (!guide) {
      return errorResponse(res, 'First-aid guide not found for this condition', 404);
    }

    return successResponse(res, { guide }, 'First-aid guide retrieved');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
