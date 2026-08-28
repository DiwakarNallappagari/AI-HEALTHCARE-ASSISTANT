/**
 * Medical History Page
 * Timeline view of medical records with CRUD modal
 */
import { useState, useEffect } from 'react';
import { historyAPI } from '../services/api';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';
import { FiPlus, FiEdit2, FiTrash2, FiFilter, FiFileText, FiCalendar, FiUser, FiMapPin } from 'react-icons/fi';
import './MedicalHistoryPage.css';

const recordTypes = [
  { value: 'diagnosis', label: 'Diagnosis', icon: '🩺', color: '#3b82f6' },
  { value: 'prescription', label: 'Prescription', icon: '💊', color: '#10b981' },
  { value: 'lab_result', label: 'Lab Result', icon: '🧪', color: '#f59e0b' },
  { value: 'vaccination', label: 'Vaccination', icon: '💉', color: '#a78bfa' },
  { value: 'allergy', label: 'Allergy', icon: '⚠️', color: '#ef4444' },
  { value: 'surgery', label: 'Surgery', icon: '🔪', color: '#ec4899' },
];

const MedicalHistoryPage = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [filterType, setFilterType] = useState('');
  const toast = useToast();

  const initialForm = { type: 'diagnosis', title: '', description: '', date: new Date().toISOString().split('T')[0], doctor: '', facility: '' };
  const [form, setForm] = useState(initialForm);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const params = filterType ? { type: filterType } : {};
      const res = await historyAPI.getRecords(params);
      setRecords(res.data.data.records);
    } catch (err) {
      console.error('Load records error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRecords(); }, [filterType]);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const openAddModal = () => {
    setEditRecord(null);
    setForm(initialForm);
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditRecord(record);
    setForm({
      type: record.type, title: record.title, description: record.description || '',
      date: new Date(record.date).toISOString().split('T')[0],
      doctor: record.doctor || '', facility: record.facility || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editRecord) {
        await historyAPI.updateRecord(editRecord._id, form);
        toast.success('Record updated');
      } else {
        await historyAPI.createRecord(form);
        toast.success('Record added');
      }
      setModalOpen(false);
      loadRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save record');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await historyAPI.deleteRecord(id);
      toast.success('Record deleted');
      loadRecords();
    } catch (err) {
      toast.error('Failed to delete record');
    }
  };

  const getTypeConfig = (type) => recordTypes.find(t => t.value === type) || recordTypes[0];

  return (
    <div className="history-page animate-fade-in">
      <div className="history-header">
        <div>
          <h1>Medical History</h1>
          <p className="history-subtitle">Track and manage your medical records</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal} id="add-record-btn">
          <FiPlus size={18} /> Add Record
        </button>
      </div>

      {/* Filters */}
      <div className="history-filters">
        <button className={`history-filter ${!filterType ? 'history-filter-active' : ''}`} onClick={() => setFilterType('')}>All</button>
        {recordTypes.map(t => (
          <button key={t.value} className={`history-filter ${filterType === t.value ? 'history-filter-active' : ''}`} onClick={() => setFilterType(t.value)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Records Timeline */}
      {loading ? (
        <div className="history-loading"><LoadingSpinner text="Loading records..." /></div>
      ) : records.length === 0 ? (
        <div className="history-empty glass-card">
          <FiFileText size={48} />
          <h3>No medical records yet</h3>
          <p>Start adding your medical history to keep track of your health journey.</p>
          <button className="btn btn-primary" onClick={openAddModal}>
            <FiPlus size={16} /> Add Your First Record
          </button>
        </div>
      ) : (
        <div className="history-timeline">
          {records.map((record, i) => {
            const typeConfig = getTypeConfig(record.type);
            return (
              <div key={record._id} className="history-record glass-card glass-card-hover animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="history-record-marker" style={{ background: typeConfig.color }}></div>
                <div className="history-record-content">
                  <div className="history-record-header">
                    <div className="history-record-type" style={{ background: typeConfig.color + '20', color: typeConfig.color }}>
                      {typeConfig.icon} {typeConfig.label}
                    </div>
                    <div className="history-record-actions">
                      <button className="btn btn-icon btn-ghost btn-sm" onClick={() => openEditModal(record)} title="Edit">
                        <FiEdit2 size={14} />
                      </button>
                      <button className="btn btn-icon btn-ghost btn-sm" onClick={() => handleDelete(record._id)} title="Delete">
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <h3 className="history-record-title">{record.title}</h3>
                  {record.description && <p className="history-record-desc">{record.description}</p>}
                  <div className="history-record-meta">
                    <span><FiCalendar size={12} /> {new Date(record.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    {record.doctor && <span><FiUser size={12} /> Dr. {record.doctor}</span>}
                    {record.facility && <span><FiMapPin size={12} /> {record.facility}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editRecord ? 'Edit Record' : 'Add Medical Record'} size="md">
        <form onSubmit={handleSubmit} className="history-form">
          <div className="input-group">
            <label htmlFor="record-type">Record Type *</label>
            <select id="record-type" name="type" className="input-field" value={form.type} onChange={handleChange}>
              {recordTypes.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="record-title">Title *</label>
            <input type="text" id="record-title" name="title" className="input-field" placeholder="e.g., Annual Blood Test" value={form.title} onChange={handleChange} required />
          </div>
          <div className="input-group">
            <label htmlFor="record-date">Date *</label>
            <input type="date" id="record-date" name="date" className="input-field" value={form.date} onChange={handleChange} required />
          </div>
          <div className="input-group">
            <label htmlFor="record-desc">Description</label>
            <textarea id="record-desc" name="description" className="input-field" placeholder="Detailed notes..." value={form.description} onChange={handleChange} rows={3} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="input-group">
              <label htmlFor="record-doctor">Doctor</label>
              <input type="text" id="record-doctor" name="doctor" className="input-field" placeholder="Doctor name" value={form.doctor} onChange={handleChange} />
            </div>
            <div className="input-group">
              <label htmlFor="record-facility">Facility</label>
              <input type="text" id="record-facility" name="facility" className="input-field" placeholder="Hospital name" value={form.facility} onChange={handleChange} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-lg w-full">
            {editRecord ? 'Update Record' : 'Add Record'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default MedicalHistoryPage;
