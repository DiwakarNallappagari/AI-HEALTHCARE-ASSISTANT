/**
 * Chat Page
 * Chatbot-style interface for symptom analysis
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '../hooks/useChat';
import RiskBadge from '../components/RiskBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { FiSend, FiPlus, FiTrash2, FiClock, FiMessageSquare } from 'react-icons/fi';
import './ChatPage.css';

const ChatPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const {
    messages, conversations, currentConversationId, diagnosis,
    loading, error, sendMessage, loadConversations, loadConversation,
    deleteConversation, startNewConversation,
  } = useChat();

  // Load conversations list on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load specific conversation if ID in URL
  useEffect(() => {
    if (id) {
      loadConversation(id);
    }
  }, [id, loadConversation]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const msg = input;
    setInput('');
    await sendMessage(msg);
    loadConversations(); // Refresh sidebar
  };

  const handleNewChat = () => {
    startNewConversation();
    navigate('/chat');
  };

  const handleSelectConversation = (convId) => {
    navigate(`/chat/${convId}`);
  };

  const handleDeleteConversation = async (convId, e) => {
    e.stopPropagation();
    await deleteConversation(convId);
    loadConversations();
  };

  const quickPrompts = [
    "I have a headache and fever since yesterday",
    "I'm experiencing chest tightness and shortness of breath",
    "I have stomach pain, nausea, and loss of appetite",
    "My throat is sore and I have a persistent cough",
  ];

  return (
    <div className="chat-layout">
      {/* Conversation Sidebar */}
      <aside className={`chat-sidebar glass-card ${showSidebar ? '' : 'chat-sidebar-hidden'}`} id="chat-sidebar">
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
                </span>
              </div>
              <div className="chat-sidebar-item-actions">
                {conv.diagnosis?.riskLevel && <RiskBadge level={conv.diagnosis.riskLevel} size="sm" />}
                <button className="btn btn-icon btn-ghost btn-sm" onClick={(e) => handleDeleteConversation(conv._id, e)} title="Delete">
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

      {/* Chat Area */}
      <div className="chat-main">
        {/* Messages */}
        <div className="chat-messages" id="chat-messages">
          {messages.length === 0 && (
            <div className="chat-welcome animate-fade-in">
              <div className="chat-welcome-icon">
                <svg width="48" height="48" viewBox="0 0 28 28" fill="none">
                  <rect x="11" y="4" width="6" height="20" rx="2" fill="url(#cg)" />
                  <rect x="4" y="11" width="20" height="6" rx="2" fill="url(#cg)" />
                  <defs><linearGradient id="cg" x1="0" y1="0" x2="28" y2="28"><stop stopColor="#00d4aa"/><stop offset="1" stopColor="#00b4d8"/></linearGradient></defs>
                </svg>
              </div>
              <h2>How can I help you today?</h2>
              <p>Describe your symptoms in natural language and I'll provide an AI-powered analysis.</p>

              <div className="chat-prompts">
                {quickPrompts.map((prompt, i) => (
                  <button key={i} className="chat-prompt glass-card glass-card-hover" onClick={() => setInput(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`chat-bubble chat-bubble-${msg.role} animate-slide-up`} style={{ animationDelay: `${i * 50}ms` }}>
              <div className="chat-bubble-avatar">
                {msg.role === 'user' ? '👤' : '🏥'}
              </div>
              <div className="chat-bubble-content">
                <div className="chat-bubble-header">
                  <span className="chat-bubble-role">{msg.role === 'user' ? 'You' : 'HealthCare AI'}</span>
                  <span className="chat-bubble-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="chat-bubble-text" dangerouslySetInnerHTML={{
                  __html: msg.content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/_(.*?)_/g, '<em>$1</em>')
                    .replace(/\n/g, '<br/>')
                }} />
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="chat-bubble chat-bubble-assistant animate-fade-in">
              <div className="chat-bubble-avatar">🏥</div>
              <div className="chat-bubble-content">
                <div className="chat-typing">
                  <span className="chat-typing-dot"></span>
                  <span className="chat-typing-dot"></span>
                  <span className="chat-typing-dot"></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Diagnosis summary card */}
        {diagnosis && (
          <div className="chat-diagnosis glass-card animate-slide-up" id="diagnosis-card">
            <div className="chat-diagnosis-header">
              <h4>Diagnosis Summary</h4>
              <RiskBadge level={diagnosis.riskLevel} />
            </div>
            {diagnosis.conditions && (
              <div className="chat-diagnosis-conditions">
                {diagnosis.conditions.slice(0, 3).map((c, i) => (
                  <div key={i} className="chat-diagnosis-condition">
                    <span className="chat-diagnosis-name">{c.name}</span>
                    <div className="chat-diagnosis-bar-wrapper">
                      <div className="chat-diagnosis-bar" style={{ width: `${c.probability}%` }}></div>
                    </div>
                    <span className="chat-diagnosis-prob">{c.probability}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <form className="chat-input-area" onSubmit={handleSend} id="chat-input-form">
          <div className="chat-input-wrapper glass-card">
            <input
              ref={inputRef}
              type="text"
              className="chat-input"
              placeholder="Describe your symptoms..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              id="chat-input"
            />
            <button type="submit" className="btn btn-primary btn-icon" disabled={!input.trim() || loading} id="chat-send-btn">
              <FiSend size={18} />
            </button>
          </div>
          <p className="chat-disclaimer">⚕️ AI-assisted assessment — not a substitute for professional medical advice</p>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;
