/**
 * Chat Routes
 * Handles AI symptom analysis and conversation management
 */
const express = require('express');
const Conversation = require('../models/Conversation');
const { protect } = require('../middleware/auth');
const { validateChat } = require('../middleware/validate');
const { analyzeSymptoms } = require('../services/aiService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

const router = express.Router();

/**
 * POST /api/chat/analyze
 * Send symptoms and get AI diagnosis
 */
router.post('/analyze', protect, validateChat, async (req, res, next) => {
  try {
    const { message, conversationId } = req.body;
    let conversation;

    if (conversationId) {
      // Continue existing conversation
      conversation = await Conversation.findOne({
        _id: conversationId,
        userId: req.user._id,
      });

      if (!conversation) {
        return errorResponse(res, 'Conversation not found', 404);
      }
    } else {
      // Create new conversation
      conversation = new Conversation({
        userId: req.user._id,
        messages: [],
      });
    }

    // Add user message
    conversation.messages.push({
      role: 'user',
      content: message,
    });

    // Get AI analysis
    const analysis = await analyzeSymptoms(message, conversation.messages);

    // Add assistant response
    conversation.messages.push({
      role: 'assistant',
      content: analysis.response,
    });

    // Update diagnosis if available
    if (analysis.diagnosis) {
      conversation.diagnosis = analysis.diagnosis;
    }

    await conversation.save();

    return successResponse(res, {
      conversationId: conversation._id,
      message: analysis.response,
      diagnosis: analysis.diagnosis,
    }, 'Analysis complete');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/chat/conversations
 * List user's conversations
 */
router.get('/conversations', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const conversations = await Conversation.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('title diagnosis.riskLevel messages createdAt updatedAt')
      .lean();

    // Add message count and last message preview
    const formatted = conversations.map(conv => ({
      ...conv,
      messageCount: conv.messages?.length || 0,
      lastMessage: conv.messages?.length > 0
        ? conv.messages[conv.messages.length - 1].content.substring(0, 100)
        : '',
      messages: undefined, // Don't send all messages in list view
    }));

    const total = await Conversation.countDocuments({ userId: req.user._id });

    return successResponse(res, {
      conversations: formatted,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    }, 'Conversations retrieved');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/chat/conversations/:id
 * Get single conversation with all messages
 */
router.get('/conversations/:id', protect, async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!conversation) {
      return errorResponse(res, 'Conversation not found', 404);
    }

    return successResponse(res, { conversation }, 'Conversation retrieved');
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/chat/conversations/:id
 * Delete a conversation
 */
router.delete('/conversations/:id', protect, async (req, res, next) => {
  try {
    const conversation = await Conversation.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!conversation) {
      return errorResponse(res, 'Conversation not found', 404);
    }

    return successResponse(res, null, 'Conversation deleted');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
