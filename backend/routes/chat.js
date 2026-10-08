/**
 * Chat Routes — LLM-powered conversational AI
 * Endpoints:
 *   POST /api/chat/stream        — SSE streaming chat (primary)
 *   POST /api/chat/analyze       — Non-streaming chat (fallback compat.)
 *   GET  /api/chat/conversations — List user's conversations
 *   GET  /api/chat/conversations/:id — Get one conversation
 *   DELETE /api/chat/conversations/:id — Delete conversation
 */
const express = require('express');
const Conversation = require('../models/Conversation');
const { protect } = require('../middleware/auth');
const { streamChatResponse, getChatResponse, isLLMAvailable } = require('../services/llmService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

const router = express.Router();

// ─── Input validation helpers ────────────────────────────────────────────────

const MAX_MESSAGE_LENGTH = 4000;

function validateMessage(message) {
  if (!message || typeof message !== 'string') return 'Message is required';
  const trimmed = message.trim();
  if (trimmed.length === 0) return 'Message cannot be empty';
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`;
  }
  return null;
}

// ─── SSE Streaming Chat ───────────────────────────────────────────────────────

/**
 * POST /api/chat/stream
 * Real-time streaming response using Server-Sent Events.
 * Body: { message: string, conversationId?: string }
 *
 * SSE events:
 *   data: {"type":"start","conversationId":"..."}
 *   data: {"type":"chunk","text":"..."}
 *   data: {"type":"done","conversationId":"..."}
 *   data: {"type":"error","message":"..."}
 */
router.post('/stream', protect, async (req, res) => {
  // ── Validate input ──────────────────────────────────────────
  const { message, conversationId } = req.body;
  const validationError = validateMessage(message);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  // ── Set SSE headers ─────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

  const send = (obj) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(obj)}\n\n`);
    }
  };

  // ── Load or create conversation ──────────────────────────────
  let conversation;
  try {
    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        userId: req.user._id,
      });
      if (!conversation) {
        send({ type: 'error', message: 'Conversation not found or access denied' });
        return res.end();
      }
    } else {
      conversation = new Conversation({
        userId: req.user._id,
        messages: [],
      });
    }
  } catch (dbErr) {
    console.error('[chat/stream] DB load error:', dbErr.message);
    send({ type: 'error', message: 'Failed to load conversation' });
    return res.end();
  }

  // ── Check LLM availability ───────────────────────────────────
  if (!isLLMAvailable()) {
    send({
      type: 'error',
      message: 'AI service is not configured. Please set OPENAI_API_KEY on the server.',
      code: 'OPENAI_NOT_CONFIGURED',
    });
    return res.end();
  }

  // Snapshot history BEFORE adding the new user message
  // This is the fix for the stale-diagnosis bug:
  // We pass only the messages already in the DB, not the current message,
  // and the LLM itself receives the current message separately.
  const historySnapshot = conversation.messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  // Add the user message to the conversation now
  conversation.messages.push({
    role: 'user',
    content: message.trim(),
  });

  // Send "start" event with conversation ID (needed by frontend to track new convs)
  send({ type: 'start', conversationId: conversation._id.toString() });

  // ── Handle client disconnect ─────────────────────────────────
  const abortController = new AbortController();
  req.on('close', () => abortController.abort());

  // ── Stream from LLM ──────────────────────────────────────────
  let fullResponse = '';

  await streamChatResponse(
    message.trim(),
    historySnapshot,

    // onChunk
    (chunk) => {
      fullResponse += chunk;
      send({ type: 'chunk', text: chunk });
    },

    // onDone
    async (finalText) => {
      const responseText = finalText || fullResponse;

      // Only save if we got a real response
      if (responseText.trim().length > 0) {
        conversation.messages.push({
          role: 'assistant',
          content: responseText,
        });

        try {
          await conversation.save();
        } catch (saveErr) {
          console.error('[chat/stream] Save error:', saveErr.message);
        }
      }

      send({ type: 'done', conversationId: conversation._id.toString() });
      res.end();
    },

    // onError
    (err) => {
      console.error('[chat/stream] LLM error:', err.message);

      let userMessage = 'The AI service encountered an error. Please try again.';
      let code = 'AI_ERROR';

      if (err.message.includes('OPENAI_NOT_CONFIGURED')) {
        userMessage = 'AI service is not configured. Please set OPENAI_API_KEY on the server.';
        code = 'OPENAI_NOT_CONFIGURED';
      } else if (err.message.includes('OPENAI_AUTH_ERROR')) {
        userMessage = 'The AI service API key is invalid. Please contact the administrator.';
        code = 'OPENAI_AUTH_ERROR';
      } else if (err.message.includes('OPENAI_RATE_LIMIT')) {
        userMessage = 'The AI service is rate-limited. Please wait a moment and try again.';
        code = 'OPENAI_RATE_LIMIT';
      } else if (err.message.includes('OPENAI_UNAVAILABLE')) {
        userMessage = 'The AI service is temporarily unavailable. Please try again shortly.';
        code = 'OPENAI_UNAVAILABLE';
      } else if (err.message.includes('OPENAI_NETWORK_ERROR')) {
        userMessage = 'Cannot reach the AI service. Check your connection and try again.';
        code = 'OPENAI_NETWORK_ERROR';
      }

      send({ type: 'error', message: userMessage, code });
      if (!res.writableEnded) res.end();
    },

    abortController.signal
  );
});

