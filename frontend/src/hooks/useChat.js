/**
 * useChat Hook
 * Manages chat state, message sending, and conversation operations
 */
import { useState, useCallback } from 'react';
import { chatAPI } from '../services/api';

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Send a message and get AI response
  const sendMessage = useCallback(async (message) => {
    setLoading(true);
    setError(null);

    // Add user message immediately
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await chatAPI.analyze(message, currentConversationId);
      const data = response.data.data;

      // Set conversation ID for subsequent messages
      if (!currentConversationId) {
        setCurrentConversationId(data.conversationId);
      }

      // Add assistant message
      const assistantMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Set diagnosis
      setDiagnosis(data.diagnosis || null);

      return data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to get response';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentConversationId]);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    try {
      const response = await chatAPI.getConversations();
      setConversations(response.data.data.conversations);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, []);

  // Load a specific conversation
  const loadConversation = useCallback(async (id) => {
    try {
      const response = await chatAPI.getConversation(id);
      const conv = response.data.data.conversation;
      setMessages(conv.messages);
      setCurrentConversationId(conv._id);
      setDiagnosis(conv.diagnosis);
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback(async (id) => {
    try {
      await chatAPI.deleteConversation(id);
      setConversations(prev => prev.filter(c => c._id !== id));
      if (currentConversationId === id) {
        startNewConversation();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  }, [currentConversationId]);

  // Start a new conversation
  const startNewConversation = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(null);
    setDiagnosis(null);
    setError(null);
  }, []);

  return {
    messages,
    conversations,
    currentConversationId,
    diagnosis,
    loading,
    error,
    sendMessage,
    loadConversations,
    loadConversation,
    deleteConversation,
    startNewConversation,
  };
};
