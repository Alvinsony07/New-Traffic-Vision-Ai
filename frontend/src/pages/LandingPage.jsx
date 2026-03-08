import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
    Activity,
    Ambulance,
    Video,
    BarChart3,
    Terminal,
    BrainCircuit,
    Database,
    AppWindow,
    ArrowRight,
    Shield,
    Zap,
    Cpu,
    Eye,
    Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ── Cinematic Particle Background ──
function ParticleField() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationId;
        const particles = [];
        const PARTICLE_COUNT = 70;

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
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                radius: Math.random() * 2 + 0.5,
                opacity: Math.random() * 0.5 + 0.1,
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

                // Connect particles
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[j].x - p.x;
                    const dy = particles[j].y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 130) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(229, 9, 20, ${0.08 * (1 - dist / 130)})`;
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

const FeatureCard = ({ icon: Icon, title, description, bullets, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
        className="bg-[#0d0d0d]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 hover:border-[#E50914]/40 hover:shadow-[0_10px_40px_rgba(229,9,20,0.15)] transition-all duration-500 group relative overflow-hidden"
    >
        {/* Hover Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#E50914]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-[#1a1a1a] border border-white/[0.08] group-hover:scale-110 group-hover:border-[#E50914]/50 transition-all duration-500 shadow-[0_0_20px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_20px_rgba(229,9,20,0.3)]">
                <Icon className="w-6 h-6 text-gray-400 group-hover:text-[#E50914] transition-colors duration-500" />
            </div>
            <h3 className="text-xl font-black text-white mb-3 tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">{description}</p>
            <ul className="space-y-3">
                {bullets.map((bullet, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm text-gray-300 font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#E50914] shadow-[0_0_8px_rgba(229,9,20,0.8)]" />
                        {bullet}
                    </li>
                ))}
            </ul>
        </div>
    </motion.div>
);

const ArchNode = ({ number, title, subtitle, icon: Icon, isLast, delay }) => (
    <div className="flex flex-col md:flex-row items-center relative w-full md:w-auto flex-1">
        <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay, type: "spring", stiffness: 100 }}
            className={`relative z-10 flex flex-col items-center justify-center w-full md:w-56 bg-[#0a0a0a] border border-[#E50914]/20 rounded-2xl p-6 shadow-[0_0_40px_rgba(229,9,20,0.1)] group hover:border-[#E50914]/60 transition-colors duration-300`}
        >
            <div className="absolute -top-3 px-3 py-1 rounded-full bg-[#1a1a1a] border border-[#E50914]/30 text-[10px] uppercase font-bold tracking-widest text-[#E50914] shadow-[0_0_15px_rgba(229,9,20,0.2)]">
                {number}
            </div>
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] flex items-center justify-center mb-4 border border-white/5 group-hover:shadow-[0_0_25px_rgba(229,9,20,0.3)] transition-shadow duration-300">
                <Icon className="w-7 h-7 text-white" />
            </div>
            <h4 className="text-white font-black mb-2 text-center text-sm tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>{title}</h4>
            <p className="text-gray-500 text-xs text-center leading-relaxed font-medium">{subtitle}</p>
        </motion.div>

        {!isLast && (
            <div className="hidden md:flex w-full h-[2px] bg-gradient-to-r from-transparent via-[#E50914]/40 to-transparent relative my-8 md:my-0">
                <motion.div
                    initial={{ left: "0%" }}
                    animate={{ left: "100%" }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: delay }}
                    className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full shadow-[0_0_15px_rgba(229,9,20,1)] bg-[#E50914]"
                />
            </div>
        )}

        {/* Mobile Connector */}
        {!isLast && (
            <div className="flex md:hidden w-[2px] h-12 bg-gradient-to-b from-transparent via-[#E50914]/40 to-transparent" />
        )}
    </div>
);

