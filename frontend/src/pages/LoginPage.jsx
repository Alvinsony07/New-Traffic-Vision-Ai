/**
 * Login Page — Cinematic Netflix-style auth screen with particle effects
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, AlertCircle, Loader2, Shield, Zap } from 'lucide-react';

// Particle Background
function ParticleField() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationId;
        const particles = [];
        const PARTICLE_COUNT = 60;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                radius: Math.random() * 1.5 + 0.5,
                opacity: Math.random() * 0.4 + 0.1,
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p, i) => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(229, 9, 20, ${p.opacity})`;
                ctx.fill();

                // Connection lines
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[j].x - p.x;
                    const dy = particles[j].y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(229, 9, 20, ${0.06 * (1 - dist / 120)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            });

            animationId = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
}

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            if (user.role === 'admin') navigate('/dashboard');
            else if (user.role === 'ambulance_driver') navigate('/ambulance');
            else navigate('/user-portal');
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const me = await login(username, password);
            if (me.role === 'admin') navigate('/dashboard');
            else if (me.role === 'ambulance_driver') navigate('/ambulance');
            else navigate('/user-portal');
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#141414] flex items-center justify-center relative overflow-hidden">
            <ParticleField />

            {/* Cinematic gradient orbs */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#E50914]/8 rounded-full blur-[250px] pointer-events-none" />
            <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-[#E50914]/5 rounded-full blur-[200px] pointer-events-none" />
            <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-red-900/5 rounded-full blur-[150px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
                className="relative z-10 w-full max-w-[420px] mx-4"
            >
                {/* Logo Section */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="text-center mb-10"
                >
                    <Link to="/" className="inline-block hover:scale-110 active:scale-90 transition-transform duration-300">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#E50914] to-[#8B0000] flex items-center justify-center font-black text-white text-2xl shadow-[0_0_40px_rgba(229,9,20,0.5)] mb-5" style={{ fontFamily: 'var(--font-display)' }}>
                            T
                        </div>
                    </Link>
                    <h1 className="text-4xl font-black text-white tracking-[0.06em] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                        TRAFFIC<span className="text-[#E50914]"> AI</span>
                    </h1>
                    <div className="flex items-center justify-center gap-2 text-gray-500 text-xs tracking-[0.2em] uppercase font-bold">
                        <Zap className="w-3 h-3 text-[#E50914]" />
                        Intelligent Traffic Monitoring System
                    </div>
                </motion.div>

                {/* Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="bg-[#0d0d0d]/90 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 shadow-[0_30px_80px_rgba(0,0,0,0.9)] relative overflow-hidden"
                >
                    {/* Subtle top accent line */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#E50914] to-transparent opacity-60" />

                    <div className="flex items-center gap-2 mb-7">
                        <Shield className="w-5 h-5 text-gray-600" />
                        <h2 className="text-lg font-bold text-white tracking-wide">Sign In</h2>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            className="flex items-center gap-2.5 bg-[#E50914]/10 border border-[#E50914]/25 text-[#ff6b6b] px-4 py-3 rounded-xl mb-6 text-sm font-medium"
                        >
                            <AlertCircle className="w-4 h-4 shrink-0 text-[#E50914]" />
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-[0.15em]">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                autoFocus
                                className="w-full px-4 py-3.5 bg-[#1a1a1a] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50 focus:shadow-[0_0_0_3px_rgba(229,9,20,0.1)] transition-all text-sm"
                                placeholder="Enter your username"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-[0.15em]">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-3.5 bg-[#1a1a1a] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50 focus:shadow-[0_0_0_3px_rgba(229,9,20,0.1)] transition-all pr-12 text-sm"
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-[#E50914] hover:bg-[#B20710] text-white font-bold rounded-xl transition-all shadow-[0_0_25px_rgba(229,9,20,0.3)] hover:shadow-[0_0_40px_rgba(229,9,20,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm tracking-wide active:scale-[0.98]"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="text-center mt-7 space-y-3 text-sm">
                        <p className="text-gray-400 pt-2">
                            Don't have an account? <Link to="/register" className="text-[#E50914] font-bold hover:underline hover:text-red-400 transition-colors">Sign Up</Link>
                        </p>
                    </div>
                </motion.div>

                {/* Footer */}
                <div className="text-center mt-6 text-xs text-gray-700 tracking-wider uppercase font-bold">
                    Powered by YOLOv8 · FastAPI · React
                </div>
            </motion.div>
        </div>
    );
}
