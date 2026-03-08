import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Settings, Video, Activity, Users, Siren, FileText, LogOut, Home, Navigation, Camera, AlertTriangle } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const handleLogoutClick = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = () => {
        setShowLogoutModal(false);
        logout();
        navigate('/');
    };

    if (!user) return null;

    let links = [];
    if (user.role === 'admin') {
        links = [
            { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
            { name: 'City Overview', icon: Navigation, path: '/city' },
            { name: 'Analytics', icon: Activity, path: '/analytics' },
            { name: 'Reports Log', icon: FileText, path: '/reports' },
            { name: 'Camera Matrix', icon: Camera, path: '/camera' },
            { name: 'Global Settings', icon: Settings, path: '/settings' },
        ];
    } else if (user.role === 'ambulance_driver') {
        links = [
            { name: 'Ambulance Portal', icon: Siren, path: '/ambulance' },
        ];
    } else {
        links = [
            { name: 'Citizens Portal', icon: Home, path: '/user-portal' },
        ];
    }

    return (
        <>
            <motion.div
                initial={{ x: -250 }}
                animate={{ x: 0 }}
                className="h-screen w-64 bg-[#0a0a0a] border-r border-white/5 flex flex-col pt-6 pb-6 px-4 shrink-0 shadow-[10_0_30px_rgba(0,0,0,0.5)] z-50 relative"
            >
                <div className="flex items-center gap-3 mb-10 px-2 cursor-pointer group">
                    <div className="w-8 h-8 rounded bg-[#e50914] flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(229,9,20,0.5)] group-hover:shadow-[0_0_25px_rgba(229,9,20,0.8)] transition-shadow">
                        T
                    </div>
                    <h1 className="text-xl font-bold tracking-wider text-white">
                        TRAFFIC<span className="text-[#e50914] ml-1">AI</span>
                    </h1>
                </div>

                <nav className="flex-1 space-y-2">
                    {links.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-3 rounded-md transition-all duration-300 relative group ${isActive
                                    ? 'text-white bg-white/5'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute left-0 top-0 bottom-0 w-1 bg-[#e50914] rounded-r-md shadow-[0_0_10px_rgba(229,9,20,0.8)]"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                    <item.icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'group-hover:scale-110'}`} />
                                    <span className="font-medium tracking-wide">{item.name}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="mt-auto pt-6 border-t border-white/5 flex flex-col gap-3">
                    <div className="flex items-center gap-3 px-2 py-2">
                        <div className="w-9 h-9 rounded bg-[#141414] border border-white/10 flex items-center justify-center overflow-hidden">
                            <Users className="w-5 h-5 text-[#3b82f6]" />
                        </div>
                        <div className="text-left flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{user.username}</p>
                            <p className="text-xs text-gray-500 truncate uppercase tracking-widest font-bold">{user.role}</p>
                        </div>
                    </div>

                    <button
                        onClick={handleLogoutClick}
                        className="flex items-center gap-3 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 transition-colors w-full px-4 py-2.5 rounded-md font-bold text-sm uppercase tracking-wider border border-transparent hover:border-red-500/20"
                    >
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </div>
            </motion.div>

            <AnimatePresence>
                {showLogoutModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ fontFamily: 'var(--font-body)' }}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/70 backdrop-blur-md"
                            onClick={() => setShowLogoutModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-[#111] border border-white/10 p-7 rounded-2xl shadow-[0_20px_80px_rgba(0,0,0,0.9)] max-w-sm w-full mx-4 overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#E50914] to-transparent opacity-60" />

                            <div className="flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-[#E50914]/10 rounded-full flex items-center justify-center mb-5 border border-[#E50914]/20 shadow-[0_0_30px_rgba(229,9,20,0.15)]">
                                    <AlertTriangle className="w-7 h-7 text-[#E50914]" />
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2 tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>Sign Out</h3>
                                <p className="text-gray-400 text-sm mb-7 font-medium px-4">
                                    Are you sure you want to end your current session?
                                </p>

                                <div className="flex w-full gap-3">
                                    <button
                                        onClick={() => setShowLogoutModal(false)}
                                        className="flex-1 py-3 px-4 bg-white/[0.05] hover:bg-white/[0.08] active:bg-white/[0.03] border border-white/[0.08] rounded-xl text-white font-bold text-xs uppercase tracking-wider transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmLogout}
                                        className="flex-1 py-3 px-4 bg-[#E50914] hover:bg-[#B20710] active:scale-[0.98] rounded-xl text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(229,9,20,0.3)] hover:shadow-[0_0_30px_rgba(229,9,20,0.5)]"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
