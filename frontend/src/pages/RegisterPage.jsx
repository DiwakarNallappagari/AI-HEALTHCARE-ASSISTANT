/**
 * Register Page
 * Multi-field registration with password strength indicator
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { FiUser, FiMail, FiLock, FiArrowRight, FiHeart } from 'react-icons/fi';
import './AuthPages.css';

const RegisterPage = () => {
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    dateOfBirth: '', gender: '', bloodGroup: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) {
      setErrors(prev => ({ ...prev, [e.target.name]: undefined }));
    }
  };

  const getPasswordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthColors = ['', '#ef4444', '#f59e0b', '#eab308', '#10b981', '#00d4aa'];
  const pwdStrength = getPasswordStrength(form.password);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'At least 6 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords don\'t match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const { confirmPassword, ...data } = form;
      await register(data);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-orbs">
        <div className="auth-orb auth-orb-1"></div>
        <div className="auth-orb auth-orb-2"></div>
        <div className="auth-orb auth-orb-3"></div>
      </div>

      <div className="auth-container auth-container-wide animate-slide-up">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
              <rect x="11" y="4" width="6" height="20" rx="2" fill="url(#rg)"/>
              <rect x="4" y="11" width="20" height="6" rx="2" fill="url(#rg)"/>
              <defs><linearGradient id="rg" x1="0" y1="0" x2="28" y2="28"><stop stopColor="#00d4aa"/><stop offset="1" stopColor="#00b4d8"/></linearGradient></defs>
            </svg>
          </div>
          <h1 className="auth-title">Join HealthCare AI</h1>
          <p className="auth-subtitle">Create your account to get started</p>
        </div>

        <form className="auth-form glass-card" onSubmit={handleSubmit} id="register-form">
          <div className="auth-form-grid">
            <div className="input-group">
              <label htmlFor="reg-name">Full Name *</label>
              <div className="auth-input-wrapper">
                <FiUser className="auth-input-icon" size={18} />
                <input type="text" id="reg-name" name="name" className={`input-field auth-input ${errors.name ? 'input-error' : ''}`}
                  placeholder="John Doe" value={form.name} onChange={handleChange} />
              </div>
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className="input-group">
              <label htmlFor="reg-email">Email Address *</label>
              <div className="auth-input-wrapper">
                <FiMail className="auth-input-icon" size={18} />
                <input type="email" id="reg-email" name="email" className={`input-field auth-input ${errors.email ? 'input-error' : ''}`}
                  placeholder="you@example.com" value={form.email} onChange={handleChange} />
              </div>
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="input-group">
              <label htmlFor="reg-password">Password *</label>
              <div className="auth-input-wrapper">
                <FiLock className="auth-input-icon" size={18} />
                <input type="password" id="reg-password" name="password" className={`input-field auth-input ${errors.password ? 'input-error' : ''}`}
                  placeholder="Min 6 characters" value={form.password} onChange={handleChange} />
              </div>
              {form.password && (
                <div className="password-strength">
                  <div className="password-strength-bar">
                    <div className="password-strength-fill" style={{ width: `${pwdStrength * 20}%`, background: strengthColors[pwdStrength] }}></div>
                  </div>
                  <span className="password-strength-label" style={{ color: strengthColors[pwdStrength] }}>{strengthLabels[pwdStrength]}</span>
                </div>
              )}
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            <div className="input-group">
              <label htmlFor="reg-confirm">Confirm Password *</label>
              <div className="auth-input-wrapper">
                <FiLock className="auth-input-icon" size={18} />
                <input type="password" id="reg-confirm" name="confirmPassword" className={`input-field auth-input ${errors.confirmPassword ? 'input-error' : ''}`}
                  placeholder="Re-enter password" value={form.confirmPassword} onChange={handleChange} />
              </div>
              {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
            </div>

            <div className="input-group">
              <label htmlFor="reg-dob">Date of Birth</label>
              <input type="date" id="reg-dob" name="dateOfBirth" className="input-field"
                value={form.dateOfBirth} onChange={handleChange} />
            </div>

            <div className="input-group">
              <label htmlFor="reg-gender">Gender</label>
              <select id="reg-gender" name="gender" className="input-field" value={form.gender} onChange={handleChange}>
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="input-group" style={{ gridColumn: 'span 2' }}>
              <label htmlFor="reg-blood">Blood Group</label>
              <select id="reg-blood" name="bloodGroup" className="input-field" value={form.bloodGroup} onChange={handleChange}>
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option><option value="A-">A-</option>
                <option value="B+">B+</option><option value="B-">B-</option>
                <option value="AB+">AB+</option><option value="AB-">AB-</option>
                <option value="O+">O+</option><option value="O-">O-</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading} id="register-submit">
            {loading ? 'Creating Account...' : 'Create Account'}
            {!loading && <FiArrowRight size={18} />}
          </button>

          <p className="auth-switch">
            Already have an account?{' '}
            <Link to="/login" className="auth-switch-link">Sign in</Link>
          </p>
        </form>

        <div className="auth-footer">
          <FiHeart size={14} style={{ color: 'var(--risk-high)' }} />
          <span>AI-Powered Health Assistant</span>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
