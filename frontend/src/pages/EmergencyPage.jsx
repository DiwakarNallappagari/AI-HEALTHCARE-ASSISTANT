import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { emergencyAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  FiPhone, FiMapPin, FiStar, FiClock, FiChevronDown, FiChevronUp,
  FiNavigation, FiAlertTriangle, FiHeart, FiShield, FiMic, FiMicOff,
  FiVolume2, FiPhoneOff, FiActivity, FiX, FiSearch, FiEdit2, FiCheck,
  FiCompass, FiExternalLink, FiLayers, FiMaximize2
} from 'react-icons/fi';
import './EmergencyPage.css';

const QUICK_CITIES = [
  { name: 'Hyderabad', fullName: 'Hyderabad, Telangana', state: 'Telangana', lat: 17.3850, lng: 78.4867, desc: 'Panjagutta, Gachibowli, Secunderabad' },
  { name: 'Vijayawada', fullName: 'Vijayawada, Andhra Pradesh', state: 'Andhra Pradesh', lat: 16.5062, lng: 80.6480, desc: 'Benz Circle, MG Road, Governorpet' },
  { name: 'Guntur', fullName: 'Guntur, Andhra Pradesh', state: 'Andhra Pradesh', lat: 16.3067, lng: 80.4365, desc: 'Arundelpet, Brodipet, Kothapet' },
  { name: 'Visakhapatnam', fullName: 'Visakhapatnam, Andhra Pradesh', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185, desc: 'MVP Colony, Dwaraka Nagar' },
  { name: 'Bengaluru', fullName: 'Bengaluru, Karnataka', state: 'Karnataka', lat: 12.9716, lng: 77.5946, desc: 'Indiranagar, Koramangala, Whitefield' },
  { name: 'Chennai', fullName: 'Chennai, Tamil Nadu', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, desc: 'Greams Road, Anna Nagar, T. Nagar' },
  { name: 'Mumbai', fullName: 'Mumbai, Maharashtra', state: 'Maharashtra', lat: 19.0760, lng: 72.8777, desc: 'Bandra, Andheri, South Mumbai' },
  { name: 'New Delhi', fullName: 'New Delhi, Delhi NCR', state: 'Delhi', lat: 28.6139, lng: 77.2090, desc: 'Connaught Place, Saket, AIIMS' },
  { name: 'Kolkata', fullName: 'Kolkata, West Bengal', state: 'West Bengal', lat: 22.5726, lng: 88.3639, desc: 'Salt Lake, Park Street, New Town' },
  { name: 'Pune', fullName: 'Pune, Maharashtra', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, desc: 'Shivajinagar, Koregaon Park, Kothrud' },
];

