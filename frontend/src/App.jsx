import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Sidebar from './components/Sidebar';
import { AlertTriangle, Clock } from 'lucide-react';

// ── Eager loads (needed for first paint) ──
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// ── Lazy-loaded pages (code-split per route) ──
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const CityOverviewPage = lazy(() => import('./pages/CityOverviewPage'));
const CameraConfigPage = lazy(() => import('./pages/CameraConfigPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const AmbulanceDriverPage = lazy(() => import('./pages/AmbulanceDriverPage'));
const AboutSystemPage = lazy(() => import('./pages/AboutSystemPage'));

// ── Route-level loading spinner ──
function RouteLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-10 h-10 rounded-full border-2 border-[#E50914]/20 border-t-[#E50914] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-[#E50914]/30 animate-pulse" />
          </div>
        </div>
        <p className="text-[10px] text-gray-600 uppercase tracking-[0.3em] font-bold">Loading Module</p>
      </div>
    </div>
  );
}

// ── Protected Route Wrapper ──
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-[#E50914]/20 border-t-[#E50914] animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-[#E50914]/30 animate-pulse" />
            </div>
          </div>
          <p className="text-xs text-gray-600 uppercase tracking-[0.3em] font-bold">Loading System</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return children;
}

// ── Page Transition Wrapper ──
function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

// ── Top Bar with Live Clock ──
function TopBar() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex justify-between items-center px-6 lg:px-8 py-4 bg-[#0a0a0a] border-b border-white/[0.04] sticky top-0 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div></div>
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-[#0071EB]" />
        <span className="text-xs text-gray-500 uppercase tracking-widest font-bold hidden md:inline-block mr-2 mt-[2px]">Live System Clock</span>
        <span className="text-white font-mono text-sm tracking-widest bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.06]">
          {time.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

// ── App Layout ──
function AppLayout() {
  const [manualMode, setManualMode] = useState(false);

  // Voice synthesis on manual override toggle (matching old project behavior)
  const handleManualToggle = (checked) => {
    setManualMode(checked);
    try {
      const msg = new SpeechSynthesisUtterance(`Manual Override ${checked ? 'Activated' : 'Deactivated'}`);
      window.speechSynthesis.speak(msg);
    } catch {}
  };

  return (
    <div className="flex h-screen bg-[#141414] text-white overflow-hidden" style={{ fontFamily: 'var(--font-body)' }}>
      <Sidebar manualMode={manualMode} onToggleManual={handleManualToggle} />
      <main className="flex-1 overflow-y-auto relative tv-scrollbar flex flex-col">
        {/* Top gradient effect */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#E50914]/[0.04] to-transparent pointer-events-none z-0" />

        <TopBar />

        <div className="relative z-10 flex-1">
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><PageTransition><DashboardPage manualMode={manualMode} /></PageTransition></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute allowedRoles={['admin']}><PageTransition><AnalyticsPage /></PageTransition></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin']}><PageTransition><ReportsPage /></PageTransition></ProtectedRoute>} />
              <Route path="/city" element={<ProtectedRoute allowedRoles={['admin']}><PageTransition><CityOverviewPage /></PageTransition></ProtectedRoute>} />
              <Route path="/camera" element={<ProtectedRoute allowedRoles={['admin']}><PageTransition><CameraConfigPage /></PageTransition></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><PageTransition><SettingsPage /></PageTransition></ProtectedRoute>} />
              <Route path="/ambulance" element={<ProtectedRoute allowedRoles={['ambulance_driver', 'admin']}><PageTransition><AmbulanceDriverPage /></PageTransition></ProtectedRoute>} />
              <Route path="/user-portal" element={<ProtectedRoute allowedRoles={['user', 'admin']}><PageTransition><UserDashboard /></PageTransition></ProtectedRoute>} />
              <Route path="/unauthorized" element={
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <AlertTriangle className="w-16 h-16 text-[#E50914]/30 mx-auto mb-4" />
                    <h2 className="text-2xl font-black text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>ACCESS DENIED</h2>
                    <p className="text-gray-500 text-sm">You don't have permission to view this page.</p>
                  </div>
                </div>
              } />
              <Route path="*" element={
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-8xl font-black text-[#E50914]/20 mb-4" style={{ fontFamily: 'var(--font-display)' }}>404</div>
                    <p className="text-gray-500 text-sm">This page doesn't exist yet.</p>
                  </div>
                </div>
              } />
            </Routes>
          </Suspense>
        </div>
      </main>
    </div>
  );
}

// ── Root App ──
function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/about-system" element={<Suspense fallback={<RouteLoader />}><AboutSystemPage /></Suspense>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/*" element={<AppLayout />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
