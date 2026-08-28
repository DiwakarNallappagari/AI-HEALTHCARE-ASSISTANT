/**
 * Login Page — Redesigned
 * DNA helix background left panel + glassmorphic login form right panel
 * Floating status badges: GENE SEQ, DNA MATCH, ANALYSIS, AI STATUS
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { authAPI } from '../services/api';
import './LoginPage.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showMockGoogle, setShowMockGoogle] = useState(false);
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleMockGoogleLogin = async (emailPrefix, name, customEmail) => {
    setLoading(true);
    try {
      const idToken = `mock-google-token-${emailPrefix}`;
      const email = customEmail || `${emailPrefix.replace('_', '.')}@gmail.com`;
      await googleLogin(idToken, { name, email });

      toast.success(`Welcome, ${name}! Signed in with Google.`);
      navigate('/dashboard');
    } catch (err) {
      console.error('Mock Google sign-in failed', err);
      const msg = err.response?.data?.message || err.message || 'Mock Google sign-in failed';
      toast.error(msg);
    } finally {
      setLoading(false);
      setShowMockGoogle(false);
    }
  };

  // Google Identity Services setup
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const handleCredentialResponse = async (response) => {
      try {
        const idToken = response?.credential;
        if (!idToken) throw new Error('No credential returned from Google');

        const res = await authAPI.googleLogin(idToken);
        const { token: newToken, user: userData } = res.data.data;

        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));

        toast.success('Signed in with Google');
        window.location.href = '/dashboard';
      } catch (err) {
        console.error('Google sign-in failed', err);
        toast.error('Google sign-in failed');
      }
    };

    const initialize = () => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
        });
      }
    };

    if (!window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initialize;
      document.body.appendChild(script);
    } else {
      initialize();
    }
  }, [toast]);

  const validate = () => {
    const errs = {};
    if (!email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Invalid email';
    if (!password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid credentials';
      toast.error(msg);
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left Panel — DNA Visual */}
      <div className="login-visual">
        <img src="/dna_helix_login.png" alt="DNA Helix" className="login-dna-img" />
        <div className="login-visual-overlay" />

        {/* Floating badges — corners */}
        <div className="login-badge login-badge-tl">
          <span className="login-badge-label">GENE SEQ</span>
          <span className="login-badge-value">99.8%</span>
        </div>
        <div className="login-badge login-badge-bl">
          <span className="login-badge-dot login-badge-dot-running"></span>
          <div>
            <span className="login-badge-label">ANALYSIS</span>
            <span className="login-badge-value">Running</span>
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="login-form-panel">
        {/* Right-side badges */}
        <div className="login-badge login-badge-tr">
          <span className="login-badge-label">DNA MATCH</span>
          <span className="login-badge-value login-badge-active">Active</span>
        </div>
        <div className="login-badge login-badge-br">
          <span className="login-badge-dot login-badge-dot-online"></span>
          <div>
            <span className="login-badge-label">AI STATUS</span>
            <span className="login-badge-value">Online</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="login-card">
          {/* Header */}
          <div className="login-card-header">
            <h1 className="login-card-title">AI Healthcare Assistant</h1>
            <p className="login-card-subtitle">Secure access to your medical intelligence dashboard</p>
          </div>

          {/* Error Banner */}
          {errors.general && (
            <div className="login-error-banner">{errors.general}</div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} id="login-form" className="login-form">
            {/* Email */}
            <div className="login-field">
              <label htmlFor="login-email" className="login-label">EMAIL ADDRESS</label>
              <input
                type="email"
                id="login-email"
                className={`login-input ${errors.email ? 'login-input-err' : ''}`}
                placeholder="testuser@test.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
                autoComplete="email"
              />
              {errors.email && <span className="login-field-err">{errors.email}</span>}
            </div>

            {/* Password */}
            <div className="login-field">
              <label htmlFor="login-password" className="login-label">PASSWORD</label>
              <input
                type="password"
                id="login-password"
                className={`login-input ${errors.password ? 'login-input-err' : ''}`}
                placeholder="••••••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
                autoComplete="current-password"
              />
              {errors.password && <span className="login-field-err">{errors.password}</span>}
            </div>

            {/* Remember + Forgot */}
            <div className="login-row">
              <label className="login-remember">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                <span>Remember me</span>
              </label>
              <button type="button" className="login-forgot">Forgot password?</button>
            </div>

            {/* Submit */}
            <button type="submit" className="login-submit" disabled={loading} id="login-submit-btn">
              {loading ? (
                <span className="login-submit-loading">
                  <span className="login-loader"></span> Authenticating...
                </span>
              ) : 'Sign In'}
            </button>

            {/* Divider */}
            <div className="login-divider">
              <span>OR CONTINUE WITH</span>
            </div>

            {/* Google */}
            <button
              type="button"
              className="login-google"
              id="login-google-btn"
              onClick={() => {
                const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
                if (clientId && window.google && window.google.accounts && window.google.accounts.id) {
                  window.google.accounts.id.prompt();
                } else {
                  setShowMockGoogle(true);
                }
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </button>

            {/* Register link */}
            <p className="login-register-link">
              Don't have an account?{' '}
              <Link to="/register" id="login-register-link">Request Access</Link>
            </p>
          </form>
        </div>
      </div>

      {/* Mock Google Sign-In Modal */}
      {showMockGoogle && (
        <div className="google-mock-overlay" id="google-mock-overlay">
          <div className="google-mock-modal glass-card animate-slide-up">
            <div className="google-mock-header">
              <svg width="24" height="24" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <h3>Sign in with Google</h3>
            </div>
            <p className="google-mock-desc">Choose a Google Account (Mock Developer Mode)</p>
            
            <div className="google-mock-accounts">
              <button type="button" className="google-mock-account-btn" onClick={() => handleMockGoogleLogin('deepak', 'Deepak', 'deepakveduruparthi@gmail.com')} id="mock-google-deepak-btn">
                <div className="google-mock-avatar" style={{ background: 'linear-gradient(135deg, #00d4aa, #00b4d8)', color: '#0a0e27', fontWeight: 800 }}>D</div>
                <div className="google-mock-account-info">
                  <span className="google-mock-name">Deepak</span>
                  <span className="google-mock-email">deepakveduruparthi@gmail.com</span>
                </div>
              </button>

              <button type="button" className="google-mock-account-btn" onClick={() => handleMockGoogleLogin('jane_doe', 'Jane Doe', 'jane.doe@gmail.com')} id="mock-google-jane-btn">
                <div className="google-mock-avatar">JD</div>
                <div className="google-mock-account-info">
                  <span className="google-mock-name">Jane Doe</span>
                  <span className="google-mock-email">jane.doe@gmail.com</span>
                </div>
              </button>

              <button type="button" className="google-mock-account-btn" onClick={() => handleMockGoogleLogin('bob_smith', 'Bob Smith', 'bob.smith@gmail.com')} id="mock-google-bob-btn">
                <div className="google-mock-avatar">BS</div>
                <div className="google-mock-account-info">
                  <span className="google-mock-name">Bob Smith</span>
                  <span className="google-mock-email">bob.smith@gmail.com</span>
                </div>
              </button>
            </div>
            
            <button type="button" className="btn btn-secondary w-full google-mock-cancel" onClick={() => setShowMockGoogle(false)} id="mock-google-cancel-btn">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
