/**
 * Login Page — Redesigned with Real Google Sign-In
 * DNA helix background left panel + glassmorphic login form right panel
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import GoogleSignInButton from '../components/GoogleSignInButton';
import './LoginPage.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleGoogleSuccess = async (idToken) => {
    setLoading(true);
    try {
      const userData = await googleLogin(idToken);
      toast.success(`Welcome back, ${userData.name || 'User'}! Signed in with Google.`);
      navigate('/dashboard');
    } catch (err) {
      console.error('Google Sign-In backend error:', err);
      const msg = err.response?.data?.message || err.message || 'Google Sign-In failed';
      toast.error(msg);
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (err) => {
    console.error('Google Sign-In error:', err);
    const msg = typeof err === 'string' ? err : (err.message || 'Google Sign-In error');
    toast.error(msg);
  };

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

            {/* Real Google Sign In */}
            <GoogleSignInButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              disabled={loading}
              text="signin_with"
            />

            {/* Register link */}
            <p className="login-register-link">
              Don't have an account?{' '}
              <Link to="/register" id="login-register-link">Request Access</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
