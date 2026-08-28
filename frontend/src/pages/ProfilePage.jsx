/**
 * Profile Page
 * User info editor, allergies, medications, emergency contact
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { FiUser, FiMail, FiCalendar, FiHeart, FiShield, FiSave, FiPlus, FiX } from 'react-icons/fi';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', dateOfBirth: '', gender: '', bloodGroup: '',
    allergies: [], medications: [],
    emergencyContact: { name: '', phone: '', relation: '' },
  });
  const [newAllergy, setNewAllergy] = useState('');
  const [newMedication, setNewMedication] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
        gender: user.gender || '',
        bloodGroup: user.bloodGroup || '',
        allergies: user.allergies || [],
        medications: user.medications || [],
        emergencyContact: user.emergencyContact || { name: '', phone: '', relation: '' },
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('ec_')) {
      setForm(prev => ({
        ...prev,
        emergencyContact: { ...prev.emergencyContact, [name.replace('ec_', '')]: value },
      }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const addItem = (type, value, setter) => {
    if (value.trim()) {
      setForm(prev => ({ ...prev, [type]: [...prev[type], value.trim()] }));
      setter('');
    }
  };

  const removeItem = (type, index) => {
    setForm(prev => ({ ...prev, [type]: prev[type].filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(form);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page animate-fade-in">
      <div className="profile-header">
        <div className="profile-avatar-large">
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div>
          <h1>{user?.name || 'User'}</h1>
          <p className="profile-email"><FiMail size={14} /> {user?.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="profile-form">
        {/* Personal Information */}
        <div className="profile-section glass-card">
          <h2><FiUser size={18} /> Personal Information</h2>
          <div className="profile-grid">
            <div className="input-group">
              <label>Full Name</label>
              <input type="text" name="name" className="input-field" value={form.name} onChange={handleChange} />
            </div>
            <div className="input-group">
              <label>Date of Birth</label>
              <input type="date" name="dateOfBirth" className="input-field" value={form.dateOfBirth} onChange={handleChange} />
            </div>
            <div className="input-group">
              <label>Gender</label>
              <select name="gender" className="input-field" value={form.gender} onChange={handleChange}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="input-group">
              <label>Blood Group</label>
              <select name="bloodGroup" className="input-field" value={form.bloodGroup} onChange={handleChange}>
                <option value="">Select</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Allergies */}
        <div className="profile-section glass-card">
          <h2><FiShield size={18} /> Allergies</h2>
          <div className="profile-tags">
            {form.allergies.map((a, i) => (
              <span key={i} className="profile-tag profile-tag-danger">
                {a} <button type="button" onClick={() => removeItem('allergies', i)}><FiX size={12} /></button>
              </span>
            ))}
          </div>
          <div className="profile-add-row">
            <input type="text" className="input-field" placeholder="Add allergy..." value={newAllergy} onChange={e => setNewAllergy(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem('allergies', newAllergy, setNewAllergy))} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => addItem('allergies', newAllergy, setNewAllergy)}>
              <FiPlus size={14} />
            </button>
          </div>
        </div>

        {/* Medications */}
        <div className="profile-section glass-card">
          <h2><FiHeart size={18} /> Current Medications</h2>
          <div className="profile-tags">
            {form.medications.map((m, i) => (
              <span key={i} className="profile-tag profile-tag-accent">
                {m} <button type="button" onClick={() => removeItem('medications', i)}><FiX size={12} /></button>
              </span>
            ))}
          </div>
          <div className="profile-add-row">
            <input type="text" className="input-field" placeholder="Add medication..." value={newMedication} onChange={e => setNewMedication(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem('medications', newMedication, setNewMedication))} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => addItem('medications', newMedication, setNewMedication)}>
              <FiPlus size={14} />
            </button>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="profile-section glass-card">
          <h2><FiCalendar size={18} /> Emergency Contact</h2>
          <div className="profile-grid profile-grid-3">
            <div className="input-group">
              <label>Contact Name</label>
              <input type="text" name="ec_name" className="input-field" placeholder="Full name" value={form.emergencyContact.name} onChange={handleChange} />
            </div>
            <div className="input-group">
              <label>Phone Number</label>
              <input type="tel" name="ec_phone" className="input-field" placeholder="+91-XXXXXXXXXX" value={form.emergencyContact.phone} onChange={handleChange} />
            </div>
            <div className="input-group">
              <label>Relation</label>
              <input type="text" name="ec_relation" className="input-field" placeholder="e.g., Spouse" value={form.emergencyContact.relation} onChange={handleChange} />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg" disabled={loading} id="save-profile-btn">
          <FiSave size={18} /> {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
};

export default ProfilePage;
