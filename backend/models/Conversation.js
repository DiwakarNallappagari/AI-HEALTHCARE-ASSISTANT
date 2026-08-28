/**
 * Conversation Model
 * Stores chat conversations with AI diagnosis results
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
  },
  messages: [messageSchema],
  diagnosis: {
    conditions: [{
      name: { type: String },
      probability: { type: Number, min: 0, max: 100 },
      description: { type: String },
    }],
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'emergency'],
    },
    recommendations: [String],
    suggestedSpecialist: String,
  },
}, {
  timestamps: true,
});

// Auto-generate title from first user message
conversationSchema.pre('save', function (next) {
  if (this.isNew && this.messages.length > 0) {
    const firstMessage = this.messages[0].content;
    this.title = firstMessage.length > 60
      ? firstMessage.substring(0, 60) + '...'
      : firstMessage;
  }
  next();
});

module.exports = mongoose.model('Conversation', conversationSchema);
