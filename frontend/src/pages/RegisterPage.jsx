import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../api/client';
import { useToast } from '../context/ToastContext';
import { motion } from 'framer-motion';
import { Eye, EyeOff, UserPlus, Shield, AlertTriangle } from 'lucide-react';

export default function RegisterPage() {
    const [form, setForm] = useState({
        username: '', full_name: '', phone_number: '', organization: '',
        password: '', confirm_password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { addToast } = useToast();
    const navigate = useNavigate();

    const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (form.username.length < 3) { setError('Username must be at least 3 characters'); return; }
        if (!form.full_name.trim()) { setError('Full name is required'); return; }
        if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
        if (form.password !== form.confirm_password) { setError('Passwords do not match'); return; }

        setLoading(true);
        try {
            await auth.register({
                username: form.username,
                full_name: form.full_name,
                phone_number: form.phone_number,
                organization: form.organization,
                password: form.password,
            });
            addToast('Registration successful! Please login.', 'success');
            navigate('/login');
        } catch (err) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#141414] flex items-center justify-center relative overflow-hidden" style={{ fontFamily: 'var(--font-body)' }}>
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#0071EB]/[0.04] rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#E50914]/[0.03] rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative z-10 w-full max-w-md mx-4"
            >
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center gap-3 mb-3 no-underline">
                        <div className="w-10 h-10 rounded-lg bg-[#E50914] flex items-center justify-center font-bold text-white text-lg shadow-[0_0_20px_rgba(229,9,20,0.5)]">
                            T
                        </div>
                        <span className="text-2xl font-bold text-white tracking-wider">
                            TRAFFIC<span className="text-[#E50914] ml-1">AI</span>
                        </span>
                    </Link>
                    <p className="text-gray-500 text-sm">Create your account to get started</p>
                </div>

                <div className="bg-[#181818] border border-white/[0.08] rounded-2xl p-8 shadow-[0_16px_60px_rgba(0,0,0,0.8)]">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-[#0071EB]/10 rounded-xl flex items-center justify-center border border-[#0071EB]/20">
                            <UserPlus className="w-5 h-5 text-[#0071EB]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>REGISTER</h2>
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">New Account</p>
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

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Username *</label>
                            <input type="text" value={form.username} onChange={e => update('username', e.target.value)}
                                className="w-full bg-[#2a2a2a] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#0071EB] focus:ring-2 focus:ring-[#0071EB]/20 transition-all placeholder-gray-600"
                                placeholder="Min 3 characters" required />
                        </div>

                        <div>
                            <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Full Name *</label>
                            <input type="text" value={form.full_name} onChange={e => update('full_name', e.target.value)}
                                className="w-full bg-[#2a2a2a] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#0071EB] focus:ring-2 focus:ring-[#0071EB]/20 transition-all placeholder-gray-600"
                                placeholder="Your full name" required />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Phone</label>
                                <input type="text" value={form.phone_number} onChange={e => update('phone_number', e.target.value)}
                                    className="w-full bg-[#2a2a2a] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#0071EB] focus:ring-2 focus:ring-[#0071EB]/20 transition-all placeholder-gray-600"
                                    placeholder="Phone number" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Organization</label>
                                <input type="text" value={form.organization} onChange={e => update('organization', e.target.value)}
                                    className="w-full bg-[#2a2a2a] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#0071EB] focus:ring-2 focus:ring-[#0071EB]/20 transition-all placeholder-gray-600"
                                    placeholder="Organization" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Password *</label>
                            <div className="relative">
                                <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value)}
                                    className="w-full bg-[#2a2a2a] border border-white/[0.08] rounded-xl px-4 py-3 pr-12 text-white text-sm focus:outline-none focus:border-[#0071EB] focus:ring-2 focus:ring-[#0071EB]/20 transition-all placeholder-gray-600"
                                    placeholder="Min 6 characters" required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Confirm Password *</label>
                            <input type="password" value={form.confirm_password} onChange={e => update('confirm_password', e.target.value)}
                                className="w-full bg-[#2a2a2a] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#0071EB] focus:ring-2 focus:ring-[#0071EB]/20 transition-all placeholder-gray-600"
                                placeholder="Repeat password" required />
                        </div>

                        <button type="submit" disabled={loading}
                            className="w-full bg-[#0071EB] hover:bg-[#005bbd] active:scale-[0.98] text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(0,113,235,0.3)] hover:shadow-[0_0_30px_rgba(0,113,235,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm uppercase tracking-wider">
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <><UserPlus className="w-4 h-4" /> Create Account</>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-500 text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="text-[#E50914] hover:text-[#ff3333] font-semibold transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
