import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn, Shield, AlertTriangle } from 'lucide-react';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const user = await login(username, password);
            addToast(`Welcome back, ${user.username}!`, 'success');
            if (user.role === 'admin') navigate('/dashboard');
            else if (user.role === 'ambulance_driver') navigate('/ambulance');
            else navigate('/user-portal');
        } catch (err) {
            setError(err.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#141414] flex items-center justify-center relative overflow-hidden" style={{ fontFamily: 'var(--font-body)' }}>
            {/* Background gradient effects */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#E50914]/[0.04] rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#0071EB]/[0.03] rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative z-10 w-full max-w-md mx-4"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center gap-3 mb-3 no-underline">
                        <div className="w-10 h-10 rounded-lg bg-[#E50914] flex items-center justify-center font-bold text-white text-lg shadow-[0_0_20px_rgba(229,9,20,0.5)]">
                            T
                        </div>
                        <span className="text-2xl font-bold text-white tracking-wider">
                            TRAFFIC<span className="text-[#E50914] ml-1">AI</span>
                        </span>
                    </Link>
                    <p className="text-gray-500 text-sm">Sign in to access the command center</p>
                </div>

                {/* Login Card */}
                <div className="bg-[#181818] border border-white/[0.08] rounded-2xl p-8 shadow-[0_16px_60px_rgba(0,0,0,0.8)]">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-[#E50914]/10 rounded-xl flex items-center justify-center border border-[#E50914]/20">
                            <Shield className="w-5 h-5 text-[#E50914]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>SIGN IN</h2>
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Secure Authentication</p>
                        </div>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 bg-[#E50914]/10 border border-[#E50914]/30 rounded-xl p-3 mb-5"
                        >
                            <AlertTriangle className="w-4 h-4 text-[#E50914] shrink-0" />
                            <span className="text-sm text-[#E50914]">{error}</span>
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-[#2a2a2a] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/20 transition-all placeholder-gray-600"
                                placeholder="Enter your username"
                                required
                                autoComplete="username"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#2a2a2a] border border-white/[0.08] rounded-xl px-4 py-3 pr-12 text-white text-sm focus:outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/20 transition-all placeholder-gray-600"
                                    placeholder="Enter your password"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#E50914] hover:bg-[#B20710] active:scale-[0.98] text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(229,9,20,0.3)] hover:shadow-[0_0_30px_rgba(229,9,20,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn className="w-4 h-4" />
                                    Sign In
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-500 text-sm">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-[#0071EB] hover:text-[#3b82f6] font-semibold transition-colors">
                                Register here
                            </Link>
                        </p>
                    </div>
                </div>

                <p className="text-center text-gray-600 text-xs mt-6 tracking-wide">
                    TRAFFIC VISION AI v3.0 — Secure Access
                </p>
            </motion.div>
        </div>
    );
}