// ─── Non-Streaming Chat (backward compatibility) ──────────────────────────────

/**
 * POST /api/chat/analyze
 * Non-streaming version — returns full response in one JSON response.
 * Kept for backward compatibility. New UI uses /stream.
 */
router.post('/analyze', protect, async (req, res, next) => {
  try {
    const { message, conversationId } = req.body;

    const validationError = validateMessage(message);
    if (validationError) {
      return errorResponse(res, validationError, 400);
    }

    let conversation;
    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        userId: req.user._id,
      });
      if (!conversation) {
        return errorResponse(res, 'Conversation not found', 404);
      }
    } else {
      conversation = new Conversation({
        userId: req.user._id,
        messages: [],
      });
    }

    // Snapshot history before adding new message (same fix as streaming endpoint)
    const historySnapshot = conversation.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    conversation.messages.push({ role: 'user', content: message.trim() });

    if (!isLLMAvailable()) {
      return errorResponse(
        res,
        'AI service is not configured. Please set OPENAI_API_KEY on the server.',
        503
      );
    }

    let responseText;
    try {
      responseText = await getChatResponse(message.trim(), historySnapshot);
    } catch (llmErr) {
      console.error('[chat/analyze] LLM error:', llmErr.message);
      return errorResponse(res, 'AI service error: ' + llmErr.message, 503);
    }

    conversation.messages.push({ role: 'assistant', content: responseText });
    await conversation.save();

    return successResponse(res, {
      conversationId: conversation._id,
      message: responseText,
      diagnosis: null, // No forced diagnosis in LLM mode
    }, 'Response generated');
  } catch (error) {
    next(error);
  }
});

// ─── Conversation Management ──────────────────────────────────────────────────

/**
 * GET /api/chat/conversations
 */
router.get('/conversations', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const conversations = await Conversation.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .select('title messages createdAt updatedAt')
      .lean();

    const formatted = conversations.map(conv => ({
      _id: conv._id,
      title: conv.title,
      messageCount: conv.messages?.length || 0,
      lastMessage: conv.messages?.length > 0
        ? conv.messages[conv.messages.length - 1].content.substring(0, 120)
        : '',
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    }));

    const total = await Conversation.countDocuments({ userId: req.user._id });

    return successResponse(res, {
      conversations: formatted,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    }, 'Conversations retrieved');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/chat/conversations/:id
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

/**
 * GET /api/chat/status
 * Returns whether the LLM service is configured.
 */
router.get('/status', protect, (req, res) => {
  return successResponse(res, {
    llmAvailable: isLLMAvailable(),
    provider: 'openai',
    model: 'gpt-4o-mini',
  }, 'Chat status');
});

module.exports = router;
