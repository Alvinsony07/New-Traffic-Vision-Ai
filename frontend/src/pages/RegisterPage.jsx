import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Eye, EyeOff, Loader2, UserPlus, Shield, Check, Zap } from 'lucide-react';

export default function RegisterPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            if (user.role === 'admin') navigate('/dashboard');
            else if (user.role === 'ambulance_driver') navigate('/ambulance');
            else navigate('/user-portal');
        }
    }, [user, navigate]);

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
        let score = 0;
        if (pwd.length >= 8) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) score++;

        const levels = [
            { color: 'text-red-500', bar: 'bg-red-500', width: '25%', text: 'Weak' },
            { color: 'text-orange-400', bar: 'bg-orange-400', width: '50%', text: 'Fair' },
            { color: 'text-blue-400', bar: 'bg-blue-400', width: '75%', text: 'Good' },
            { color: 'text-[#46D369]', bar: 'bg-[#46D369]', width: '100%', text: 'Strong' },
        ];
        return levels[Math.min(score, 3)];
    };

    const strength = checkPasswordStrength(formData.password);
    const passwordsMatch = formData.password && formData.confirm_password && formData.password === formData.confirm_password;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirm_password) {
            setError("Passwords do not match");
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
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

    const InputField = ({ label, name, type = 'text', placeholder, required = false, half = false }) => (
        <div className={half ? '' : ''}>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-[0.15em]">{label}</label>
            <input
                type={type}
                required={required}
                value={formData[name]}
                onChange={e => setFormData({ ...formData, [name]: e.target.value })}
                className="w-full bg-[#1a1a1a] border border-white/[0.08] focus:border-[#E50914]/50 focus:shadow-[0_0_0_3px_rgba(229,9,20,0.1)] text-white rounded-xl px-4 py-3 transition-all outline-none text-sm placeholder-gray-600"
                placeholder={placeholder}
            />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#141414] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#E50914] rounded-full mix-blend-screen blur-[200px] opacity-[0.06]" />
                <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-red-900 rounded-full mix-blend-screen blur-[200px] opacity-[0.05]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                className="w-full max-w-[480px] bg-[#0d0d0d]/90 backdrop-blur-xl border border-white/[0.06] rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.9)] overflow-hidden relative z-10"
            >
                {/* Top accent */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#E50914] to-transparent opacity-60" />

                <div className="p-8">
                    <motion.div
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="flex flex-col items-center mb-7"
                    >
                        <div className="w-12 h-12 bg-gradient-to-br from-[#E50914] to-[#8B0000] rounded-xl flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(229,9,20,0.4)]">
                            <UserPlus className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-2xl font-black tracking-[0.04em] text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                            CREATE ACCOUNT
                        </h2>
                        <p className="text-gray-500 text-xs tracking-wider uppercase font-bold flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-[#E50914]" />
                            Join Traffic Vision AI Network
                        </p>
                    </motion.div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-[#E50914]/10 border border-[#E50914]/25 text-[#ff6b6b] px-4 py-3 rounded-xl text-sm flex items-start gap-3 font-medium"
                                >
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#E50914]" />
                                    <span>{error}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="grid grid-cols-2 gap-4">
                            <InputField label="Username" name="username" placeholder="Username" required />
                            <InputField label="Full Name" name="full_name" placeholder="Full Name" required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <InputField label="Phone Number" name="phone_number" placeholder="+91 98765 43210" />
                            <InputField label="Organization" name="organization" placeholder="Optional" />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-[0.15em]">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-[#1a1a1a] border border-white/[0.08] focus:border-[#E50914]/50 focus:shadow-[0_0_0_3px_rgba(229,9,20,0.1)] text-white rounded-xl px-4 py-3 pr-10 transition-all outline-none text-sm placeholder-gray-600"
                                    placeholder="••••••••"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors p-1">
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Password Strength Bar */}
                            {formData.password && strength && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mt-2"
                                >
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs text-gray-600 uppercase tracking-wider font-bold">Security</span>
                                        <span className={`text-xs font-bold uppercase tracking-wider ${strength.color}`}>{strength.text}</span>
                                    </div>
                                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: strength.width }}
                                            transition={{ duration: 0.3 }}
                                            className={`h-full ${strength.bar} rounded-full`}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-[0.15em]">Confirm Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={formData.confirm_password}
                                    onChange={e => setFormData({ ...formData, confirm_password: e.target.value })}
                                    className={`w-full bg-[#1a1a1a] border ${passwordsMatch ? 'border-[#46D369]/40' : 'border-white/[0.08]'} focus:border-[#E50914]/50 focus:shadow-[0_0_0_3px_rgba(229,9,20,0.1)] text-white rounded-xl px-4 py-3 pr-10 transition-all outline-none text-sm placeholder-gray-600`}
                                    placeholder="••••••••"
                                />
                                {passwordsMatch && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2"
                                    >
                                        <Check className="w-4 h-4 text-[#46D369]" />
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-[#E50914] hover:bg-[#B20710] text-white font-bold rounded-xl transition-all shadow-[0_0_25px_rgba(229,9,20,0.3)] hover:shadow-[0_0_40px_rgba(229,9,20,0.5)] disabled:opacity-50 flex items-center justify-center gap-2 mt-2 tracking-wide text-sm active:scale-[0.98]"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>
                </div>

                <div className="bg-[#0a0a0a] p-4 text-center border-t border-white/[0.04]">
                    <p className="text-gray-500 text-sm">
                        Already have an account? <Link to="/login" className="text-[#E50914] font-bold hover:underline hover:text-red-400 transition-colors">Sign In</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
