/**
 * Dashboard Page
 * Welcome hero, quick actions, recent conversations, health tips
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { chatAPI, historyAPI } from '../services/api';
import RiskBadge from '../components/RiskBadge';
import { FiMessageCircle, FiShield, FiAlertTriangle, FiFileText, FiArrowRight, FiActivity, FiClock, FiTrendingUp } from 'react-icons/fi';
import './DashboardPage.css';

const healthTips = [
  "💧 Drink at least 8 glasses of water daily to stay hydrated.",
  "🏃 Aim for 30 minutes of moderate exercise at least 5 days a week.",
  "😴 Adults need 7-9 hours of sleep for optimal health.",
  "🥗 Include 5 servings of fruits and vegetables in your daily diet.",
  "🧘 Practice mindfulness or meditation for 10 minutes daily to reduce stress.",
  "🩺 Schedule regular health check-ups at least once a year.",
  "🌿 Reduce processed food intake and choose whole grains instead.",
  "👁️ Follow the 20-20-20 rule: Every 20 min, look at something 20 feet away for 20 sec.",
];

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [recordCount, setRecordCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const tipOfDay = healthTips[new Date().getDate() % healthTips.length];
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [convRes, recRes] = await Promise.all([
          chatAPI.getConversations(1, 5),
          historyAPI.getRecords({ limit: 1 }),
        ]);
        setConversations(convRes.data.data.conversations);
        setRecordCount(recRes.data.data.pagination.total);
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const quickActions = [
    { icon: FiMessageCircle, label: 'Symptom Chat', desc: 'Describe your symptoms', path: '/chat', color: '#00d4aa' },
    { icon: FiShield, label: 'Drug Interactions', desc: 'Check medication safety', path: '/drugs', color: '#00b4d8' },
    { icon: FiAlertTriangle, label: 'Emergency', desc: 'Hospitals & first aid', path: '/emergency', color: '#f59e0b' },
    { icon: FiFileText, label: 'Medical History', desc: 'View your records', path: '/history', color: '#a78bfa' },
  ];

  return (
    <div className="dashboard animate-fade-in">
      {/* Hero Section */}
      <div className="dashboard-hero glass-card">
        <div className="dashboard-hero-content">
          <h1 className="dashboard-greeting">{greeting()}, {user?.name?.split(' ')[0] || 'there'}! 👋</h1>
          <p className="dashboard-hero-desc">Your AI health assistant is ready to help. How are you feeling today?</p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/chat')} id="hero-start-chat">
            <FiMessageCircle size={20} />
            Start Health Consultation
            <FiArrowRight size={18} />
          </button>
        </div>
        <div className="dashboard-hero-visual">
          <div className="dashboard-pulse-ring">
            <FiActivity size={40} />
          </div>
        </div>
      </div>

      {/* Health Tip */}
      <div className="dashboard-tip glass-card glass-card-hover">
        <span className="dashboard-tip-label">💡 Health Tip of the Day</span>
        <p className="dashboard-tip-text">{tipOfDay}</p>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-actions">
        {quickActions.map(({ icon: Icon, label, desc, path, color }) => (
          <button key={path} className="dashboard-action glass-card glass-card-hover" onClick={() => navigate(path)} id={`action-${label.toLowerCase().replace(/\s+/g, '-')}`}>
            <div className="dashboard-action-icon" style={{ background: `${color}15`, color }}>
              <Icon size={24} />
            </div>
            <span className="dashboard-action-label">{label}</span>
            <span className="dashboard-action-desc">{desc}</span>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="dashboard-stats">
        <div className="dashboard-stat glass-card">
          <FiMessageCircle size={20} className="dashboard-stat-icon" />
          <div>
            <span className="dashboard-stat-value">{conversations.length}</span>
            <span className="dashboard-stat-label">Conversations</span>
          </div>
        </div>
        <div className="dashboard-stat glass-card">
          <FiFileText size={20} className="dashboard-stat-icon" />
          <div>
            <span className="dashboard-stat-value">{recordCount}</span>
            <span className="dashboard-stat-label">Medical Records</span>
          </div>
        </div>
        <div className="dashboard-stat glass-card">
          <FiTrendingUp size={20} className="dashboard-stat-icon" />
          <div>
            <span className="dashboard-stat-value">Active</span>
            <span className="dashboard-stat-label">Health Status</span>
          </div>
        </div>
      </div>

      {/* Recent Conversations */}
      {conversations.length > 0 && (
        <div className="dashboard-recent">
          <div className="dashboard-section-header">
            <h2>Recent Conversations</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/chat')}>
              View All <FiArrowRight size={14} />
            </button>
          </div>
          <div className="dashboard-recent-list">
            {conversations.map((conv, i) => (
              <div key={conv._id} className="dashboard-recent-item glass-card glass-card-hover animate-slide-up"
                style={{ animationDelay: `${i * 80}ms` }}
                onClick={() => navigate(`/chat/${conv._id}`)}>
                <div className="dashboard-recent-info">
                  <span className="dashboard-recent-title">{conv.title}</span>
                  <span className="dashboard-recent-meta">
                    <FiClock size={12} />
                    {new Date(conv.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                {conv.diagnosis?.riskLevel && <RiskBadge level={conv.diagnosis.riskLevel} size="sm" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
