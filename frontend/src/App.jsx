import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import { Loader2, Video, AlertTriangle } from 'lucide-react';
import { dashboard } from './api/client';

// ── Protected Route Wrapper ──
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#e50914] animate-spin" />
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
  if (!user) return <Navigate to="/login" replace />; // If you want a landing page later, set to /landing

  if (user.role === 'admin') return <Navigate to="/dashboard" replace />;
  if (user.role === 'ambulance_driver') return <Navigate to="/ambulance" replace />;
  return <Navigate to="/user-portal" replace />;
}

// ── Dashboard Home ──
function Home() {
  const { user } = useAuth();
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await dashboard.status();
        setData(res);
      } catch (err) {
        console.error("Failed to fetch status:", err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleOverride = async (lane) => {
    try {
      await dashboard.override(lane);
    } catch (err) {
      alert("Failed to trigger override: " + err.message);
    }
  };

  const states = data?.signal_status?.states || ["RED", "RED", "RED", "RED"];
  const remaining = data?.signal_status?.remaining_time || 0;
  const ambulanceActive = data?.signal_status?.ambulance_mode || false;
  const laneData = data?.lane_data || {};

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 pb-20">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-1">
            Live Surveillance
          </h2>
          <p className="text-gray-400 text-sm">Traffic flow, anomaly detection, and signal states.</p>
        </div>
        <div className="flex gap-4">
          <div className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3 shadow-lg">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
            <span className="text-sm font-medium text-gray-300">Signal Timer: <span className="text-white font-bold ml-1 text-lg">{remaining}s</span></span>
          </div>
          {ambulanceActive && (
            <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="px-5 py-2.5 bg-[#e50914]/10 border border-[#e50914]/50 shadow-[0_0_15px_rgba(229,9,20,0.3)] text-[#e50914] rounded-xl flex items-center gap-2">
              <span className="font-bold text-sm tracking-widest">🚨 AMBULANCE OVERRIDE</span>
            </motion.div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[0, 1, 2, 3].map((i) => {
          const state = states[i];
          const lData = laneData[i] || { vehicle_count: 0, density: 'Low' };
          const colorClass = state === 'GREEN' ? 'text-green-500 border-green-500/30 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : state === 'YELLOW' ? 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'text-red-500 border-red-500/30 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]';

          return (
            <div key={i} className="bg-[#0a0a0a] rounded-2xl border border-white/10 overflow-hidden flex flex-col shadow-2xl transition-hover hover:border-white/20">
              {/* Header */}
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <div className="flex justify-center items-center gap-3">
                  <div className="bg-white/10 p-2 rounded-lg"><Video className="w-4 h-4 text-gray-300" /></div>
                  <span className="font-semibold text-gray-200 tracking-wide text-lg">Lane {i + 1}</span>
                </div>
                <div className={`px-5 py-1.5 rounded-full border text-sm font-bold tracking-widest ${colorClass}`}>
                  {state}
                </div>
              </div>

              {/* Video Feed */}
              <div className="aspect-video bg-[#050505] relative flex items-center justify-center border-b border-white/5 overflow-hidden">
                <img
                  src={`/api/video_feed/${i}`}
                  className="w-full h-full object-cover z-10 relative"
                  alt={`Lane ${i + 1} Feed`}
                  onError={(e) => { e.target.style.opacity = '0'; }}
                  onLoad={(e) => { e.target.style.opacity = '1'; }}
                  style={{ opacity: 0, transition: 'opacity 0.5s ease-in-out' }}
                />
                <div className="absolute inset-0 flex items-center justify-center z-0">
                  <div className="flex flex-col items-center text-gray-700 gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-[#e50914]/50" />
                    <span className="text-xs font-bold tracking-[0.2em]">CONNECTING FEED</span>
                  </div>
                </div>
              </div>

              {/* Data & Actions */}
              <div className="p-6 flex justify-between items-center bg-gradient-to-b from-[#0a0a0a] to-[#050505]">
                <div className="flex gap-8">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Vehicles</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white leading-none">{lData.vehicle_count}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Intensity</div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-sm font-bold tracking-wider py-1 px-3 mt-1 rounded-md ${lData.density === 'High' ? 'bg-red-500/20 text-red-500' : lData.density === 'Medium' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>
                        {lData.density}
                      </span>
                    </div>
                  </div>
                </div>

                {user?.role === 'admin' && (
                  <button
                    onClick={() => handleOverride(i)}
                    disabled={ambulanceActive || state === 'GREEN'}
                    className="px-6 py-2.5 bg-white/5 hover:bg-white/10 active:bg-white/5 border border-white/10 rounded-xl text-sm font-medium tracking-wide transition-all disabled:opacity-30 disabled:pointer-events-none hover:border-white/20"
                  >
                    Force Green
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── App Layout ──
function AppLayout() {
  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden selection:bg-[#e50914] selection:text-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#e50914]/5 to-transparent pointer-events-none z-0" />
        <div className="relative z-10 h-full">
          <Routes>
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><Home /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute allowedRoles={['admin']}><AnalyticsPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin']}><ReportsPage /></ProtectedRoute>} />
            <Route path="/city" element={<ProtectedRoute allowedRoles={['admin']}><CityOverviewPage /></ProtectedRoute>} />
            <Route path="/camera" element={<ProtectedRoute allowedRoles={['admin']}><CameraConfigPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><SettingsPage /></ProtectedRoute>} />

            <Route path="/ambulance" element={<ProtectedRoute allowedRoles={['ambulance_driver', 'admin']}><AmbulanceDriverPage /></ProtectedRoute>} />
            <Route path="/user-portal" element={<ProtectedRoute allowedRoles={['user', 'admin']}><UserDashboard /></ProtectedRoute>} />

            <Route path="/unauthorized" element={<div className="p-8 text-center text-red-500 font-bold">Unauthorized Access</div>} />
            <Route path="/" element={<RoleRedirect />} />
            <Route
              path="*"
              element={
                <div className="p-8 flex items-center justify-center h-full">
                  <p className="text-gray-500 text-lg">Page currently under construction</p>
                </div>
              }
            />
          </Routes>
        </div>
      </main>
    </div>
  );
}

// ── Root App ──
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/*"
            element={
              <AppLayout />
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
