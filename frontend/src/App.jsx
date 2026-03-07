import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage';
import RegisterPage from './pages/RegisterPage';
import UserDashboard from './pages/UserDashboard';
import CityOverviewPage from './pages/CityOverviewPage';
import CameraConfigPage from './pages/CameraConfigPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ReportsPage from './pages/ReportsPage';
import AmbulanceDriverPage from './pages/AmbulanceDriverPage';
import { Loader2, Video, AlertTriangle, Car, Gauge, Timer, Siren } from 'lucide-react';
import { dashboard } from './api/client';

// ── Animated Counter ──
function AnimatedNumber({ value, className = '' }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    const duration = 600;
    const start = display;
    const step = (target - start) / (duration / 16);
    let current = start;
    const timer = setInterval(() => {
      current += step;
      if ((step > 0 && current >= target) || (step < 0 && current <= target) || step === 0) {
        current = target;
        clearInterval(timer);
      }
      setDisplay(Math.round(current));
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span className={className}>{display}</span>;
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
          <p className="text-[10px] text-gray-600 uppercase tracking-[0.3em] font-bold">Loading System</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return children;
}

// ── Role Based Redirect ──
function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/dashboard" replace />;
  if (user.role === 'ambulance_driver') return <Navigate to="/ambulance" replace />;
  return <Navigate to="/user-portal" replace />;
}

// ── Dashboard Home ──
function Home() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await dashboard.status();
        setData(res);
      } catch (err) { console.error("Failed to fetch status:", err); }
    };
    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleOverride = async (lane) => {
    try {
      await dashboard.override(lane);
      addToast(`Force Green triggered on Lane ${lane + 1}`, 'success');
    }
    catch (err) {
      addToast("Failed to trigger override: " + err.message, 'error');
    }
  };

  const states = data?.signal_status?.states || ["RED", "RED", "RED", "RED"];
  const remaining = data?.signal_status?.remaining_time || 0;
  const ambulanceActive = data?.signal_status?.ambulance_mode || false;
  const currentGreen = data?.signal_status?.current_green ?? -1;
  const laneData = data?.lane_data || {};

  // Calculate totals
  const totalVehicles = Object.values(laneData).reduce((sum, l) => sum + (l?.count || l?.vehicle_count || 0), 0);

  const signalColors = {
    GREEN: { bg: 'bg-[#46D369]/10', border: 'border-[#46D369]/30', text: 'text-[#46D369]', glow: 'shadow-[0_0_15px_rgba(70,211,105,0.2)]', dot: 'bg-[#46D369]' },
    YELLOW: { bg: 'bg-[#E87C03]/10', border: 'border-[#E87C03]/30', text: 'text-[#E87C03]', glow: 'shadow-[0_0_15px_rgba(232,124,3,0.2)]', dot: 'bg-[#E87C03]' },
    RED: { bg: 'bg-[#E50914]/10', border: 'border-[#E50914]/30', text: 'text-[#E50914]', glow: 'shadow-[0_0_15px_rgba(229,9,20,0.2)]', dot: 'bg-[#E50914]' },
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 lg:p-8 pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-[0.04em] text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            LIVE SURVEILLANCE
          </h2>
          <p className="text-gray-500 text-sm font-medium">Real-time traffic flow, anomaly detection, and adaptive signal control.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {/* Stats Pills */}
          <div className="px-4 py-2 bg-[#181818] border border-white/[0.06] rounded-xl flex items-center gap-3">
            <Car className="w-4 h-4 text-[#0071EB]" />
            <div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Total Vehicles</div>
              <div className="text-white font-bold text-lg leading-none"><AnimatedNumber value={totalVehicles} /></div>
            </div>
          </div>
          <div className="px-4 py-2 bg-[#181818] border border-white/[0.06] rounded-xl flex items-center gap-3">
            <Timer className="w-4 h-4 text-[#46D369]" />
            <div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Signal Timer</div>
              <div className="text-white font-bold text-lg leading-none tabular-nums">{remaining}s</div>
            </div>
          </div>
          {ambulanceActive && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="px-4 py-2 bg-[#E50914]/10 border border-[#E50914]/40 shadow-[0_0_20px_rgba(229,9,20,0.3)] text-[#E50914] rounded-xl flex items-center gap-2"
            >
              <Siren className="w-4 h-4" />
              <span className="font-black text-xs tracking-widest">AMBULANCE OVERRIDE</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Lane Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1, 2, 3].map((i) => {
          const state = states[i];
          const lData = laneData[i] || { count: 0, density: 'Low', details: {} };
          const vehicleCount = lData.count || lData.vehicle_count || 0;
          const density = lData.density || 'Low';
          const details = lData.details || {};
          const sc = signalColors[state] || signalColors.RED;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#181818] rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:border-white/[0.1] transition-all group"
            >
              {/* Header */}
              <div className="px-5 py-3.5 border-b border-white/[0.04] flex justify-between items-center bg-white/[0.01]">
                <div className="flex items-center gap-3">
                  <div className="bg-white/[0.06] p-2 rounded-lg group-hover:bg-white/[0.08] transition-colors">
                    <Video className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <span className="font-bold text-white tracking-wide text-[15px]">Lane {i + 1}</span>
                    <div className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">Node 0{i + 1}</div>
                  </div>
                </div>

                {/* Signal Indicator */}
                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black tracking-widest ${sc.bg} ${sc.border} ${sc.text} ${sc.glow}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${state === 'GREEN' ? 'animate-pulse' : ''}`} />
                  {state}
                </div>
              </div>

              {/* Video Feed */}
              <div className="aspect-video bg-[#0a0a0a] relative flex items-center justify-center border-b border-white/[0.04] overflow-hidden">
                <img
                  src={`/api/video_feed/${i}`}
                  className="w-full h-full object-cover z-10 relative"
                  alt={`Lane ${i + 1} Feed`}
                  onError={(e) => { e.target.style.opacity = '0'; }}
                  onLoad={(e) => { e.target.style.opacity = '1'; }}
                  style={{ opacity: 0, transition: 'opacity 0.5s ease-in-out' }}
                />
                {/* Loading state */}
                <div className="absolute inset-0 flex items-center justify-center z-0">
                  <div className="flex flex-col items-center text-gray-700 gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full border-2 border-[#E50914]/10 border-t-[#E50914]/50 animate-spin" />
                    </div>
                    <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-gray-600">Connecting Feed</span>
                  </div>
                </div>

                {/* HUD overlay on video */}
                <div className="absolute top-2 left-2 z-20 flex gap-1.5">
                  <div className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[9px] text-gray-300 font-bold tracking-wider flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    LIVE
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 z-20">
                  <div className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[9px] font-mono text-gray-400">
                    480×270
                  </div>
                </div>
              </div>

              {/* Data & Actions */}
              <div className="p-5 flex justify-between items-center bg-gradient-to-b from-[#181818] to-[#141414]">
                <div className="flex gap-6">
                  {/* Vehicle Count */}
                  <div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Vehicles</div>
                    <div className="text-2xl font-black text-white leading-none tabular-nums">
                      <AnimatedNumber value={vehicleCount} />
                    </div>
                  </div>
                  {/* Density */}
                  <div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Density</div>
                    <span className={`text-[10px] font-black tracking-widest py-1 px-3 rounded-md uppercase ${density === 'High' ? 'bg-[#E50914]/15 text-[#E50914]' : density === 'Medium' ? 'bg-[#E87C03]/15 text-[#E87C03]' : 'bg-[#46D369]/15 text-[#46D369]'}`}>
                      {density}
                    </span>
                  </div>
                  {/* Vehicle Breakdown */}
                  {Object.keys(details).length > 0 && (
                    <div className="hidden md:block">
                      <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Types</div>
                      <div className="flex gap-1.5">
                        {Object.entries(details).map(([type, count]) => count > 0 && (
                          <span key={type} className="text-[9px] bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded text-gray-400 font-mono">
                            {type}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {user?.role === 'admin' && (
                  <button
                    onClick={() => handleOverride(i)}
                    disabled={ambulanceActive || state === 'GREEN'}
                    className="px-5 py-2 bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs font-bold tracking-wider transition-all disabled:opacity-20 disabled:pointer-events-none hover:border-white/[0.15] uppercase"
                  >
                    Force Green
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
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

// ── App Layout ──
function AppLayout() {
  return (
    <div className="flex h-screen bg-[#141414] text-white overflow-hidden" style={{ fontFamily: 'var(--font-body)' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative tv-scrollbar">
        {/* Netflix-style top gradient */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#E50914]/[0.04] to-transparent pointer-events-none z-0" />
        <div className="relative z-10 h-full">
          <Routes>
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><PageTransition><Home /></PageTransition></ProtectedRoute>} />
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
            <Route path="/" element={<RoleRedirect />} />
            <Route path="*" element={
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-8xl font-black text-[#E50914]/20 mb-4" style={{ fontFamily: 'var(--font-display)' }}>404</div>
                  <p className="text-gray-500 text-sm">This page doesn't exist yet.</p>
                </div>
              </div>
            } />
          </Routes>
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
