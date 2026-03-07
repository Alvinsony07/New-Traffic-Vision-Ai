import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Settings, Activity, Siren, FileText, LogOut, Home, Navigation, Camera, Menu, X, ChevronLeft } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LiveClock() {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);
    return (
        <div className="text-center py-3 border-t border-white/5">
            <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mb-1">System Time</div>
            <div className="text-lg font-bold text-white tabular-nums tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>
                {time.toLocaleTimeString('en-US', { hour12: false })}
            </div>
            <div className="text-[10px] text-gray-600 mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
                {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
        </div>
    );
}

export default function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
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

    const sidebarContent = (
        <>
            {/* Logo */}
            <div className={`flex items-center gap-3 mb-8 px-2 cursor-pointer group ${collapsed ? 'justify-center' : ''}`} onClick={() => navigate('/')}>
                <div className="w-9 h-9 rounded-lg bg-[#E50914] flex items-center justify-center font-black text-white text-lg shadow-[0_0_20px_rgba(229,9,20,0.5)] group-hover:shadow-[0_0_30px_rgba(229,9,20,0.8)] transition-shadow shrink-0" style={{ fontFamily: 'var(--font-display)' }}>
                    T
                </div>
                {!collapsed && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
                        <h1 className="text-xl font-black tracking-[0.08em] text-white whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
                            TRAFFIC<span className="text-[#E50914] ml-0.5">AI</span>
                        </h1>
                        <p className="text-[8px] text-gray-500 uppercase tracking-[0.3em] font-bold -mt-1">Vision System</p>
                    </motion.div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1">
                {!collapsed && (
                    <div className="text-[9px] text-gray-600 uppercase tracking-[0.2em] font-bold px-3 mb-3">Navigation</div>
                )}
                {links.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 relative group ${collapsed ? 'justify-center' : ''} ${isActive
                                ? 'text-white bg-white/[0.06]'
                                : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.03]'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#E50914] rounded-r-full shadow-[0_0_12px_rgba(229,9,20,0.8)]"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <item.icon className={`w-[18px] h-[18px] shrink-0 transition-all duration-300 ${isActive ? 'text-[#E50914] drop-shadow-[0_0_8px_rgba(229,9,20,0.6)]' : 'group-hover:text-white'}`} />
                                {!collapsed && (
                                    <span className="font-medium text-[13px] tracking-wide">{item.name}</span>
                                )}
                                {collapsed && isActive && (
                                    <div className="absolute left-full ml-3 bg-[#E50914] text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                        {item.name}
                                    </div>
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* System Time */}
            {!collapsed && <LiveClock />}

            {/* User Section */}
            <div className={`mt-auto pt-4 border-t border-white/5 ${collapsed ? 'px-0' : ''}`}>
                <div className={`flex items-center gap-3 px-2 py-2 mb-2 ${collapsed ? 'justify-center' : ''}`}>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E50914] to-red-900 flex items-center justify-center text-white text-xs font-black shrink-0 shadow-lg shadow-red-500/20">
                        {user.username?.charAt(0).toUpperCase()}
                    </div>
                    {!collapsed && (
                        <div className="text-left flex-1 overflow-hidden">
                            <p className="text-sm font-semibold text-white truncate">{user.username}</p>
                            <p className="text-[9px] text-gray-500 truncate uppercase tracking-[0.15em] font-bold">{user.role === 'admin' ? 'Administrator' : user.role === 'ambulance_driver' ? 'EMT Driver' : 'Citizen'}</p>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleLogout}
                    className={`flex items-center gap-2 text-gray-500 hover:text-[#E50914] hover:bg-[#E50914]/10 transition-all w-full px-3 py-2 rounded-lg font-bold text-xs uppercase tracking-wider border border-transparent hover:border-[#E50914]/20 ${collapsed ? 'justify-center' : ''}`}
                >
                    <LogOut className="w-4 h-4 shrink-0" />
                    {!collapsed && 'Sign Out'}
                </button>
            </div>

            {/* Collapse Toggle (Desktop) */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="hidden lg:flex items-center justify-center w-6 h-6 absolute -right-3 top-1/2 -translate-y-1/2 bg-[#1a1a1a] border border-white/10 rounded-full text-gray-400 hover:text-white hover:border-white/30 transition-all z-50 shadow-lg"
            >
                <ChevronLeft className={`w-3 h-3 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
            </button>
        </>
    );

    return (
        <>
            {/* Mobile Toggle */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden fixed top-4 left-4 z-[60] bg-[#1a1a1a] border border-white/10 p-2 rounded-lg text-white shadow-lg hover:bg-white/10 transition-colors"
            >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Mobile Overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
                        onClick={() => setMobileOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ x: -280 }}
                        animate={{ x: 0 }}
                        exit={{ x: -280 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="lg:hidden fixed top-0 left-0 h-screen w-[260px] bg-[#0d0d0d] border-r border-white/5 flex flex-col pt-16 pb-6 px-4 z-50 shadow-2xl"
                    >
                        {sidebarContent}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1, width: collapsed ? 72 : 250 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="hidden lg:flex h-screen bg-[#0d0d0d] border-r border-white/[0.06] flex-col pt-6 pb-5 px-3 shrink-0 z-50 relative overflow-hidden"
            >
                {sidebarContent}
            </motion.div>
        </>
    );
}