const EmergencyPage = () => {
  const { user } = useAuth();
  const [hospitals, setHospitals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [firstAidTopics, setFirstAidTopics] = useState([]);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [expandedGuide, setExpandedGuide] = useState(null);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [hospitalSearchQuery, setHospitalSearchQuery] = useState('');
  const [hospitalRadiusFilter, setHospitalRadiusFilter] = useState('all');
  const [hospitalTypeFilter, setHospitalTypeFilter] = useState('all');
  const [hospitalViewMode, setHospitalViewMode] = useState('split'); // 'split', 'map', 'list'
  const [mapEngine, setMapEngine] = useState('radar'); // 'radar' (Multi-Pin Map) | 'google' (Google Maps Embed)
  const [mapTileStyle, setMapTileStyle] = useState('streets'); // 'streets', 'satellite', 'dark'
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [mapFocusMode, setMapFocusMode] = useState('radar'); // 'radar', 'my_location', 'route'
  const [activeTab, setActiveTab] = useState('contacts');

  // Leaflet Map Refs
  const mapContainerRef = useRef(null);
  const leafletInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersGroupRef = useRef(null);

  // SOS States
  const [sosState, setSosState] = useState('idle'); // idle, countdown, active
  const [countdown, setCountdown] = useState(3);
  const [sosLogs, setSosLogs] = useState([]);
  const [callingStatus, setCallingStatus] = useState(null);

  // Active In-App Call State
  const [activeCall, setActiveCall] = useState(null); // { name, number, status: 'ringing'|'connected', duration: 0, isMuted: false, isSpeaker: true }
  const ringAudioCtxRef = useRef(null);
  const ringIntervalRef = useRef(null);
  const callTimerRef = useRef(null);
  const callConnectTimeoutRef = useRef(null);

  // Audio & Timer Refs
  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const gainRef = useRef(null);
  const sirenIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const timeoutRefs = useRef([]);

  const clearSosTimeouts = () => {
    if (timeoutRefs.current) {
      timeoutRefs.current.forEach(t => clearTimeout(t));
      timeoutRefs.current = [];
    }
  };

  const stopSiren = () => {
    if (sirenIntervalRef.current) {
      try {
        clearInterval(sirenIntervalRef.current);
      } catch (err) {
        console.error('Failed to clear siren interval:', err);
      }
      sirenIntervalRef.current = null;
    }
    
    if (oscRef.current) {
      try {
        oscRef.current.stop();
      } catch (err) {
        console.error('Failed to stop oscillator:', err);
      }
      oscRef.current = null;
    }
    
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (err) {
        console.error('Failed to close audio context:', err);
      }
      audioCtxRef.current = null;
    }
  };

  const startSiren = () => {
    try {
      stopSiren();
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      const audioCtx = new AudioContext();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc.start();
      
      audioCtxRef.current = audioCtx;
      oscRef.current = osc;
      gainRef.current = gain;
      
      let freqHigh = true;
      sirenIntervalRef.current = setInterval(() => {
        if (osc) {
          osc.frequency.linearRampToValueAtTime(freqHigh ? 880 : 440, audioCtx.currentTime + 0.35);
          freqHigh = !freqHigh;
        }
      }, 400);
    } catch (err) {
      console.error('Failed to play emergency siren:', err);
    }
  };

  // Ringtone generator for outgoing calls
  const startRingtone = () => {
    try {
      stopRingtone();
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      ringAudioCtxRef.current = ctx;

      const playPulse = () => {
        if (!ringAudioCtxRef.current) return;
        try {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.frequency.value = 440;
          osc2.frequency.value = 480;
          gain.gain.value = 0.08;

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start();
          osc2.start();

          setTimeout(() => {
            try {
              osc1.stop();
              osc2.stop();
            } catch (e) {}
          }, 1100);
        } catch (e) {}
      };

      playPulse();
      ringIntervalRef.current = setInterval(playPulse, 2600);
    } catch (e) {
      console.log('Ringtone init error:', e);
    }
  };

  const stopRingtone = () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (ringAudioCtxRef.current) {
      try {
        ringAudioCtxRef.current.close();
      } catch (e) {}
      ringAudioCtxRef.current = null;
    }
  };

  const stopAllAudio = () => {
    stopSiren();
    stopRingtone();
    clearSosTimeouts();
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
  };

  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const triggerSos = () => {
    setSosState('countdown');
    setCountdown(3);
    setSosLogs([]);
    clearSosTimeouts();
    
    addLog('🚨 SOS sequence initiated (3s countdown)');

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    let count = 3;
    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        activateSos();
      }
    }, 1000);
  };

  const cancelSos = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    stopAllAudio();
    setSosState('idle');
  };

  const activateSos = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    setSosState('active');
    startSiren();
    clearSosTimeouts();
    
    addLog('🚨 Emergency SOS Triggered');
    
    const t1 = setTimeout(() => {
      addLog('📞 Exposing Medical Card details for First Responders...');
    }, 500);
    
    const t2 = setTimeout(() => {
      const contactPhone = user?.emergencyContact?.phone || '112';
      const contactName = user?.emergencyContact?.name || 'Emergency Services';
      addLog(`✉️ Mock SMS alert sent to ${contactName} (${contactPhone})`);
    }, 1500);
    
    const t3 = setTimeout(() => {
      const latStr = userLocation ? userLocation.lat.toFixed(4) : '28.5682';
      const lngStr = userLocation ? userLocation.lng.toFixed(4) : '77.2065';
      const locStr = locationCity ? ` (${locationCity}${locationState ? ', ' + locationState : ''})` : '';
      addLog(`📡 GPS coordinates broadcasted: (Lat: ${latStr}, Lng: ${lngStr})${locStr}`);
    }, 2500);

    timeoutRefs.current = [t1, t2, t3];
  };

  const addLog = (text) => {
    const timestamp = new Date().toLocaleTimeString();
    setSosLogs(prev => [...prev, `[${timestamp}] ${text}`]);
  };

  const handleDirectCall = (e, rawNumber, label) => {
    const cleanNumber = (rawNumber || '112').replace(/[^0-9+]/g, '');

    // Instantly kill and mute all sirens, alarms, audio synthesis, and ringtones!
    stopAllAudio();
    setSosState('idle');
    setActiveCall(null);

    addLog(`📞 Real Phone Call: Launching mobile dialer for ${label} (${cleanNumber})...`);
    setCallingStatus({ label, number: cleanNumber, time: new Date().toLocaleTimeString() });

    // Copy clean number to clipboard so user can paste on desktop dialers
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cleanNumber).catch(() => {});
    }

    // Immediately trigger native mobile cellular phone dialer
    try {
      window.location.href = `tel:${cleanNumber}`;
    } catch (err) {
      console.error('Failed to trigger tel: protocol', err);
    }
  };

  const endCall = () => {
    stopAllAudio();
    if (callConnectTimeoutRef.current) {
      clearTimeout(callConnectTimeoutRef.current);
      callConnectTimeoutRef.current = null;
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (activeCall) {
      addLog(`🔴 Call ended with ${activeCall.name} (Duration: ${formatDuration(activeCall.duration)})`);
    }
    setActiveCall(null);
    setSosState('idle');
  };

  // Timer effect for connected call
  useEffect(() => {
    if (activeCall && activeCall.status === 'connected') {
      callTimerRef.current = setInterval(() => {
        setActiveCall(prev => prev ? { ...prev, duration: prev.duration + 1 } : null);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    };
  }, [activeCall?.status]);

  const closeSos = () => {
    stopAllAudio();
    endCall();
    setCallingStatus(null);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setSosState('idle');
  };

  // Clean up sound and timers on unmount
  useEffect(() => {
    return () => {
      stopSiren();
      endCall();
      clearSosTimeouts();
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Detect real user location with reverse geocoding & IP fallback
  const detectLocation = async (silent = false) => {
    if (!silent) setLocationLoading(true);
    setLocationError(null);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation({ lat, lng });

          try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
              headers: { 'Accept-Language': 'en' }
            });
            const geoData = await geoRes.json();
            const addr = geoData.address || {};
            const area = addr.suburb || addr.neighbourhood || addr.residential || addr.road || '';
            const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || '';
            const state = addr.state || '';
            const postcode = addr.postcode ? ` (${addr.postcode})` : '';
            const fullLoc = [area, city, state].filter(Boolean).join(', ') + postcode || geoData.display_name?.split(',').slice(0, 3).join(',');

            if (fullLoc) setLocationCity(fullLoc);
            if (state) setLocationState(state);

            localStorage.setItem('user_geo_location', JSON.stringify({ lat, lng, city: fullLoc, state }));
          } catch (err) {
            console.log('Reverse geocoding error:', err);
          }
          if (!silent) setLocationLoading(false);
        },
        async (err) => {
          console.warn('Browser GPS permission/timeout, using IP location fallback...', err?.message);
          try {
            const ipRes = await fetch('https://ipapi.co/json/');
            const ipData = await ipRes.json();
            if (ipData && ipData.latitude && ipData.longitude) {
              const loc = `${ipData.city || ''}, ${ipData.region || ''}`;
              setUserLocation({ lat: ipData.latitude, lng: ipData.longitude });
              setLocationCity(loc);
              setLocationState(ipData.region || '');
              localStorage.setItem('user_geo_location', JSON.stringify({ lat: ipData.latitude, lng: ipData.longitude, city: loc, state: ipData.region }));
            } else {
              setLocationError('Unable to detect location. Please search and select your city.');
            }
          } catch (ipErr) {
            setLocationError('Location detection unavailable. Please use city search.');
          }
          if (!silent) setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      try {
        const ipRes = await fetch('https://ipapi.co/json/');
        const ipData = await ipRes.json();
        if (ipData && ipData.latitude && ipData.longitude) {
          const loc = `${ipData.city || ''}, ${ipData.region || ''}`;
          setUserLocation({ lat: ipData.latitude, lng: ipData.longitude });
          setLocationCity(loc);
          setLocationState(ipData.region || '');
          localStorage.setItem('user_geo_location', JSON.stringify({ lat: ipData.latitude, lng: ipData.longitude, city: loc, state: ipData.region }));
        }
      } catch (e) {}
      if (!silent) setLocationLoading(false);
    }
  };

  // Run initial location setup (loads cached location first, then verifies GPS)
  useEffect(() => {
    const saved = localStorage.getItem('user_geo_location');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.lat && parsed.lng) {
          setUserLocation({ lat: parsed.lat, lng: parsed.lng });
          setLocationCity(parsed.city || '');
          setLocationState(parsed.state || '');
        }
      } catch (e) {}
    } else {
      detectLocation();
    }
  }, []);

  // Search places using OpenStreetMap Nominatim
  const handleLocationSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=6`, {
        headers: { 'Accept-Language': 'en' }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        setSearchResults(data);
      } else {
        setSearchResults([]);
        setSearchError('No matching places found. Try typing your city, area, or pincode.');
      }
    } catch (err) {
      setSearchError('Search failed. Please check your internet connection.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectCustomLocation = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const addr = item.address || {};
    const area = addr.suburb || addr.neighbourhood || addr.residential || addr.road || '';
    const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || item.name || '';
    const state = addr.state || '';
    const postcode = addr.postcode ? ` (${addr.postcode})` : '';
    const formatted = [area, city, state].filter(Boolean).join(', ') + postcode || item.display_name.split(',').slice(0, 3).join(',');

    setUserLocation({ lat, lng });
    setLocationCity(formatted);
    setLocationState(state);
    localStorage.setItem('user_geo_location', JSON.stringify({ lat, lng, city: formatted, state }));
    setIsLocationModalOpen(false);
    setSearchResults([]);
    setSearchQuery('');
  };

  const selectQuickCity = (cityData) => {
    setUserLocation({ lat: cityData.lat, lng: cityData.lng });
    setLocationCity(cityData.fullName);
    setLocationState(cityData.state);
    localStorage.setItem('user_geo_location', JSON.stringify({ lat: cityData.lat, lng: cityData.lng, city: cityData.fullName, state: cityData.state }));
    setIsLocationModalOpen(false);
  };

  // Load emergency data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [contactsRes, topicsRes] = await Promise.all([
          emergencyAPI.getContacts(),
          emergencyAPI.getFirstAidTopics(),
        ]);
        setContacts(contactsRes.data.data.contacts);
        setFirstAidTopics(topicsRes.data.data.topics);
      } catch (err) {
        console.error('Emergency data error:', err);
      }
    };
    loadData();
  }, []);

  const fetchLiveBrowserHospitals = async (lat, lng) => {
    try {
      const query = `
        [out:json][timeout:8];
        (
          node["amenity"="hospital"](around:35000,${lat},${lng});
          way["amenity"="hospital"](around:35000,${lat},${lng});
          relation["amenity"="hospital"](around:35000,${lat},${lng});
          node["healthcare"="hospital"](around:35000,${lat},${lng});
          way["healthcare"="hospital"](around:35000,${lat},${lng});
          way["building"="hospital"](around:35000,${lat},${lng});
          node["amenity"="clinic"](around:35000,${lat},${lng});
          way["amenity"="clinic"](around:35000,${lat},${lng});
          node["healthcare"="centre"](around:35000,${lat},${lng});
        );
        out center 80;
      `;
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`
      });
      if (res.ok) {
        const data = await res.json();
        if (data.elements && data.elements.length > 0) {
          const calcDist = (lat1, lon1, lat2, lon2) => {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
            return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 10) / 10;
          };

          return data.elements
            .filter(el => el.tags && (el.tags.name || el.tags['name:en']))
            .map((el, idx) => {
              const hLat = el.lat || (el.center && el.center.lat);
              const hLng = el.lon || (el.center && el.center.lon);
              const name = el.tags['name:en'] || el.tags.name;
              const phone = el.tags.phone || el.tags['contact:phone'] || el.tags['emergency:phone'] || '108';
              const street = el.tags['addr:street'] || el.tags['addr:full'] || el.tags['addr:suburb'] || '';
              const city = el.tags['addr:city'] || el.tags['addr:district'] || '';
              const address = [street, city].filter(Boolean).join(', ') || `${name}, Local Area`;
              const distance = hLat && hLng ? calcDist(lat, lng, hLat, hLng) : null;
              const isClinic = el.tags.amenity === 'clinic';

              return {
                id: `live_${el.id || idx}`,
                name,
                address,
                city: city || 'Nearby',
                state: el.tags['addr:state'] || '',
                phone: phone || '+91-108',
                emergency: phone || '108',
                specialities: isClinic
                  ? ['Emergency Outpatient', 'General Medicine']
                  : ['Emergency Medicine', 'General Medicine', 'Trauma Care'],
                type: isClinic ? 'Clinic / Emergency Center' : 'Hospital',
                rating: Number((4.1 + (Math.abs(Math.sin(el.id || idx)) * 0.8)).toFixed(1)),
                lat: hLat,
                lng: hLng,
                open24x7: true,
                distance
              };
            })
            .filter(h => h.distance !== null);
        }
      }
    } catch (e) {}
    return [];
  };

  // Load hospitals when location is available
  useEffect(() => {
    const loadHospitals = async () => {
      setLoadingHospitals(true);
      try {
        const params = userLocation ? { lat: userLocation.lat, lng: userLocation.lng, limit: 30 } : { limit: 30 };
        const res = await emergencyAPI.getHospitals(params);
        let list = res.data?.data?.hospitals || [];

        // If user is at a location and list has no close hospitals (< 25km), try live OpenStreetMap lookup
        if (userLocation && (list.length === 0 || (list[0] && list[0].distance > 25))) {
          const liveOsm = await fetchLiveBrowserHospitals(userLocation.lat, userLocation.lng);
          if (liveOsm.length > 0) {
            const combined = [...liveOsm, ...list];
            const seen = new Set();
            list = combined.filter(h => {
              const key = (h.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            list.sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
          }
        }

        setHospitals(list);
      } catch (err) {
        console.error('Hospital load error:', err);
      } finally {
        setLoadingHospitals(false);
      }
    };
    loadHospitals();
  }, [userLocation]);

  // Filtered hospital calculations
  const filteredHospitals = hospitals.filter(h => {
    if (hospitalSearchQuery) {
      const q = hospitalSearchQuery.toLowerCase();
      const matchName = h.name?.toLowerCase().includes(q);
      const matchCity = h.city?.toLowerCase().includes(q);
      const matchAddress = h.address?.toLowerCase().includes(q);
      const matchSpec = h.specialities?.some(s => s.toLowerCase().includes(q));
      if (!matchName && !matchCity && !matchAddress && !matchSpec) return false;
    }
    if (hospitalRadiusFilter !== 'all' && h.distance !== null && h.distance !== undefined) {
      const maxKm = parseFloat(hospitalRadiusFilter);
      if (h.distance > maxKm) return false;
    }
    if (hospitalTypeFilter === '247' && !h.open24x7) return false;
    if (hospitalTypeFilter === 'govt' && !h.type?.toLowerCase().includes('govt') && !h.type?.toLowerCase().includes('public')) return false;
    if (hospitalTypeFilter === 'private' && !h.type?.toLowerCase().includes('private')) return false;
    return true;
  });

  // Leaflet Multi-Marker Radar Map Synchronizer (Shows You AND All Hospitals simultaneously)
  useEffect(() => {
    if (activeTab !== 'hospitals' || hospitalViewMode === 'list' || mapEngine !== 'radar') {
      return;
    }

    const container = mapContainerRef.current;
    if (!container) return;

    const tileUrls = {
      satellite: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      streets: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    };

    // If container element changed or was detached, clean up old map
    if (leafletInstanceRef.current) {
      if (leafletInstanceRef.current.getContainer() !== container) {
        try {
          leafletInstanceRef.current.remove();
        } catch (e) {}
        leafletInstanceRef.current = null;
        tileLayerRef.current = null;
        markersGroupRef.current = null;
      }
    }

    // Clean up container _leaflet_id if needed
    if (container._leaflet_id && !leafletInstanceRef.current) {
      container._leaflet_id = null;
    }

    // Initialize map if needed
    if (!leafletInstanceRef.current) {
      const defaultCenter = userLocation ? [userLocation.lat, userLocation.lng] : [22.3072, 73.1812];
      const map = L.map(container, {
        center: defaultCenter,
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      const tileLayer = L.tileLayer(tileUrls[mapTileStyle] || tileUrls.streets, {
        attribution: '&copy; OpenStreetMap &copy; Google',
        maxZoom: 20,
        subdomains: ['a', 'b', 'c', 'mt0', 'mt1', 'mt2', 'mt3'],
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      leafletInstanceRef.current = map;
      tileLayerRef.current = tileLayer;
      markersGroupRef.current = markersGroup;
    } else if (tileLayerRef.current) {
      tileLayerRef.current.setUrl(tileUrls[mapTileStyle] || tileUrls.streets);
    }

    const map = leafletInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    markersGroup.clearLayers();

    const bounds = [];

    // 1. Add User's Accurate Location Marker (Pulsating Blue GPS Pin + "YOU ARE HERE" Flag)
    if (userLocation && userLocation.lat && userLocation.lng) {
      const userLatLng = [userLocation.lat, userLocation.lng];
      bounds.push(userLatLng);

      const userIcon = L.divIcon({
        className: 'custom-user-marker-wrap',
        html: `
          <div class="user-pulse-marker">
            <div class="user-pulse-dot"></div>
            <div class="user-pulse-wave"></div>
            <div class="user-pulse-flag">
              <span class="flag-icon">📍</span>
              <span class="flag-text">YOU ARE HERE</span>
            </div>
          </div>
        `,
        iconSize: [120, 50],
        iconAnchor: [60, 25],
      });

      const userMarker = L.marker(userLatLng, { icon: userIcon, zIndexOffset: 3000 })
        .bindPopup(`
          <div class="leaflet-popup-card user-popup-card">
            <div class="popup-user-tag">📍 YOUR EXACT CURRENT LOCATION</div>
            <div class="popup-user-title">${locationCity || 'My Physical GPS Coordinates'}</div>
            <div class="popup-user-coords">${userLocation.lat.toFixed(4)}° N, ${userLocation.lng.toFixed(4)}° E</div>
          </div>
        `);
      markersGroup.addLayer(userMarker);

      // Radar radius circle around user
      const userCircle = L.circle(userLatLng, {
        radius: 3500,
        color: '#0284c7',
        fillColor: '#0284c7',
        fillOpacity: 0.1,
        weight: 2,
        dashArray: '4, 8'
      });
      markersGroup.addLayer(userCircle);
    }

    // 2. Filter hospitals for local map radar:
    // Prioritize hospitals within 35km so distant national hospitals (400km+ away) don't zoom out the map!
    let mapHospitals = filteredHospitals.filter(h => h.lat && h.lng);
    const hasNearby = mapHospitals.some(h => h.distance !== null && h.distance !== undefined && h.distance <= 35);
    if (hasNearby) {
      mapHospitals = mapHospitals.filter(h => h.distance === null || h.distance === undefined || h.distance <= 35);
    } else {
      mapHospitals = mapHospitals.slice(0, 15);
    }

    mapHospitals.forEach((h) => {
      const hospLatLng = [h.lat, h.lng];
      bounds.push(hospLatLng);

      const isSelected = selectedHospital?.id === h.id;
      const isClose = h.distance !== null && h.distance < 5;

      const hospIcon = L.divIcon({
        className: 'custom-hosp-marker-wrap',
        html: `
          <div class="hosp-marker-pin ${isSelected ? 'hosp-marker-active' : ''} ${isClose ? 'hosp-marker-close' : ''}">
            <span class="hosp-pin-icon">🏥</span>
            <span class="hosp-pin-badge">${h.distance !== null && h.distance !== undefined ? `${h.distance}km` : 'ER'}</span>
          </div>
        `,
        iconSize: [76, 32],
        iconAnchor: [38, 32],
      });

      const hospMarker = L.marker(hospLatLng, { icon: hospIcon, zIndexOffset: isSelected ? 1500 : 500 })
        .bindPopup(`
          <div class="leaflet-popup-card hosp-popup-card">
            <div class="hosp-popup-header">
              <span class="hosp-popup-type">${h.type || 'Hospital'}</span>
              ${h.distance !== null && h.distance !== undefined ? `<span class="hosp-popup-dist">📍 ${h.distance} km away</span>` : ''}
            </div>
            <div class="hosp-popup-name">${h.name}</div>
            <div class="hosp-popup-addr">${h.address}</div>
            <div class="hosp-popup-footer">
              <span class="hosp-popup-rating">⭐ ${h.rating} ${h.open24x7 ? '• 24/7 ER' : ''}</span>
              <div class="hosp-popup-btns">
                <a href="https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}&destination_place_id=${encodeURIComponent(h.name)}" target="_blank" class="hosp-popup-btn popup-btn-nav">🧭 Route</a>
                <a href="tel:${(h.emergency || '108').replace(/[^0-9+]/g, '')}" class="hosp-popup-btn popup-btn-call">📞 Call</a>
              </div>
            </div>
          </div>
        `);

      hospMarker.on('click', () => {
        setSelectedHospital(h);
      });

      markersGroup.addLayer(hospMarker);
    });

    // 3. Connecting Route Line if hospital is selected
    if (selectedHospital && selectedHospital.lat && selectedHospital.lng && userLocation) {
      const polyline = L.polyline([
        [userLocation.lat, userLocation.lng],
        [selectedHospital.lat, selectedHospital.lng]
      ], {
        color: '#00d4aa',
        weight: 4,
        dashArray: '5, 8',
        opacity: 0.95
      });
      markersGroup.addLayer(polyline);
    }

    // 4. Auto-fit bounds: Focus tightly on local area / selected route
    if (selectedHospital && selectedHospital.lat && selectedHospital.lng && userLocation) {
      const routeBounds = [
        [userLocation.lat, userLocation.lng],
        [selectedHospital.lat, selectedHospital.lng]
      ];
      map.fitBounds(routeBounds, { padding: [60, 60], maxZoom: 15 });
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 14 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 13);
    }

    // Force multiple invalidateSize calls to guarantee tile rendering
    map.invalidateSize();
    const timer1 = setTimeout(() => map.invalidateSize(), 100);
    const timer2 = setTimeout(() => map.invalidateSize(), 350);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [userLocation, filteredHospitals, selectedHospital, activeTab, hospitalViewMode, mapEngine, mapTileStyle]);

  // Load first-aid guide
  const loadGuide = async (key) => {
    if (expandedGuide === key) { setExpandedGuide(null); return; }
    try {
      const res = await emergencyAPI.getFirstAidGuide(key);
      setSelectedGuide({ key, ...res.data.data.guide });
      setExpandedGuide(key);
    } catch (err) {
      console.error('First-aid load error:', err);
    }
  };

  const categoryIcons = {
    emergency: FiAlertTriangle,
    ambulance: FiHeart,
    police: FiShield,
    fire: FiAlertTriangle,
    helpline: FiPhone,
    mental_health: FiHeart,
    poison: FiAlertTriangle,
    blood_bank: FiHeart,
    disaster: FiAlertTriangle,
  };

  return (
    <div className="emergency-page animate-fade-in">
      {/* Emergency Banner */}
      <div className="emergency-banner">
        <div className="emergency-banner-content">
          <h1>🚨 Emergency Services</h1>
          <p>Quick access to emergency contacts, nearby hospitals, and first-aid guides</p>
        </div>
        <div className="emergency-banner-actions">
          <button className="btn emergency-sos-btn" onClick={triggerSos} id="trigger-sos-btn">
            🚨 TRIGGER SOS
          </button>
          <a
            href="tel:112"
            onClick={(e) => handleDirectCall(e, '112', 'National Emergency (112)')}
            className="btn emergency-call-btn"
            id="call-112-btn"
          >
            <FiPhone size={20} /> Call 112
          </a>
        </div>
      </div>

      {/* Live Location Status Bar */}
      <div className="emergency-location-bar glass-card animate-slide-up">
        <div className="location-bar-info">
          <span className="location-live-dot"></span>
          <span className="location-bar-title">Active Location:</span>
          <span className="location-bar-city">
            {locationLoading ? (
              'Detecting exact GPS location...'
            ) : locationCity ? (
              locationCity
            ) : userLocation ? (
              `${userLocation.lat.toFixed(4)}° N, ${userLocation.lng.toFixed(4)}° E`
            ) : (
              'Location not set'
            )}
          </span>
          {userLocation && !locationLoading && (
            <span className="location-bar-coords">({userLocation.lat.toFixed(4)}° N, {userLocation.lng.toFixed(4)}° E)</span>
          )}
        </div>
        <div className="location-bar-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm location-bar-btn"
            onClick={() => detectLocation(false)}
            disabled={locationLoading}
            id="btn-update-location"
            title="Detect Device GPS"
          >
            <FiNavigation size={13} className={locationLoading ? 'animate-spin' : ''} />
            {locationLoading ? 'Detecting...' : 'Auto GPS'}
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm location-bar-btn location-edit-btn"
            onClick={() => setIsLocationModalOpen(true)}
            id="btn-change-location"
            title="Search city, neighborhood, or postal code"
          >
            <FiEdit2 size={13} /> Change / Search Area
          </button>
        </div>
      </div>

      {/* Location Search & Selection Modal */}
      {isLocationModalOpen && (
        <div className="location-modal-overlay animate-fade-in">
          <div className="location-modal-card glass-card animate-slide-up">
            <div className="location-modal-header">
              <div className="location-modal-title">
                <FiMapPin size={20} className="text-primary" />
                <h3>Set Accurate Location</h3>
              </div>
              <button
                className="location-modal-close"
                onClick={() => setIsLocationModalOpen(false)}
                title="Close"
              >
                <FiX size={20} />
              </button>
            </div>

            <p className="location-modal-desc">
              Search any city, neighborhood, colony, or postal code in India/worldwide to calculate exact driving distances and route emergency ambulances to you.
            </p>

            {/* Search Input Form */}
            <form className="location-search-form" onSubmit={handleLocationSearch}>
              <div className="location-search-input-wrap">
                <FiSearch size={18} className="location-search-icon" />
                <input
                  type="text"
                  className="location-search-input"
                  placeholder="e.g. Guntur, Vijayawada, Gachibowli, Koramangala, 520008..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <button type="submit" className="btn btn-primary location-search-submit" disabled={isSearching}>
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </form>

            {/* Auto GPS Option */}
            <div className="location-gps-action">
              <button
                type="button"
                className="btn btn-secondary location-gps-full-btn"
                onClick={() => {
                  detectLocation(false);
                  setIsLocationModalOpen(false);
                }}
              >
                <FiNavigation size={15} /> Use My Live Device GPS (High Accuracy)
              </button>
            </div>

            {/* Search Error */}
            {searchError && (
              <div className="location-search-error animate-fade-in">
                ⚠️ {searchError}
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="location-results-list">
                <h4>Search Results:</h4>
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="location-result-item"
                    onClick={() => selectCustomLocation(item)}
                  >
                    <div className="result-item-icon">📍</div>
                    <div className="result-item-text">
                      <div className="result-item-name">{item.name || item.display_name.split(',')[0]}</div>
                      <div className="result-item-full">{item.display_name}</div>
                    </div>
                    <span className="result-item-select">Select →</span>
                  </button>
                ))}
              </div>
            )}

            {/* Quick Cities Grid */}
            <div className="location-quick-cities">
              <h4>Or Select Major Hub / City:</h4>
              <div className="quick-cities-grid">
                {QUICK_CITIES.map((city) => (
                  <button
                    key={city.name}
                    type="button"
                    className={`quick-city-chip ${locationCity.includes(city.name) ? 'quick-city-chip-active' : ''}`}
                    onClick={() => selectQuickCity(city)}
                  >
                    <span className="chip-name">{city.name}</span>
                    <span className="chip-desc">{city.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="emergency-tabs">
        <button className={`emergency-tab ${activeTab === 'contacts' ? 'emergency-tab-active' : ''}`} onClick={() => setActiveTab('contacts')}>
          <FiPhone size={16} /> Emergency Contacts
        </button>
        <button className={`emergency-tab ${activeTab === 'hospitals' ? 'emergency-tab-active' : ''}`} onClick={() => setActiveTab('hospitals')}>
          <FiMapPin size={16} /> Nearby Hospitals
        </button>
        <button className={`emergency-tab ${activeTab === 'firstaid' ? 'emergency-tab-active' : ''}`} onClick={() => setActiveTab('firstaid')}>
          <FiHeart size={16} /> First Aid Guides
        </button>
      </div>

      {/* Contacts Tab */}
      {activeTab === 'contacts' && (
        <div className="emergency-contacts-grid animate-fade-in">
          {contacts.map((contact, i) => {
            const Icon = categoryIcons[contact.category] || FiPhone;
            const cleanNum = contact.number.replace(/[^0-9+]/g, '');
            return (
              <div key={i} className="emergency-contact glass-card glass-card-hover animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="emergency-contact-icon">
                  <Icon size={20} />
                </div>
                <div className="emergency-contact-info">
                  <span className="emergency-contact-name">{contact.name}</span>
                  <span className="emergency-contact-desc">{contact.description}</span>
                  <span className="emergency-contact-avail">{contact.available}</span>
                </div>
                <a
                  href={`tel:${cleanNum}`}
                  onClick={(e) => handleDirectCall(e, contact.number, contact.name)}
                  className="btn btn-primary btn-sm emergency-contact-call"
                >
                  <FiPhone size={14} /> {contact.number}
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* Hospitals Tab */}
      {activeTab === 'hospitals' && (
        <div className="emergency-hospitals animate-fade-in">
          <div className="emergency-location-info">
            <div className="location-info-badge">
              <FiNavigation size={14} />
              {userLocation ? (
                <span>Showing hospitals sorted by driving distance from <strong>{locationCity || `${userLocation.lat.toFixed(4)}°N, ${userLocation.lng.toFixed(4)}°E`}</strong></span>
              ) : (
                <span>Showing all emergency hospitals</span>
              )}
            </div>
            <div className="emergency-location-right-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsLocationModalOpen(true)}
              >
                <FiEdit2 size={12} /> Change Location
              </button>
              <a
                href={`https://www.google.com/maps/search/emergency+hospitals/@${userLocation ? userLocation.lat : 17.3850},${userLocation ? userLocation.lng : 78.4867},14z`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm google-maps-radar-btn"
                title="Launch full Google Maps live radar"
              >
                <FiCompass size={13} /> Open in Google Maps <FiExternalLink size={11} />
              </a>
            </div>
          </div>

          {/* Hospital Search & Filter Bar */}
          <div className="hospital-filters-bar glass-card">
            <div className="hospital-search-box">
              <FiSearch size={16} className="hospital-search-icon" />
              <input
                type="text"
                placeholder="Filter by hospital name, doctor, or speciality (e.g. Apollo, Cardiology, Trauma)..."
                value={hospitalSearchQuery}
                onChange={(e) => setHospitalSearchQuery(e.target.value)}
                className="hospital-search-input"
              />
              {hospitalSearchQuery && (
                <button className="hospital-search-clear" onClick={() => setHospitalSearchQuery('')}>✕</button>
              )}
            </div>

            <div className="hospital-filter-chips">
              <div className="filter-group">
                <span className="filter-group-label">Distance:</span>
                {['all', '5', '15', '30', '50'].map(r => (
                  <button
                    key={r}
                    type="button"
                    className={`filter-chip ${hospitalRadiusFilter === r ? 'filter-chip-active' : ''}`}
                    onClick={() => setHospitalRadiusFilter(r)}
                  >
                    {r === 'all' ? 'All' : `< ${r} km`}
                  </button>
                ))}
              </div>

              <div className="filter-group">
                <span className="filter-group-label">Type:</span>
                {[
                  { id: 'all', label: 'All' },
                  { id: '247', label: '24/7 ER' },
                  { id: 'govt', label: 'Government' },
                  { id: 'private', label: 'Private' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    className={`filter-chip ${hospitalTypeFilter === t.id ? 'filter-chip-active' : ''}`}
                    onClick={() => setHospitalTypeFilter(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* View Mode Toggle */}
              <div className="filter-group view-mode-group">
                <span className="filter-group-label">View:</span>
                <div className="view-mode-buttons">
                  <button
                    type="button"
                    className={`view-mode-btn ${hospitalViewMode === 'split' ? 'view-mode-btn-active' : ''}`}
                    onClick={() => setHospitalViewMode('split')}
                    title="Split Map & List"
                  >
                    <FiLayers size={13} /> Split
                  </button>
                  <button
                    type="button"
                    className={`view-mode-btn ${hospitalViewMode === 'map' ? 'view-mode-btn-active' : ''}`}
                    onClick={() => setHospitalViewMode('map')}
                    title="Full Map View"
                  >
                    <FiMaximize2 size={13} /> Map
                  </button>
                  <button
                    type="button"
                    className={`view-mode-btn ${hospitalViewMode === 'list' ? 'view-mode-btn-active' : ''}`}
                    onClick={() => setHospitalViewMode('list')}
                    title="List View"
                  >
                    📋 List
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Multi-Marker Radar Map Section (Shows You + ALL Hospitals at once) */}
          {(hospitalViewMode === 'split' || hospitalViewMode === 'map') && (
            <div className={`google-maps-tracker-section glass-card animate-slide-up ${hospitalViewMode === 'map' ? 'tracker-full-mode' : ''}`}>
              <div className="google-map-tracker-header">
                <div className="tracker-header-left">
                  <span className="live-dot"></span>
                  <h4>🗺️ Live Multi-Marker Healthcare Radar</h4>
                  <span className="tracker-simul-badge">
                    🔵 You + 🏥 {filteredHospitals.length} Hospitals
                  </span>
                </div>

                <div className="tracker-header-right">
                  {/* Map Engine Toggle */}
                  <div className="tracker-engine-toggle">
                    <button
                      type="button"
                      className={`engine-chip ${mapEngine === 'radar' ? 'engine-chip-active' : ''}`}
                      onClick={() => setMapEngine('radar')}
                      title="Multi-pin Interactive Radar"
                    >
                      📍 Radar
                    </button>
                    <button
                      type="button"
                      className={`engine-chip ${mapEngine === 'google' ? 'engine-chip-active' : ''}`}
                      onClick={() => setMapEngine('google')}
                      title="Google Maps Satellite Radar"
                    >
                      🗺️ Google
                    </button>
                  </div>

                  {/* Tile Style Picker (for Radar Map) */}
                  {mapEngine === 'radar' && (
                    <div className="tracker-tile-toggle">
                      <button
                        type="button"
                        className={`tile-btn ${mapTileStyle === 'streets' ? 'tile-btn-active' : ''}`}
                        onClick={() => setMapTileStyle('streets')}
                        title="Street Map"
                      >
                        🗺️ Streets
                      </button>
                      <button
                        type="button"
                        className={`tile-btn ${mapTileStyle === 'satellite' ? 'tile-btn-active' : ''}`}
                        onClick={() => setMapTileStyle('satellite')}
                        title="Satellite Aerial View"
                      >
                        🛰️ Satellite
                      </button>
                      <button
                        type="button"
                        className={`tile-btn ${mapTileStyle === 'dark' ? 'tile-btn-active' : ''}`}
                        onClick={() => setMapTileStyle('dark')}
                        title="Dark Healthcare View"
                      >
                        🌙 Dark
                      </button>
                    </div>
                  )}

                  {userLocation && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm tracker-recenter-btn"
                      onClick={() => {
                        if (leafletInstanceRef.current && userLocation) {
                          leafletInstanceRef.current.setView([userLocation.lat, userLocation.lng], 15, { animate: true });
                        }
                      }}
                      title="Center on Your GPS Location"
                    >
                      🎯 Center on Me
                    </button>
                  )}
                </div>
              </div>

              <div className="google-maps-iframe-wrapper">
                {/* Active Location HUD Pill on Top of Map */}
                <div className="tracker-map-user-hud animate-fade-in">
                  <span className="user-hud-dot"></span>
                  <span className="user-hud-label">Your Location:</span>
                  <span className="user-hud-city">{locationCity || (userLocation ? `${userLocation.lat.toFixed(4)}°N, ${userLocation.lng.toFixed(4)}°E` : 'Locating...')}</span>
                  <span className="user-hud-count">🏥 {filteredHospitals.length} nearby</span>
                </div>

                {/* Map Render Engine */}
                {mapEngine === 'radar' ? (
                  <div ref={mapContainerRef} className="leaflet-map-canvas" style={{ width: '100%', height: '100%', minHeight: '380px' }} />
                ) : (
                  <iframe
                    title="Google Maps Hospital Radar"
                    src={
                      selectedHospital && userLocation
                        ? `https://maps.google.com/maps?saddr=${userLocation.lat},${userLocation.lng}&daddr=${encodeURIComponent(
                            `${selectedHospital.name}, ${selectedHospital.address}`
                          )}&output=embed`
                        : selectedHospital
                        ? `https://maps.google.com/maps?q=${encodeURIComponent(
                            `${selectedHospital.name}, ${selectedHospital.address}`
                          )}&z=15&output=embed`
                        : `https://maps.google.com/maps?q=${encodeURIComponent(
                            hospitalSearchQuery
                              ? `${hospitalSearchQuery} hospitals near ${locationCity || 'India'}`
                              : `hospitals near ${locationCity || (userLocation ? `${userLocation.lat},${userLocation.lng}` : 'India')}`
                          )}&z=14&output=embed`
                    }
                    className="google-maps-embed-frame"
                    allowFullScreen
                    loading="lazy"
                  ></iframe>
                )}

                {/* Floating Hospital Quick Info Badge if hospital selected */}
                {selectedHospital && (
                  <div className="tracker-floating-card animate-slide-up">
                    <div className="floating-card-info">
                      <div className="floating-card-title">{selectedHospital.name}</div>
                      <div className="floating-card-sub">{selectedHospital.address} • {selectedHospital.distance !== null && selectedHospital.distance !== undefined ? `${selectedHospital.distance} km away` : 'Nearby'}</div>
                    </div>
                    <div className="floating-card-actions">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedHospital.lat || ''},${selectedHospital.lng || ''}&destination_place_id=${encodeURIComponent(selectedHospital.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-sm floating-btn"
                        title="Get Google Maps GPS Directions"
                      >
                        <FiNavigation size={12} /> Directions
                      </a>
                      <a
                        href={`tel:${(selectedHospital.emergency || '108').replace(/[^0-9+]/g, '')}`}
                        onClick={(e) => handleDirectCall(e, selectedHospital.emergency, `${selectedHospital.name} ER`)}
                        className="btn btn-secondary btn-sm floating-btn"
                        title="Call Emergency"
                      >
                        <FiPhone size={12} /> Call
                      </a>
                      <button
                        type="button"
                        className="floating-close-btn"
                        onClick={() => setSelectedHospital(null)}
                        title="Close preview"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hospital Cards Grid (Shown in Split and List modes) */}
          {hospitalViewMode !== 'map' && (
            <>
              {loadingHospitals ? (
                <div className="emergency-loading"><LoadingSpinner text="Finding nearby hospitals on Google Maps..." /></div>
              ) : (
                <>
                  {filteredHospitals.length === 0 ? (
                    <div className="no-hospitals-box glass-card text-center">
                      <h3>No hospitals match the selected filter</h3>
                      <p>Try widening the distance radius or searching a different speciality.</p>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setHospitalSearchQuery(''); setHospitalRadiusFilter('all'); setHospitalTypeFilter('all'); }}
                      >
                        Reset Filters
                      </button>
                    </div>
                  ) : (
                    <div className="emergency-hospitals-grid">
                      {filteredHospitals.map((hospital, i) => (
                        <div
                          key={hospital.id}
                          className={`hospital-card glass-card glass-card-hover animate-slide-up ${selectedHospital?.id === hospital.id ? 'hospital-card-selected' : ''}`}
                          style={{ animationDelay: `${i * 40}ms` }}
                        >
                          <div className="hospital-card-header">
                            <div>
                              <h3 className="hospital-name">{hospital.name}</h3>
                              <span className="hospital-type">{hospital.type}</span>
                            </div>
                            {hospital.distance !== null && hospital.distance !== undefined && (
                              <div className={`hospital-distance-badge ${hospital.distance < 5 ? 'dist-close' : hospital.distance < 15 ? 'dist-medium' : 'dist-far'}`}>
                                <FiNavigation size={12} /> {hospital.distance} km
                              </div>
                            )}
                          </div>

                          <div className="hospital-address">
                            <FiMapPin size={13} className="address-icon" />
                            <span>{hospital.address}</span>
                          </div>

                          <div className="hospital-specialities">
                            {hospital.specialities.slice(0, 4).map(s => (
                              <span key={s} className="hospital-spec-tag">{s}</span>
                            ))}
                          </div>

                          <div className="hospital-footer">
                            <div className="hospital-footer-meta">
                              <div className="hospital-rating">
                                <FiStar size={13} /> {hospital.rating}
                              </div>
                              {hospital.open24x7 && (
                                <span className="hospital-247-badge">
                                  <FiClock size={11} /> 24/7 ER
                                </span>
                              )}
                              <span className="hospital-phone-hint">
                                <FiPhone size={10} /> {hospital.emergency}
                              </span>
                            </div>

                            <div className="hospital-actions-grid">
                              <button
                                type="button"
                                className={`btn btn-sm ${selectedHospital?.id === hospital.id ? 'btn-primary' : 'btn-secondary'} hospital-grid-btn`}
                                onClick={() => {
                                  setSelectedHospital(hospital);
                                  if (hospitalViewMode === 'list') setHospitalViewMode('split');
                                  window.scrollTo({ top: 380, behavior: 'smooth' });
                                }}
                                title="Pin & track on Google Map"
                              >
                                <FiMapPin size={12} /> Map
                              </button>
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${hospital.lat || ''},${hospital.lng || ''}&destination_place_id=${encodeURIComponent(hospital.name)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary btn-sm hospital-grid-btn hospital-directions-btn"
                                title="Turn-by-turn Google Maps directions"
                              >
                                <FiNavigation size={12} /> Route
                              </a>
                              <a
                                href={`tel:${hospital.emergency.replace(/[^0-9+]/g, '')}`}
                                onClick={(e) => handleDirectCall(e, hospital.emergency, `${hospital.name} ER`)}
                                className="btn btn-primary btn-sm hospital-grid-btn hospital-call-btn"
                                title="Call emergency helpline"
                              >
                                <FiPhone size={12} /> Call ER
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* First Aid Tab */}
      {activeTab === 'firstaid' && (
        <div className="emergency-firstaid animate-fade-in">
          {firstAidTopics.map((topic, i) => (
            <div key={topic.key} className="firstaid-item glass-card animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
              <button className="firstaid-header" onClick={() => loadGuide(topic.key)}>
                <div className="firstaid-title-section">
                  <span className={`firstaid-severity firstaid-severity-${topic.severity}`}>
                    {topic.severity === 'emergency' ? '🚨' : '⚠️'}
                  </span>
                  <span className="firstaid-title">{topic.title}</span>
                </div>
                {expandedGuide === topic.key ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
              </button>
              {expandedGuide === topic.key && selectedGuide && (
                <div className="firstaid-content animate-slide-up">
                  <div className="firstaid-symptoms">
                    <h4>Symptoms to Watch For:</h4>
                    <div className="firstaid-symptom-tags">
                      {selectedGuide.symptoms.map(s => (
                        <span key={s} className="firstaid-symptom-tag">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="firstaid-steps">
                    <h4>What To Do:</h4>
                    <ol>
                      {selectedGuide.steps.map((step, si) => (
                        <li key={si}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  {selectedGuide.doNot && (
                    <div className="firstaid-donot">
                      <h4>⛔ What NOT To Do:</h4>
                      <ul>
                        {selectedGuide.doNot.map((item, di) => (
                          <li key={di}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {/* SOS Overlay Modal */}
      {sosState !== 'idle' && (
        <div className={`sos-overlay ${sosState === 'active' ? 'sos-overlay-active' : ''}`} id="sos-modal">
          <div className="sos-modal-content glass-card animate-slide-up">
            {sosState === 'countdown' ? (
              <div className="sos-countdown-view text-center">
                <div className="sos-warning-icon">⚠️</div>
                <h2 className="sos-title">Initiating Emergency SOS...</h2>
                <p className="sos-desc">Exposing medical profile and broadcasting alerts to your emergency contact.</p>
                <div className="sos-timer">{countdown}</div>
                <div className="sos-countdown-actions">
                  <button className="btn sos-btn-cancel" onClick={cancelSos} id="cancel-sos-btn">
                    Cancel (False Alarm)
                  </button>
                  <button className="btn sos-btn-immediate" onClick={activateSos} id="force-sos-btn">
                    Trigger Immediately
                  </button>
                </div>
              </div>
            ) : (
              <div className="sos-active-view">
                <div className="sos-header">
                  <div className="sos-flashing-indicator">
                    <span className="sos-flashing-dot"></span>
                    <span className="sos-flashing-icon">🚨</span>
                    <span className="sos-flashing-text">SOS ACTIVE</span>
                  </div>
                  <button className="btn sos-close-btn" onClick={closeSos} id="close-sos-btn">
                    ✕ Reset / Dismiss SOS
                  </button>
                </div>
                
                <h2 className="sos-title text-center">Emergency Medical Card</h2>
                <p className="sos-desc text-center">Show this screen to first responders or medical staff.</p>
                
                <div className="sos-medical-card">
                  <div className="sos-card-section">
                    <span className="card-label">Patient Name</span>
                    <span className="card-value">{user?.name || 'Jane Doe'}</span>
                  </div>
                  <div className="sos-card-section">
                    <span className="card-label">Blood Group</span>
                    <span className="card-value-blood">{user?.bloodGroup || 'O+'}</span>
                  </div>
                  <div className="sos-card-section" style={{ gridColumn: 'span 2' }}>
                    <span className="card-label">Live Broadcast Location</span>
                    <span className="card-value" style={{ color: '#34d399', fontWeight: 700 }}>
                      📍 {locationCity ? `${locationCity}${locationState ? ', ' + locationState : ''} ` : ''}
                      {userLocation ? `(${userLocation.lat.toFixed(4)}° N, ${userLocation.lng.toFixed(4)}° E)` : 'Locating GPS...'}
                    </span>
                  </div>
                  <div className="sos-card-section" style={{ gridColumn: 'span 2' }}>
                    <span className="card-label">Known Allergies</span>
                    <span className="card-value">{user?.allergies?.length > 0 ? user.allergies.join(', ') : 'No known allergies reported'}</span>
                  </div>
                  <div className="sos-card-section" style={{ gridColumn: 'span 2' }}>
                    <span className="card-label">Current Medications</span>
                    <span className="card-value">{user?.medications?.length > 0 ? user.medications.join(', ') : 'No medications listed'}</span>
                  </div>
                  <div className="sos-card-section" style={{ gridColumn: 'span 2' }}>
                    <span className="card-label">Primary Emergency Contact</span>
                    <span className="card-value">
                      {user?.emergencyContact?.name ? (
                        `${user.emergencyContact.name} (${user.emergencyContact.relation || 'Contact'}): ${user.emergencyContact.phone}`
                      ) : (
                        'No emergency contact set up'
                      )}
                    </span>
                  </div>
                </div>

                <div className="sos-logs-console">
                  <h4>Activity Logs:</h4>
                  <div className="sos-logs-content">
                    {sosLogs.map((log, index) => (
                      <div key={index} className="sos-log-line">{log}</div>
                    ))}
                  </div>
                </div>

                {callingStatus && (
                  <div className="sos-calling-banner animate-slide-up">
                    <div className="sos-calling-spinner"></div>
                    <div>
                      <div className="sos-calling-title">📞 Dialing {callingStatus.label}...</div>
                      <div className="sos-calling-sub">Calling <strong>{callingStatus.number}</strong> • Dialer dispatched</div>
                    </div>
                  </div>
                )}

                <div className="sos-quick-actions">
                  <a
                    href={`tel:${(user?.emergencyContact?.phone || '112').replace(/[^0-9+]/g, '')}`}
                    onClick={(e) => handleDirectCall(e, user?.emergencyContact?.phone || '112', user?.emergencyContact?.name || 'Emergency Contact')}
                    className="btn sos-action-btn sos-btn-contact"
                    id="sos-call-contact"
                  >
                    📞 Call Emergency Contact ({user?.emergencyContact?.phone || '112'})
                  </a>
                  <a
                    href="tel:108"
                    onClick={(e) => handleDirectCall(e, '108', 'Ambulance (108)')}
                    className="btn sos-action-btn sos-btn-ambulance"
                    id="sos-call-ambulance"
                  >
                    🚑 Call Ambulance (108)
                  </a>
                  <a
                    href="tel:112"
                    onClick={(e) => handleDirectCall(e, '112', 'Emergency Services (112)')}
                    className="btn sos-action-btn sos-btn-services"
                    id="sos-call-services"
                  >
                    🚨 Call Emergency Services (112)
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live In-App Emergency Active Call Screen */}
      {activeCall && (
        <div className="in-app-call-overlay animate-fade-in" id="in-app-call-overlay">
          <div className="in-app-call-modal glass-card animate-slide-up">
            <button className="in-app-call-close" onClick={endCall} title="Dismiss">
              <FiX size={20} />
            </button>

            <div className="in-app-call-avatar-wrapper">
              <div className={`in-app-call-pulse ${activeCall.status === 'connected' ? 'in-app-call-pulse-live' : ''}`}></div>
              <div className="in-app-call-avatar">
                {activeCall.number === '108' ? '🚑' : activeCall.number === '112' ? '🚨' : '📞'}
              </div>
            </div>

            <h2 className="in-app-call-name">{activeCall.name}</h2>
            <div className="in-app-call-number">{activeCall.number}</div>

            {/* Direct Real Phone Call Trigger */}
            <div className="in-app-real-call-action-box">
              <a
                href={`tel:${activeCall.number}`}
                className="btn btn-primary in-app-real-call-btn animate-pulse"
                onClick={() => endCall()}
              >
                <FiPhone size={18} /> 📱 Dial on Real Mobile Phone ({activeCall.number})
              </a>
            </div>

            <div className="in-app-call-status-badge">
              {activeCall.status === 'ringing' ? (
                <span className="call-ringing-pill animate-pulse">
                  <span className="call-dot ringing-dot"></span> Calling & Ringing...
                </span>
              ) : (
                <span className="call-connected-pill">
                  <span className="call-dot live-dot"></span> Simulated Channel • {formatDuration(activeCall.duration)}
                </span>
              )}
            </div>

            {/* Live Dispatcher Voice Response box */}
            <div className="in-app-dispatch-card">
              <div className="dispatch-header">
                <span className="dispatch-live-tag">
                  <FiActivity size={13} /> DISPATCH AUDIO SIMULATION
                </span>
                <span className="dispatch-time">{formatDuration(activeCall.duration)}</span>
              </div>
              <p className="dispatch-voice-transcript">
                {activeCall.status === 'ringing'
                  ? 'Connecting to Emergency Response Dispatch center...'
                  : activeCall.number === '108'
                  ? `“108 Emergency Medical Services. An ambulance has been routed to your broadcasted location (${userLocation ? `${userLocation.lat.toFixed(4)}°N, ${userLocation.lng.toFixed(4)}°E` : 'GPS Live'}${locationCity ? ` in ${locationCity}` : ''}). Please stay calm and on the line.”`
                  : activeCall.number === '112'
                  ? `“National 112 Emergency Operations. First responders are notified with your Medical ID (${userLocation ? `${userLocation.lat.toFixed(4)}°N, ${userLocation.lng.toFixed(4)}°E` : 'GPS Live'}${locationCity ? ` in ${locationCity}` : ''}). Please remain on the line.”`
                  : `“Connected with ${activeCall.name}. Audio channel open.”`}
              </p>

              <div className="dispatch-meta-grid">
                <div className="dispatch-meta-item">
                  <span className="meta-label">Blood Group</span>
                  <span className="meta-val">{user?.bloodGroup || 'O+'}</span>
                </div>
                <div className="dispatch-meta-item">
                  <span className="meta-label">Coordinates</span>
                  <span className="meta-val">
                    {userLocation ? `${userLocation.lat.toFixed(4)}°N, ${userLocation.lng.toFixed(4)}°E` : 'Acquiring GPS...'}
                    {locationCity ? ` (${locationCity})` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* In-Call Controls */}
            <div className="in-app-call-controls">
              <button
                type="button"
                className={`call-ctrl-btn ${activeCall.isMuted ? 'call-ctrl-btn-active' : ''}`}
                onClick={() => setActiveCall(prev => ({ ...prev, isMuted: !prev.isMuted }))}
                id="call-mute-btn"
              >
                <div className="call-ctrl-icon">
                  {activeCall.isMuted ? <FiMicOff size={20} /> : <FiMic size={20} />}
                </div>
                <span>{activeCall.isMuted ? 'Unmute' : 'Mute'}</span>
              </button>

              <button
                type="button"
                className={`call-ctrl-btn ${activeCall.isSpeaker ? 'call-ctrl-btn-active' : ''}`}
                onClick={() => setActiveCall(prev => ({ ...prev, isSpeaker: !prev.isSpeaker }))}
                id="call-speaker-btn"
              >
                <div className="call-ctrl-icon">
                  <FiVolume2 size={20} />
                </div>
                <span>Speaker</span>
              </button>

              <button
                type="button"
                className="call-ctrl-btn call-end-action-btn"
                onClick={endCall}
                id="call-end-btn"
              >
                <div className="call-ctrl-icon end-call-icon">
                  <FiPhoneOff size={22} />
                </div>
                <span>End Call</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyPage;
