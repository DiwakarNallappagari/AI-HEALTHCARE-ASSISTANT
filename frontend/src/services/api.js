/**
 * API Service Layer
 * Axios instance with auth interceptor and API functions
 */
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// Google sign-in
authAPI.googleLogin = (idToken, extra = {}) => api.post('/auth/google', { idToken, ...extra });

// ─── Chat API ────────────────────────────────────────────────
export const chatAPI = {
  analyze: (message, conversationId) =>
    api.post('/chat/analyze', { message, conversationId }),
  getConversations: (page = 1, limit = 20) =>
    api.get(`/chat/conversations?page=${page}&limit=${limit}`),
  getConversation: (id) => api.get(`/chat/conversations/${id}`),
  deleteConversation: (id) => api.delete(`/chat/conversations/${id}`),
};

// ─── Drug API ────────────────────────────────────────────────
export const drugAPI = {
  checkInteractions: (drugs) => api.post('/drugs/check', { drugs }),
  searchDrugs: (query) => api.get(`/drugs/search?q=${encodeURIComponent(query)}`),
  getDrugDetails: (name) => api.get(`/drugs/${encodeURIComponent(name)}`),
};

// ─── Emergency API ───────────────────────────────────────────
export const emergencyAPI = {
  getHospitals: (params = {}) =>
    api.get('/emergency/hospitals', { params }),
  getContacts: (category) =>
    api.get('/emergency/contacts', { params: { category } }),
  getFirstAidTopics: () => api.get('/emergency/first-aid'),
  getFirstAidGuide: (condition) =>
    api.get(`/emergency/first-aid/${encodeURIComponent(condition)}`),
};

// ─── Medical History API ─────────────────────────────────────
export const historyAPI = {
  getRecords: (params = {}) =>
    api.get('/history/records', { params }),
  createRecord: (data) => api.post('/history/records', data),
  updateRecord: (id, data) => api.put(`/history/records/${id}`, data),
  deleteRecord: (id) => api.delete(`/history/records/${id}`),
};

export default api;
