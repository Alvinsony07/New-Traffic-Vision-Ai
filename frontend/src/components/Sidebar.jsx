import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Settings, Video, Activity, Users, Siren, FileText, LogOut, Home, Navigation, Camera } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

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

    return (
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
                    onClick={handleLogout}
                    className="flex items-center gap-3 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 transition-colors w-full px-4 py-2.5 rounded-md font-bold text-sm uppercase tracking-wider border border-transparent hover:border-red-500/20"
                >
                    <LogOut className="w-4 h-4" /> Sign Out
                </button>
            </div>
        </motion.div>
    );
}
