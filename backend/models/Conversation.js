/**
 * Conversation Model
 * Stores LLM-powered chat conversations.
 * Each conversation belongs to one user and contains ordered messages.
 */
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: 8000,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    default: 'New Conversation',
    maxlength: 120,
  },
  messages: [messageSchema],
}, {
  timestamps: true,
});

// Auto-generate title from first user message when conversation is new
conversationSchema.pre('save', function (next) {
  if (this.isNew && this.messages.length > 0) {
    const firstUserMessage = this.messages.find(m => m.role === 'user');
    if (firstUserMessage) {
      const raw = firstUserMessage.content.trim();
      this.title = raw.length > 80 ? raw.substring(0, 80) + '...' : raw;
    }
  }
  next();
});

// Index for efficient per-user conversation queries
conversationSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
