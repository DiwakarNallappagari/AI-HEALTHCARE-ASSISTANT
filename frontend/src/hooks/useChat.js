/**
 * useChat Hook — SSE Streaming Chat
 * Manages streaming responses, conversation state, and history.
 * Fixes the stale-diagnosis bug by always using the backend's
 * conversation history rather than accumulating state in React.
 */
import { useState, useCallback, useRef } from 'react';
import { chatAPI } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);

  // Ref to the EventSource so we can abort it
  const abortControllerRef = useRef(null);
  // Ref to the current streaming message index (to update it in place)
  const streamingIndexRef = useRef(null);

  /**
   * Send a message with SSE streaming.
   * 1. Optimistically adds the user bubble.
   * 2. Adds an empty assistant bubble for streaming into.
   * 3. Opens SSE, fills the assistant bubble chunk-by-chunk.
   * 4. Saves conversation ID on 'done'.
   */
  const sendMessage = useCallback(async (messageText, conversationIdOverride) => {
    if (!messageText.trim()) return;

    const convId = conversationIdOverride ?? currentConversationId;

    setLoading(true);
    setStreaming(false);
    setError(null);

    // Cancel any in-progress stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Optimistic user bubble
    const userMsg = {
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date().toISOString(),
    };

    // Placeholder assistant bubble (will be filled by stream)
    const assistantMsg = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      streaming: true,
    };

    setMessages(prev => {
      const next = [...prev, userMsg, assistantMsg];
      streamingIndexRef.current = next.length - 1; // index of assistant bubble
      return next;
    });

    // Build the SSE request via fetch (EventSource doesn't support POST with body)
    const token = localStorage.getItem('token');
    const body = JSON.stringify({
      message: messageText.trim(),
      ...(convId ? { conversationId: convId } : {}),
    });

    let gotDone = false;
    let accumulatedText = '';

    try {
      const response = await fetch(`${API_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        // Non-SSE error (e.g., 401 / 400)
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP ${response.status}`);
      }

      setLoading(false);
      setStreaming(true);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (controller.signal.aborted) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE messages are separated by double newlines
        const parts = buffer.split('\n\n');
        buffer = parts.pop(); // keep incomplete tail

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data:')) continue;

          let parsed;
          try {
            parsed = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }

          if (parsed.type === 'start') {
            const newConvId = parsed.conversationId;
            if (newConvId && !convId) {
              setCurrentConversationId(newConvId);
            }
          } else if (parsed.type === 'chunk') {
            accumulatedText += parsed.text;
            const idx = streamingIndexRef.current;
            setMessages(prev => {
              const updated = [...prev];
              if (updated[idx]) {
                updated[idx] = {
                  ...updated[idx],
                  content: accumulatedText,
                };
              }
              return updated;
            });
          } else if (parsed.type === 'done') {
            gotDone = true;
            const finalConvId = parsed.conversationId;
            if (finalConvId) {
              setCurrentConversationId(finalConvId);
            }
            // Mark streaming complete
            const idx = streamingIndexRef.current;
            setMessages(prev => {
              const updated = [...prev];
              if (updated[idx]) {
                updated[idx] = { ...updated[idx], streaming: false };
              }
              return updated;
            });
          } else if (parsed.type === 'error') {
            throw new Error(parsed.message || 'AI service error');
          }
        }
      }

      if (!gotDone && accumulatedText) {
        // Stream ended without 'done' event — mark complete anyway
        const idx = streamingIndexRef.current;
        setMessages(prev => {
          const updated = [...prev];
          if (updated[idx]) {
            updated[idx] = { ...updated[idx], streaming: false };
          }
          return updated;
        });
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // User cancelled — mark message as cancelled
        const idx = streamingIndexRef.current;
        setMessages(prev => {
          const updated = [...prev];
          if (updated[idx]) {
            updated[idx] = {
              ...updated[idx],
              streaming: false,
              content: updated[idx].content || '_Response cancelled._',
            };
          }
          return updated;
        });
        return;
      }

      const errMsg = err.message || 'Failed to get a response from the AI service';
      setError(errMsg);

      // Replace the empty assistant bubble with an error message
      const idx = streamingIndexRef.current;
      setMessages(prev => {
        const updated = [...prev];
        if (updated[idx]) {
          updated[idx] = {
            ...updated[idx],
            content: '',
            streaming: false,
            error: errMsg,
          };
        }
        return updated;
      });
    } finally {
      setLoading(false);
      setStreaming(false);
      streamingIndexRef.current = null;
    }
  }, [currentConversationId]);

  /**
   * Abort an in-progress stream.
   */
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Retry the last failed message.
   */
  const retryLastMessage = useCallback(() => {
    setMessages(prev => {
      const lastUser = [...prev].reverse().find(m => m.role === 'user');
      if (!lastUser) return prev;

      // Remove the last assistant message (which has the error)
      const withoutLastAssistant = [...prev];
      for (let i = withoutLastAssistant.length - 1; i >= 0; i--) {
        if (withoutLastAssistant[i].role === 'assistant') {
          withoutLastAssistant.splice(i, 1);
          break;
        }
      }
      return withoutLastAssistant;
    });

    setMessages(prev => {
      const lastUser = [...prev].reverse().find(m => m.role === 'user');
      if (lastUser) {
        // Trigger send after state update
        setTimeout(() => sendMessage(lastUser.content), 0);
      }
      return prev;
    });
  }, [sendMessage]);

  /** Load conversations list */
  const loadConversations = useCallback(async () => {
    try {
      const response = await chatAPI.getConversations();
      setConversations(response.data.data.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, []);

  /** Load a specific conversation from backend (source of truth) */
  const loadConversation = useCallback(async (id) => {
    try {
      setError(null);
      const response = await chatAPI.getConversation(id);
      const conv = response.data.data.conversation;
      setMessages(conv.messages || []);
      setCurrentConversationId(conv._id);
    } catch (err) {
      console.error('Failed to load conversation:', err);
      setError('Failed to load conversation');
    }
  }, []);

  /** Delete a conversation */
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversationId]);

  /** Start a brand-new conversation (clear all local state) */
  const startNewConversation = useCallback(() => {
    stopGeneration();
    setMessages([]);
    setCurrentConversationId(null);
    setError(null);
    setLoading(false);
    setStreaming(false);
  }, [stopGeneration]);

  return {
    messages,
    conversations,
    currentConversationId,
    loading,
    streaming,
    error,
    sendMessage,
    stopGeneration,
    retryLastMessage,
    loadConversations,
    loadConversation,
    deleteConversation,
    startNewConversation,
  };
};
