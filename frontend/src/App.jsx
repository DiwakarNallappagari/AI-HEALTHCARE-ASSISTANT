/**
 * App Component
 * Root layout with routing, sidebar, and page transitions
 */
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ChatPage from './pages/ChatPage';
import DrugInteractionPage from './pages/DrugInteractionPage';
import EmergencyPage from './pages/EmergencyPage';
import MedicalHistoryPage from './pages/MedicalHistoryPage';
import ProfilePage from './pages/ProfilePage';
import './App.css';

const publicPaths = ['/', '/login', '/register'];

const AppLayout = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isPublicPage = publicPaths.includes(location.pathname);

  // Public pages — no sidebar
  if (!isAuthenticated || isPublicPage) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* Redirect authenticated users away from public pages */}
        <Route path="*" element={
          isAuthenticated
            ? <Navigate to="/dashboard" replace />
            : <Navigate to="/" replace />
        } />
      </Routes>
    );
  }

  // Authenticated app layout with sidebar
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <div className="app-content">
          <Routes>
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
            <Route path="/chat/:id" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
            <Route path="/drugs" element={<ProtectedRoute><DrugInteractionPage /></ProtectedRoute>} />
            <Route path="/emergency" element={<ProtectedRoute><EmergencyPage /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><MedicalHistoryPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <AppLayout />
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
