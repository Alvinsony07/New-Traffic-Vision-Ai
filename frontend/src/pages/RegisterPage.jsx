import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../api/client';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function RegisterPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        phone_number: '',
        organization: '',
        password: '',
        confirm_password: ''
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const checkPasswordStrength = (pwd) => {
        if (!pwd) return null;
        if (pwd.length < 8) return { color: 'text-red-500', bar: 'bg-red-500 w-1/4', text: 'Too Short' };
        if (!/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return { color: 'text-yellow-500', bar: 'bg-yellow-500 w-2/4', text: 'Moderate' };
        if (!/[!@#$%^&*]/.test(pwd)) return { color: 'text-blue-500', bar: 'bg-blue-500 w-3/4', text: 'Good' };
        return { color: 'text-green-500', bar: 'bg-green-500 w-full', text: 'Strong' };
    };

    const strength = checkPasswordStrength(formData.password);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirm_password) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            await auth.register(formData);
            navigate('/login', { state: { message: 'Registration successful! Please login.' } });
        } catch (err) {
            setError(err.message || 'Registration failed');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Animations */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#e50914] rounded-full mix-blend-screen filter blur-[150px] opacity-10 animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-red-900 rounded-full mix-blend-screen filter blur-[150px] opacity-10" style={{ animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-lg bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative z-10"
            >
                <div className="p-8">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#e50914] to-red-900 rounded-xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(229,9,20,0.4)]">
                            <span className="text-white font-bold text-xl">T</span>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Create an Account</h2>
                        <p className="text-gray-400 text-sm">Join Traffic Vision AI Network</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded-lg text-sm flex items-start gap-3"
                                >
                                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1.5 ml-1">USERNAME</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full bg-[#141414] border border-white/10 focus:border-[#e50914] text-white rounded-xl px-4 py-3 transition-colors outline-none"
                                    placeholder="Username"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1.5 ml-1">FULL NAME</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full bg-[#141414] border border-white/10 focus:border-[#e50914] text-white rounded-xl px-4 py-3 transition-colors outline-none"
                                    placeholder="Full Name"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1.5 ml-1">PHONE NUMBER</label>
                                <input
                                    type="text"
                                    value={formData.phone_number}
                                    onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                                    className="w-full bg-[#141414] border border-white/10 focus:border-[#e50914] text-white rounded-xl px-4 py-3 transition-colors outline-none"
                                    placeholder="+1 234 567 890"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1.5 ml-1">ORGANIZATION</label>
                                <input
                                    type="text"
                                    value={formData.organization}
                                    onChange={e => setFormData({ ...formData, organization: e.target.value })}
                                    className="w-full bg-[#141414] border border-white/10 focus:border-[#e50914] text-white rounded-xl px-4 py-3 transition-colors outline-none"
                                    placeholder="Optional"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1.5 ml-1">PASSWORD</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-[#141414] border border-white/10 focus:border-[#e50914] text-white rounded-xl px-4 py-3 pr-10 transition-colors outline-none"
                                    placeholder="••••••••"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            {/* Password Strength Indicator */}
                            {strength && (
                                <div className="mt-2 text-xs">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-gray-500">Security:</span>
                                        <span className={`font-semibold ${strength.color}`}>{strength.text}</span>
                                    </div>
                                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                        <div className={`h-full ${strength.bar} transition-all duration-300`} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1.5 ml-1">CONFIRM PASSWORD</label>
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={formData.confirm_password}
                                onChange={e => setFormData({ ...formData, confirm_password: e.target.value })}
                                className="w-full bg-[#141414] border border-white/10 focus:border-[#e50914] text-white rounded-xl px-4 py-3 transition-colors outline-none"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-[#e50914] hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(229,9,20,0.4)] hover:shadow-[0_0_25px_rgba(229,9,20,0.6)] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                        >
                            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                            {loading ? 'CREATING ACCOUNT...' : 'REGISTER'}
                        </button>
                    </form>
                </div>

                <div className="bg-[#111] p-4 text-center border-t border-white/5">
                    <p className="text-gray-400 text-sm">
                        Already have an account? <Link to="/login" className="text-[#e50914] font-bold hover:underline">Log In</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
