/**
 * ChatPage — Real-time LLM-powered healthcare chat
 * Features:
 *  - SSE streaming responses (text appears word-by-word)
 *  - Markdown rendering for AI responses
 *  - Copy-response button
 *  - Retry failed messages
 *  - Stop-generation button
 *  - Shift+Enter for newlines, Enter to send
 *  - Conversation sidebar with history
 *  - Welcome screen with example prompts
 *  - LLM-unavailable error state
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChat } from '../hooks/useChat';
import {
  FiSend, FiPlus, FiTrash2, FiClock, FiMessageSquare,
  FiStopCircle, FiCopy, FiCheck, FiRefreshCw, FiAlertCircle,
  FiZap,
} from 'react-icons/fi';
import './ChatPage.css';

// ─── Message Bubble ──────────────────────────────────────────────────────────

const MessageBubble = ({ msg, onRetry }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  const isUser = msg.role === 'user';
  const hasError = !!msg.error;
  const isStreaming = !!msg.streaming;

  return (
    <div className={`chat-bubble chat-bubble-${msg.role}`}>
      <div className="chat-bubble-avatar">
        {isUser ? '👤' : '🏥'}
      </div>
      <div className="chat-bubble-content">
        <div className="chat-bubble-header">
          <span className="chat-bubble-role">{isUser ? 'You' : 'HealthCare AI'}</span>
          <span className="chat-bubble-time">
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Content */}
        {hasError ? (
          <div className="chat-bubble-error">
            <FiAlertCircle size={14} />
            <span>{msg.error}</span>
            {onRetry && (
              <button className="chat-retry-btn" onClick={onRetry} title="Retry">
                <FiRefreshCw size={13} /> Retry
              </button>
            )}
          </div>
        ) : isUser ? (
          <div className="chat-bubble-text chat-bubble-text-plain">{msg.content}</div>
        ) : (
          <div className="chat-bubble-text chat-bubble-markdown">
            {msg.content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {msg.content}
              </ReactMarkdown>
            ) : isStreaming ? null : (
              <span className="chat-empty-response">_No response received._</span>
            )}
            {isStreaming && (
              <span className="chat-cursor" aria-hidden="true">▌</span>
            )}
          </div>
        )}

        {/* Copy button — only for non-empty, complete assistant messages */}
        {!isUser && !hasError && !isStreaming && msg.content && (
          <button
            className={`chat-copy-btn ${copied ? 'chat-copy-btn-success' : ''}`}
            onClick={handleCopy}
            title={copied ? 'Copied!' : 'Copy response'}
          >
            {copied ? <FiCheck size={12} /> : <FiCopy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  );
};

// ─── LLM Status Banner ────────────────────────────────────────────────────────

const LLMUnavailableBanner = () => (
  <div className="chat-llm-warning glass-card">
    <FiAlertCircle size={18} />
    <div>
      <strong>AI Service Not Configured</strong>
      <p>
        The backend <code>OPENAI_API_KEY</code> is not set.
        Set it in <code>backend/.env</code> and restart the server to enable the AI chatbot.
      </p>
    </div>
  </div>
);

// ─── Welcome Screen ───────────────────────────────────────────────────────────

const quickPrompts = [
  { icon: '👋', text: 'Hello! What can you help me with?' },
  { icon: '🩺', text: 'What is diabetes and how is it managed?' },
  { icon: '🤕', text: 'I hurt my hand. What first-aid steps should I take?' },
  { icon: '💊', text: 'What are common side effects of ibuprofen?' },
  { icon: '🥗', text: 'What foods help boost the immune system?' },
  { icon: '🫀', text: 'What are warning signs of a heart attack?' },
];

const WelcomeScreen = ({ onPromptClick }) => (
  <div className="chat-welcome animate-fade-in">
    <div className="chat-welcome-icon">
      <svg width="48" height="48" viewBox="0 0 28 28" fill="none">
        <rect x="11" y="4" width="6" height="20" rx="2" fill="url(#cg)" />
        <rect x="4" y="11" width="20" height="6" rx="2" fill="url(#cg)" />
        <defs>
          <linearGradient id="cg" x1="0" y1="0" x2="28" y2="28">
            <stop stopColor="#00d4aa" />
            <stop offset="1" stopColor="#00b4d8" />
          </linearGradient>
        </defs>
      </svg>
    </div>
    <h2>How can I help you today?</h2>
    <p>
      Ask me anything — health questions, symptoms, first aid, medications, nutrition, or general wellness.
      I&apos;ll respond naturally and remember context throughout our conversation.
    </p>
    <div className="chat-prompts">
      {quickPrompts.map((p, i) => (
        <button
          key={i}
          className="chat-prompt glass-card glass-card-hover"
          onClick={() => onPromptClick(p.text)}
        >
          <span className="chat-prompt-icon">{p.icon}</span>
          {p.text}
        </button>
      ))}
    </div>
  </div>
);

// ─── Main Chat Page ───────────────────────────────────────────────────────────

const ChatPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [llmAvailable, setLlmAvailable] = useState(true); // optimistic
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const lastConvIdRef = useRef(null);

  const {
    messages, conversations, currentConversationId,
    loading, streaming, error,
    sendMessage, stopGeneration, retryLastMessage,
    loadConversations, loadConversation, deleteConversation,
    startNewConversation,
  } = useChat();

  // Check LLM status on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    fetch(`${apiUrl}/chat/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setLlmAvailable(d?.data?.llmAvailable ?? false))
      .catch(() => setLlmAvailable(false));
  }, []);

  // Load conversations list on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load specific conversation if ID in URL
  useEffect(() => {
    if (id && id !== lastConvIdRef.current) {
      lastConvIdRef.current = id;
      loadConversation(id);
    }
  }, [id, loadConversation]);

  // Sync URL when conversation ID changes
  useEffect(() => {
    if (currentConversationId && currentConversationId !== id) {
      navigate(`/chat/${currentConversationId}`, { replace: true });
    }
  }, [currentConversationId, id, navigate]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSend = useCallback(async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading || streaming) return;
    setInput('');
    await sendMessage(text);
    loadConversations();
  }, [input, loading, streaming, sendMessage, loadConversations]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePromptClick = (text) => {
    setInput(text);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleNewChat = () => {
    startNewConversation();
    lastConvIdRef.current = null;
    navigate('/chat');
  };

  const handleSelectConversation = (convId) => {
    if (convId !== currentConversationId) {
      navigate(`/chat/${convId}`);
    }
  };

  const handleDeleteConversation = async (convId, e) => {
    e.stopPropagation();
    await deleteConversation(convId);
    loadConversations();
    if (convId === currentConversationId) {
      navigate('/chat');
    }
  };

  const isDisabled = loading || streaming || !llmAvailable;

  return (
    <div className="chat-layout">
      {/* ── Sidebar ── */}
      <aside className="chat-sidebar glass-card" id="chat-sidebar">
        <div className="chat-sidebar-header">
          <h3>Conversations</h3>
          <button className="btn btn-primary btn-sm" onClick={handleNewChat} id="new-chat-btn">
            <FiPlus size={16} /> New
          </button>
        </div>
        <div className="chat-sidebar-list">
          {conversations.map(conv => (
            <div
              key={conv._id}
              className={`chat-sidebar-item ${conv._id === (currentConversationId || id) ? 'chat-sidebar-item-active' : ''}`}
              onClick={() => handleSelectConversation(conv._id)}
            >
              <div className="chat-sidebar-item-info">
                <span className="chat-sidebar-item-title">{conv.title}</span>
                <span className="chat-sidebar-item-meta">
                  <FiClock size={10} />
                  {new Date(conv.updatedAt).toLocaleDateString()}
                  {conv.messageCount > 0 && (
                    <span className="chat-sidebar-item-count">{conv.messageCount} msgs</span>
                  )}
                </span>
              </div>
              <div className="chat-sidebar-item-actions">
                <button
                  className="btn btn-icon btn-ghost btn-sm"
                  onClick={(e) => handleDeleteConversation(conv._id, e)}
                  title="Delete conversation"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="chat-sidebar-empty">
              <FiMessageSquare size={24} />
              <span>No conversations yet</span>
            </div>
          )}
        </div>
      </aside>

      {/* ── Chat Area ── */}
      <div className="chat-main">
        {/* LLM warning banner */}
        {!llmAvailable && <LLMUnavailableBanner />}

        {/* Messages */}
        <div className="chat-messages" id="chat-messages">
          {messages.length === 0 && (
            <WelcomeScreen onPromptClick={handlePromptClick} />
          )}

          {messages.map((msg, i) => {
            const isLastAssistant =
              msg.role === 'assistant' &&
              i === messages.length - 1 &&
              !!msg.error;

            return (
              <div
                key={i}
                className="animate-slide-up"
                style={{ animationDelay: `${Math.min(i * 30, 200)}ms` }}
              >
                <MessageBubble
                  msg={msg}
                  onRetry={isLastAssistant ? retryLastMessage : null}
                />
              </div>
            );
          })}

          {/* Typing indicator (initial load before first chunk) */}
          {loading && !streaming && (
            <div className="chat-bubble chat-bubble-assistant animate-fade-in">
              <div className="chat-bubble-avatar">🏥</div>
              <div className="chat-bubble-content">
                <div className="chat-typing">
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Streaming indicator */}
        {streaming && (
          <div className="chat-streaming-bar">
            <FiZap size={12} className="chat-streaming-icon" />
            <span>Generating response…</span>
          </div>
        )}

        {/* Error banner (non-message errors) */}
        {error && !messages.some(m => m.error) && (
          <div className="chat-error-bar">
            <FiAlertCircle size={14} />
            <span>{error}</span>
            <button className="chat-retry-btn" onClick={retryLastMessage}>
              <FiRefreshCw size={13} /> Retry
            </button>
          </div>
        )}

        {/* Input area */}
        <form className="chat-input-area" onSubmit={handleSend} id="chat-input-form">
          <div className={`chat-input-wrapper glass-card ${isDisabled && !streaming ? 'chat-input-disabled' : ''}`}>
            <textarea
              ref={textareaRef}
              className="chat-input"
              placeholder={
                !llmAvailable
                  ? 'AI service unavailable — set OPENAI_API_KEY on the server'
                  : 'Ask me anything about your health… (Enter to send, Shift+Enter for new line)'
              }
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!llmAvailable || loading}
              rows={1}
              id="chat-input"
            />
            {streaming ? (
              <button
                type="button"
                className="btn btn-danger btn-icon"
                onClick={stopGeneration}
                title="Stop generating"
                id="chat-stop-btn"
              >
                <FiStopCircle size={18} />
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-primary btn-icon"
                disabled={!input.trim() || isDisabled}
                id="chat-send-btn"
              >
                <FiSend size={18} />
              </button>
            )}
          </div>
          <p className="chat-disclaimer">
            ⚕️ AI-assisted information — not a substitute for professional medical advice.
            Always consult a qualified healthcare provider for personal medical decisions.
          </p>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;
