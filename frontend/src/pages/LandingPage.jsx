/**
 * Landing Page — Cover Page with Real Project Features
 */
import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

const LandingPage = () => {
  const canvasRef = useRef(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const particles = [];
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        r: Math.random() * 2 + 0.5, dx: (Math.random() - 0.5) * 0.3, dy: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.5 + 0.1, color: Math.random() > 0.5 ? '0,180,216' : '0,212,170',
      });
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${p.opacity})`; ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  const features = [
    {
      icon: '🧠',
      tag: 'CORE',
      title: 'AI Symptom Analysis',
      desc: 'Describe symptoms in plain English. Our engine maps 50+ symptom patterns to 40+ conditions, assigns probability scores, and classifies risk as Low, Medium, High, or Emergency.',
      pills: ['50+ Symptoms', '40+ Conditions', 'Risk Classification', 'Probability Score'],
      color: '#00d4aa',
    },
    {
      icon: '💊',
      tag: 'SAFETY',
      title: 'Drug Interaction Checker',
      desc: 'Add multiple medications and instantly detect dangerous interactions using a graph-based engine covering 24 drugs across 8 categories with real clinical severity ratings.',
      pills: ['24 Drugs Mapped', 'Major / Moderate / Minor', 'Contraindication Alert', 'Multi-Drug Support'],
      color: '#00b4d8',
    },
    {
      icon: '🚑',
      tag: 'EMERGENCY',
      title: 'Emergency Response Hub',
      desc: 'One-tap access to 14 Indian emergency contacts, GPS-sorted nearby hospitals, and 12 expandable first-aid guides with step-by-step instructions and "do not do" warnings.',
      pills: ['14 Emergency Contacts', '25 Hospitals', '12 First-Aid Guides', 'GPS Proximity'],
      color: '#f59e0b',
    },
    {
      icon: '💬',
      tag: 'INTERFACE',
      title: 'Real-Time Chat Interface',
      desc: 'ChatGPT-style conversational interface stores your full diagnosis history, with a Diagnosis Summary card showing conditions, probabilities, and recommendations after each session.',
      pills: ['Chat History', 'Diagnosis Summary', 'AI Recommendations', 'Follow-up Questions'],
      color: '#a78bfa',
    },
    {
      icon: '📋',
      tag: 'RECORDS',
      title: 'Medical History Timeline',
      desc: 'Maintain a lifelong health record with 6 record types — Diagnosis, Prescription, Lab Results, Vaccination, Allergy, and Surgery — in a visual timeline with full CRUD support.',
      pills: ['6 Record Types', 'Timeline View', 'Doctor & Facility Notes', 'Filter by Type'],
      color: '#ec4899',
    },
    {
      icon: '🔒',
      tag: 'SECURITY',
      title: 'Secure Authentication',
      desc: 'JWT-based authentication with bcrypt password hashing (salt rounds: 12), protected API routes, and a complete user profile with blood group, allergies, and emergency contacts.',
      pills: ['JWT Tokens', 'bcrypt Hashing', 'Protected Routes', 'Role-based Access'],
      color: '#10b981',
    },
  ];

  const steps = [
    { n: '01', title: 'Create your account', desc: 'Register with your name, blood group, allergies, and emergency contact in under 60 seconds.' },
    { n: '02', title: 'Describe your symptoms', desc: 'Type what you feel in plain language — our AI engine analyzes and responds in real time.' },
    { n: '03', title: 'Get your diagnosis', desc: 'Receive a ranked list of possible conditions with probabilities and an Emergency / High / Medium / Low risk badge.' },
    { n: '04', title: 'Check your medications', desc: 'Add your drugs to the interaction checker and instantly see if any combination is dangerous.' },
    { n: '05', title: 'Find emergency help', desc: 'In an emergency, one tap shows you the nearest hospitals, first-aid steps, and national helplines.' },
  ];

  const stats = [
    { value: '50+', label: 'Symptom Patterns' },
    { value: '40+', label: 'Medical Conditions' },
    { value: '24', label: 'Drugs in Graph' },
    { value: '25', label: 'Partner Hospitals' },
    { value: '14', label: 'Emergency Contacts' },
    { value: '12', label: 'First-Aid Guides' },
  ];

  return (
    <div className="landing-page">
      <canvas ref={canvasRef} className="landing-canvas" />
      <div className="landing-hero-bg" />

      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="landing-nav" id="landing-navbar">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <div className="landing-logo-icon">
              <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                <rect x="11" y="4" width="6" height="20" rx="2" fill="url(#nl)" />
                <rect x="4" y="11" width="20" height="6" rx="2" fill="url(#nl)" />
                <defs><linearGradient id="nl" x1="0" y1="0" x2="28" y2="28"><stop stopColor="#00d4aa"/><stop offset="1" stopColor="#00b4d8"/></linearGradient></defs>
              </svg>
            </div>
            <span className="landing-logo-text">AI Healthcare Assistant</span>
          </div>
          <div className="landing-nav-links">
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#how-it-works" className="landing-nav-link">How It Works</a>
            <a href="#stats" className="landing-nav-link">About</a>
            <Link to="/login" className="landing-nav-link" id="nav-login-link">Log In</Link>
            <Link to="/register" className="landing-nav-btn" id="nav-signup-btn">Sign Up</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ─────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-badge">
            <span className="landing-badge-icon">⚡</span>
            INTELLIGENCE FOR MODERN MEDICINE
          </div>
          <h1 className="landing-headline">
            Your Health,<br />
            <span className="landing-headline-accent">AI Enhanced.</span>
          </h1>
          <p className="landing-subtitle">
            A production-grade healthcare platform combining AI symptom diagnosis,
            real-time drug interaction detection, emergency response, and secure
            medical history — all in one intelligent assistant.
          </p>
          <div className="landing-ctas">
            <Link to="/login" className="landing-cta-primary" id="hero-launch-btn">
              Launch Dashboard <span className="landing-cta-arrow">›</span>
            </Link>
            <Link to="/register" className="landing-cta-secondary" id="hero-register-btn">
              Create Free Account
            </Link>
          </div>

          {/* Inline trust badges */}
          <div className="landing-trust-row">
            <span className="landing-trust-item">🔒 JWT Secured</span>
            <span className="landing-trust-sep">·</span>
            <span className="landing-trust-item">🏥 Indian Hospital Data</span>
            <span className="landing-trust-sep">·</span>
            <span className="landing-trust-item">⚡ Real-time AI Engine</span>
            <span className="landing-trust-sep">·</span>
            <span className="landing-trust-item">📱 Fully Responsive</span>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ─────────────────────────────────────────── */}
      <section className="landing-stats-bar" id="stats">
        {stats.map((s, i) => (
          <div key={i} className="landing-stats-item">
            <span className="landing-stats-value">{s.value}</span>
            <span className="landing-stats-label">{s.label}</span>
          </div>
        ))}
      </section>

      {/* ── Features Grid ─────────────────────────────────────── */}
      <section className="landing-features-section" id="features">
        <div className="landing-section-header">
          <span className="landing-section-tag">WHAT'S INSIDE</span>
          <h2 className="landing-section-title">Everything Your Health Needs</h2>
          <p className="landing-section-desc">
            Six fully integrated modules, each powered by real data and a live backend — not mock demos.
          </p>
        </div>
        <div className="landing-features-grid">
          {features.map((f, i) => (
            <div key={i} className="landing-feature-card" style={{ '--accent': f.color, animationDelay: `${i * 80}ms` }}>
              <div className="landing-feature-top">
                <div className="landing-feature-icon-wrap" style={{ background: f.color + '18', border: `1px solid ${f.color}30` }}>
                  <span className="landing-feature-emoji">{f.icon}</span>
                </div>
                <span className="landing-feature-tag" style={{ color: f.color, background: f.color + '15' }}>{f.tag}</span>
              </div>
              <h3 className="landing-feature-title">{f.title}</h3>
              <p className="landing-feature-desc">{f.desc}</p>
              <div className="landing-feature-pills">
                {f.pills.map((p, j) => (
                  <span key={j} className="landing-feature-pill" style={{ borderColor: f.color + '40', color: f.color }}>{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────── */}
      <section className="landing-how" id="how-it-works">
        <div className="landing-section-header">
          <span className="landing-section-tag">WORKFLOW</span>
          <h2 className="landing-section-title">How It Works</h2>
          <p className="landing-section-desc">From registration to diagnosis in under 2 minutes.</p>
        </div>
        <div className="landing-steps">
          {steps.map((s, i) => (
            <div key={i} className="landing-step">
              <div className="landing-step-number">{s.n}</div>
              <div className="landing-step-content">
                <h4 className="landing-step-title">{s.title}</h4>
                <p className="landing-step-desc">{s.desc}</p>
              </div>
              {i < steps.length - 1 && <div className="landing-step-connector" />}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────── */}
      <section className="landing-cta-banner">
        <div className="landing-cta-banner-inner">
          <h2>Ready to Take Control of Your Health?</h2>
          <p>Join thousands of users who trust AI Healthcare Assistant for smarter health decisions.</p>
          <div className="landing-ctas">
            <Link to="/register" className="landing-cta-primary" id="bottom-register-btn">
              Get Started — It's Free <span className="landing-cta-arrow">›</span>
            </Link>
            <Link to="/login" className="landing-cta-secondary">Sign In</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <span>© 2026 AI Healthcare Assistant — Built with Node.js, React, MongoDB & AI</span>
        <Link to="/login" className="landing-footer-link">Sign In</Link>
        <Link to="/register" className="landing-footer-link">Register</Link>
      </footer>
    </div>
  );
};

export default LandingPage;