export default function LandingPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { scrollYProgress } = useScroll();
    const yHero = useTransform(scrollYProgress, [0, 1], [0, 400]);
    const opacityHero = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    // Handle smooth scrolling
    useEffect(() => {
        document.documentElement.style.scrollBehavior = 'smooth';
        window.scrollTo(0, 0);
        return () => { document.documentElement.style.scrollBehavior = 'auto'; }
    }, []);

    return (
        <div className="min-h-screen bg-[#141414] font-sans selection:bg-[#E50914]/30 selection:text-white overflow-x-hidden relative">
            <ParticleField />

            {/* Cinematic Gradient Orbs */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[#E50914]/[0.05] rounded-full blur-[250px] pointer-events-none" />
            <div className="absolute top-[40%] right-[-200px] w-[600px] h-[600px] bg-[#E50914]/[0.03] rounded-full blur-[200px] pointer-events-none" />

            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.04] bg-[#0a0a0a]/80 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E50914] to-[#8B0000] flex items-center justify-center font-black text-white text-xl shadow-[0_0_20px_rgba(229,9,20,0.4)] group-hover:shadow-[0_0_30px_rgba(229,9,20,0.6)] transition-all duration-300" style={{ fontFamily: 'var(--font-display)' }}>
                            T
                        </div>
                        <span className="font-black text-xl tracking-[0.05em] text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                            TRAFFIC<span className="text-[#E50914]"> AI</span>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-[#E50914]/10 border border-[#E50914]/30 ml-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#E50914] animate-pulse shadow-[0_0_8px_rgba(229,9,20,0.8)]" />
                                <span className="text-[9px] font-black text-[#E50914] tracking-widest uppercase">Live System</span>
                            </div>
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        {user ? (
                            <Link to={user.role === 'ambulance_driver' ? '/ambulance' : user.role === 'admin' ? '/dashboard' : '/user-portal'} className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-white font-bold text-sm tracking-wide">
                                Go to Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" className="hidden sm:block px-5 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all text-sm font-bold border border-transparent tracking-wide">
                                    Sign In
                                </Link>
                                <Link to="/register" className="px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#B20710] transition-colors text-white font-bold text-sm shadow-[0_0_20px_rgba(229,9,20,0.3)] hover:shadow-[0_0_30px_rgba(229,9,20,0.5)] flex items-center gap-2 group tracking-wide">
                                    Get Started
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <motion.main
                style={{ y: yHero, opacity: opacityHero }}
                className="relative z-10 pt-40 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center min-h-[90vh] justify-center"
            >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(229,9,20,0.08)_0%,transparent_60%)] pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 mb-8 backdrop-blur-md"
                >
                    <Zap className="w-4 h-4 text-[#E50914]" />
                    <span className="text-[11px] font-bold text-gray-300 tracking-[0.2em] uppercase">Next-Gen Traffic Monitoring</span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-white mb-8 leading-[1.05] drop-shadow-2xl"
                    style={{ fontFamily: 'var(--font-display' }}
                >
                    Intelligent <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E50914] to-[#ff4b4b]">Surveillance</span><br />
                    for Modern Cities.
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="max-w-3xl mx-auto text-lg md:text-xl text-gray-400 mb-12 leading-relaxed font-medium"
                >
                    Harnessing the power of YOLOv8 computer vision and real-time deep learning to orchestrate autonomous signal control, vehicle telemetry, and seamless emergency prioritization.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
                >
                    <Link
                        to={user ? (user.role === 'admin' ? '/dashboard' : user.role === 'ambulance_driver' ? '/ambulance' : '/user-portal') : '/login'}
                        className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#E50914] hover:bg-[#B20710] text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(229,9,20,0.3)] hover:shadow-[0_0_40px_rgba(229,9,20,0.5)] transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wider"
                    >
                        Access Portal <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                        to="/register"
                        className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#1a1a1a]/80 backdrop-blur-md hover:bg-[#2a2a2a] border border-white/10 hover:border-white/20 text-white font-bold text-[15px] flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wider"
                    >
                        <Shield className="w-4 h-4 text-gray-400" />
                        Create Account
                    </Link>
                </motion.div>
            </motion.main>

            {/* Platform Capabilities */}
            <section className="relative z-10 py-32 px-6 max-w-7xl mx-auto border-t border-white/[0.04]">
                <div className="text-center mb-20">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-5xl font-black text-white mb-6 uppercase tracking-tight"
                        style={{ fontFamily: 'var(--font-display)' }}
                    >
                        Platform <span className="text-[#E50914]">Capabilities</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-gray-400 text-lg max-w-2xl mx-auto font-medium"
                    >
                        Equipped with best-in-class algorithms for autonomous city management.
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
                    <FeatureCard
                        icon={Cpu}
                        title="Dynamic Signal Orchestration"
                        description="Our algorithm dynamically adjusts signal timers based on live lane density. Resolves physical traffic bottlenecks with zero human intervention."
                        bullets={[
                            "Live adaptive lane timing",
                            "Simultaneous junction analysis",
                            "Millisecond low-latency decisions"
                        ]}
                        delay={0.1}
                    />
                    <FeatureCard
                        icon={Ambulance}
                        title="Emergency Preemption"
                        description="The system detects approaching emergency vehicles and instantly forces green lights to create a seamless, uninterrupted transit corridor."
                        bullets={[
                            "YOLOv8 emergency classifier",
                            "Instant junction overrides",
                            "Driver dispatch integration"
                        ]}
                        delay={0.2}
                    />
                    <FeatureCard
                        icon={Video}
                        title="Command Center Dashboard"
                        description="A highly optimized cinematic interface streaming raw four-lane MJPEG feeds with intelligent bounding box overlays and signal telemetry."
                        bullets={[
                            "Quad-feed real-time video",
                            "Role-based secure access",
                            "Manual override controls"
                        ]}
                        delay={0.3}
                    />
                    <FeatureCard
                        icon={BarChart3}
                        title="Deep Telemetry & Analytics"
                        description="Records continuous historical data on vehicle counts, flow rates, and density classifications to help administrators study urban traffic patterns."
                        bullets={[
                            "Visual charting configurations",
                            "Peak hour composition data",
                            "Comprehensive logging architecture"
                        ]}
                        delay={0.4}
                    />
                </div>
            </section>

            {/* Architecture Stack Section */}
            <section className="relative z-10 py-32 px-6 max-w-7xl mx-auto border-t border-white/[0.04] bg-[#0d0d0d]/30">
                <div className="text-center mb-24">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center justify-center p-3 rounded-2xl bg-[#E50914]/10 mb-6 border border-[#E50914]/20"
                    >
                        <Layers className="w-8 h-8 text-[#E50914]" />
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-5xl font-black text-white mb-6 uppercase tracking-tight"
                        style={{ fontFamily: 'var(--font-display)' }}
                    >
                        Enterprise <span className="text-[#E50914]">Architecture</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-gray-400 text-lg max-w-2xl mx-auto font-medium"
                    >
                        A scalable, ultra-fast tech stack engineered for high throughput and reliable ML inference.
                    </motion.p>
                </div>

                <div className="flex flex-col md:flex-row items-stretch justify-center gap-4 md:gap-0 max-w-6xl mx-auto relative px-4">
                    <ArchNode
                        number="01 · BACKEND"
                        title="FastAPI + Python"
                        subtitle="Asynchronous APIs & core logic orchestration"
                        icon={Terminal}
                        delay={0.1}
                    />
                    <ArchNode
                        number="02 · VISION"
                        title="YOLOv8 + OpenCV"
                        subtitle="Real-time object detection & bounding boxes"
                        icon={BrainCircuit}
                        delay={0.2}
                    />
                    <ArchNode
                        number="03 · STORAGE"
                        title="PostgreSQL"
                        subtitle="Robust relational data management via SQLAlchemy"
                        icon={Database}
                        delay={0.3}
                    />
                    <ArchNode
                        number="04 · FRONTEND"
                        title="React + Tailwind UI"
                        subtitle="Cinematic glassmorphic Command Center"
                        icon={AppWindow}
                        isLast={true}
                        delay={0.4}
                    />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 }}
                    className="mt-24 flex justify-center"
                >
                    <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full border border-white/10 bg-[#1a1a1a]/80 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                        <div className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E50914] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E50914]"></span>
                        </div>
                        <span className="text-sm font-black text-white tracking-widest uppercase">System Operational</span>
                    </div>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/[0.06] bg-[#0a0a0a] py-10 relative z-10">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#E50914] flex items-center justify-center font-black text-white shadow-[0_0_15px_rgba(229,9,20,0.4)]" style={{ fontFamily: 'var(--font-display)' }}>
                            T
                        </div>
                        <span className="font-bold text-lg tracking-wide text-white flex items-center gap-1" style={{ fontFamily: 'var(--font-display)' }}>
                            TRAFFIC<span className="text-[#E50914]"> AI</span>
                        </span>
                    </div>
                    <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                        &copy; {new Date().getFullYear()} Traffic Vision AI Platform. Engineered for smart cities.
                    </div>
                </div>
            </footer>
        </div>
    );
}
