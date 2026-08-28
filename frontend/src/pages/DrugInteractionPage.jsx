/**
 * Drug Interaction Page
 * Multi-drug input with interaction checking and results display
 */
import { useState, useEffect } from 'react';
import { drugAPI } from '../services/api';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { FiSearch, FiPlus, FiX, FiShield, FiAlertTriangle, FiInfo, FiCheck } from 'react-icons/fi';
import './DrugInteractionPage.css';

const severityConfig = {
  contraindicated: { color: '#7c3aed', bg: 'rgba(124,58,237,0.15)', label: 'Contraindicated', icon: '🚫' },
  major:          { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'Major', icon: '🔴' },
  moderate:       { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: 'Moderate', icon: '🟠' },
  minor:          { color: '#10b981', bg: 'rgba(16,185,129,0.15)', label: 'Minor', icon: '🟡' },
  none:           { color: '#6b7fa3', bg: 'rgba(107,127,163,0.15)', label: 'None', icon: '✅' },
};

const DrugInteractionPage = () => {
  const [selectedDrugs, setSelectedDrugs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allDrugs, setAllDrugs] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const toast = useToast();

  // Load all drugs on mount
  useEffect(() => {
    const loadDrugs = async () => {
      try {
        const res = await drugAPI.searchDrugs('');
        setAllDrugs(res.data.data.drugs);
      } catch (err) {
        console.error('Failed to load drugs:', err);
      }
    };
    loadDrugs();
  }, []);

  // Search drugs
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await drugAPI.searchDrugs(searchQuery);
        setSearchResults(res.data.data.drugs.filter(d =>
          !selectedDrugs.includes(d.name)
        ));
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedDrugs]);

  const addDrug = (drugName) => {
    if (!selectedDrugs.includes(drugName)) {
      setSelectedDrugs(prev => [...prev, drugName]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeDrug = (drugName) => {
    setSelectedDrugs(prev => prev.filter(d => d !== drugName));
    setResults(null);
  };

  const checkInteractions = async () => {
    if (selectedDrugs.length < 2) {
      toast.warning('Please add at least 2 drugs to check interactions');
      return;
    }

    setLoading(true);
    try {
      const res = await drugAPI.checkInteractions(selectedDrugs);
      setResults(res.data.data);
    } catch (err) {
      toast.error('Failed to check interactions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="drugs-page animate-fade-in">
      <div className="drugs-header">
        <div>
          <h1>Drug Interaction Checker</h1>
          <p className="drugs-subtitle">Check for potential interactions between your medications</p>
        </div>
        <FiShield size={32} className="drugs-header-icon" />
      </div>

      {/* Drug Input Section */}
      <div className="drugs-input-section glass-card">
        <h3>Add Medications</h3>

        {/* Selected drugs */}
        <div className="drugs-selected">
          {selectedDrugs.map(drug => (
            <div key={drug} className="drug-pill animate-slide-up">
              <span>{drug}</span>
              <button onClick={() => removeDrug(drug)} className="drug-pill-remove">
                <FiX size={14} />
              </button>
            </div>
          ))}
          {selectedDrugs.length === 0 && (
            <span className="drugs-placeholder">No medications added yet — search and add below</span>
          )}
        </div>

        {/* Search */}
        <div className="drugs-search-wrapper">
          <FiSearch className="drugs-search-icon" size={18} />
          <input
            type="text"
            className="input-field drugs-search"
            placeholder="Search for a medication (e.g., Aspirin, Warfarin)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            id="drug-search-input"
          />
          {searching && <div className="drugs-search-spinner"><LoadingSpinner size="sm" /></div>}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="drugs-search-results">
            {searchResults.map(drug => (
              <button key={drug.name} className="drugs-search-item" onClick={() => addDrug(drug.name)}>
                <div>
                  <span className="drugs-search-name">{drug.name}</span>
                  <span className="drugs-search-category">{drug.category}</span>
                </div>
                <FiPlus size={16} />
              </button>
            ))}
          </div>
        )}

        {/* Check Button */}
        <button
          className="btn btn-primary btn-lg w-full"
          onClick={checkInteractions}
          disabled={selectedDrugs.length < 2 || loading}
          id="check-interactions-btn"
        >
          {loading ? 'Checking...' : `Check Interactions (${selectedDrugs.length} drugs)`}
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="drugs-results animate-slide-up">
          {/* Overall Risk */}
          <div className="drugs-risk glass-card" style={{
            borderColor: severityConfig[results.overallRisk]?.color + '40',
          }}>
            <div className="drugs-risk-badge" style={{
              background: severityConfig[results.overallRisk]?.bg,
              color: severityConfig[results.overallRisk]?.color,
            }}>
              <span style={{ fontSize: '1.5rem' }}>{severityConfig[results.overallRisk]?.icon}</span>
              <div>
                <span className="drugs-risk-level">{severityConfig[results.overallRisk]?.label} Risk</span>
                <span className="drugs-risk-count">{results.totalInteractions} interaction(s) found</span>
              </div>
            </div>
            <p className="drugs-risk-summary" dangerouslySetInnerHTML={{
              __html: results.summary
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br/>')
            }} />
          </div>

          {/* Interaction Details */}
          {results.interactions.length > 0 && (
            <div className="drugs-interactions">
              <h3>Interaction Details</h3>
              {results.interactions.map((inter, i) => (
                <div key={i} className="drugs-interaction glass-card animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="drugs-interaction-header">
                    <div className="drugs-interaction-pair">
                      <span className="drug-pill-small">{inter.drugA}</span>
                      <span className="drugs-interaction-x">✕</span>
                      <span className="drug-pill-small">{inter.drugB}</span>
                    </div>
                    <span className="drugs-severity-badge" style={{
                      background: severityConfig[inter.severity]?.bg,
                      color: severityConfig[inter.severity]?.color,
                    }}>
                      {severityConfig[inter.severity]?.icon} {severityConfig[inter.severity]?.label}
                    </span>
                  </div>
                  <p className="drugs-interaction-desc">{inter.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Available Drugs Grid */}
      <div className="drugs-available">
        <h3>Available Medications in Database</h3>
        <div className="drugs-grid">
          {allDrugs.map(drug => (
            <button
              key={drug.name}
              className={`drugs-grid-item glass-card ${selectedDrugs.includes(drug.name) ? 'drugs-grid-selected' : 'glass-card-hover'}`}
              onClick={() => selectedDrugs.includes(drug.name) ? removeDrug(drug.name) : addDrug(drug.name)}
            >
              {selectedDrugs.includes(drug.name) && <FiCheck size={14} className="drugs-grid-check" />}
              <span className="drugs-grid-name">{drug.name}</span>
              <span className="drugs-grid-category">{drug.category}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DrugInteractionPage;
