/**
 * Auth Routes
 * Handles user registration, login, and profile management
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validate');
const { JWT_SECRET, JWT_EXPIRE } = require('../config/env');
const { GOOGLE_CLIENT_ID } = require('../config/env');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

const router = express.Router();

/**
 * Generate JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', validateRegister, async (req, res, next) => {
  try {
    const { name, email, password, dateOfBirth, gender, bloodGroup } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 'An account with this email already exists', 400);
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      dateOfBirth,
      gender,
      bloodGroup,
    });

    // Generate token
    const token = generateToken(user._id);

    return successResponse(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        bloodGroup: user.bloodGroup,
      },
      token,
    }, 'Registration successful', 201);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Login user and return JWT
 */
router.post('/login', validateLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    // Generate token
    const token = generateToken(user._id);

    return successResponse(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        bloodGroup: user.bloodGroup,
      },
      token,
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get('/profile', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    return successResponse(res, { user }, 'Profile retrieved');
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', protect, async (req, res, next) => {
  try {
    const allowedFields = [
      'name', 'dateOfBirth', 'gender', 'bloodGroup',
      'allergies', 'medications', 'emergencyContact',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    return successResponse(res, { user }, 'Profile updated');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/google
 * Verify Google ID token, create or find user, return JWT
 */
router.post('/google', async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return errorResponse(res, 'Google ID token is required', 400);
    }

    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'your_google_oauth_client_id') {
      return errorResponse(
        res,
        'Google OAuth Client ID is missing on the server. Please set GOOGLE_CLIENT_ID in backend/.env',
        400
      );
    }

    let payload;
    try {
      const client = new OAuth2Client(GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      console.error('Google ID token verification failed:', verifyErr.message);
      return errorResponse(res, `Google Token Verification Failed: ${verifyErr.message}`, 401);
    }

    if (!payload || !payload.sub || !payload.email) {
      return errorResponse(res, 'Invalid token claims received from Google', 401);
    }

    if (!payload.email_verified) {
      return errorResponse(res, 'Google email address is not verified', 400);
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const name = payload.name || email.split('@')[0];
    const picture = payload.picture || '';

    // 1. Search by Google Subject ID
    let user = await User.findOne({ googleId });

    // 2. If not found by googleId, search by email
    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        if (!user.googleId) {
          user.googleId = googleId;
        }
        if (picture && !user.picture) {
          user.picture = picture;
        }
        await user.save();
      }
    }

    // 3. Create new user if account doesn't exist
    if (!user) {
      user = await User.create({
        googleId,
        name,
        email,
        picture,
        gender: 'other',
        bloodGroup: '',
      });
    }

    const token = generateToken(user._id);

    return successResponse(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        gender: user.gender,
        bloodGroup: user.bloodGroup,
      },
      token,
    }, 'Google sign-in successful');
  } catch (error) {
    console.error('Google auth error:', error);
    next(error);
  }
});

module.exports = router;
