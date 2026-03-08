import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
    Ambulance, Video, BarChart3, Terminal, BrainCircuit, Database, AppWindow,
    ArrowRight, Shield, Zap, Cpu, Layers, Activity, Moon, Zap as ZapIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Float, Stars } from '@react-three/drei';

gsap.registerPlugin(ScrollTrigger);

// ── 3D Cyberpunk Background ──
function CyberSphere() {
    return (
        <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
            <Sphere args={[1, 64, 64]} scale={2.8} position={[0, 0, -2]}>
                <MeshDistortMaterial
                    color="#06b6d4"
                    attach="material"
                    distort={0.4}
                    speed={1.5}
                    roughness={0.2}
                    metalness={0.8}
                    wireframe={true}
                    transparent={true}
                    opacity={0.15}
                />
            </Sphere>
        </Float>
    );
}

function FloatingNodes() {
    const group = useRef();
    useFrame(({ clock }) => {
        group.current.rotation.y = clock.getElapsedTime() * 0.05;
        group.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.05) * 0.2;
    });

    return (
        <group ref={group}>
            {Array.from({ length: 15 }).map((_, i) => (
                <Float key={i} speed={1 + Math.random()} rotationIntensity={1} floatIntensity={1}>
                    <Sphere
                        args={[0.05, 16, 16]}
                        position={[
                            (Math.random() - 0.5) * 15,
                            (Math.random() - 0.5) * 15,
                            (Math.random() - 0.5) * 10 - 5
                        ]}
                    >
                        <meshStandardMaterial color={Math.random() > 0.5 ? '#06b6d4' : '#a855f7'} emissive={Math.random() > 0.5 ? '#06b6d4' : '#a855f7'} emissiveIntensity={2} />
                    </Sphere>
                </Float>
            ))}
        </group>
    );
}

function Scene3D({ theme }) {
    if (theme === 'netflix') return null; // no 3D canvas for netflix theme

    return (
        <div className="fixed inset-0 z-0 pointer-events-none opacity-80">
            <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
                <ambientLight intensity={0.2} />
                <directionalLight position={[10, 10, 5]} intensity={2} color="#a855f7" />
                <directionalLight position={[-10, -10, -5]} intensity={2} color="#06b6d4" />
                <CyberSphere />
                <FloatingNodes />
                <Stars radius={100} depth={50} count={2500} factor={3} saturation={1} fade speed={1} />
            </Canvas>
        </div>
    );
}

// ── Cinematic Red Particle Background (for Netflix Theme) ──
function NetflixParticles() {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationId;
        const particles = [];
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize(); window.addEventListener('resize', resize);
        for (let i = 0; i < 70; i++) particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4, radius: Math.random() * 2 + 0.5, opacity: Math.random() * 0.5 + 0.1 });
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach((p, i) => {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0; if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fillStyle = `rgba(229, 9, 20, ${p.opacity})`; ctx.fill();
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[j].x - p.x; const dy = particles[j].y - p.y; const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 130) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(particles[j].x, particles[j].y); ctx.strokeStyle = `rgba(229, 9, 20, ${0.08 * (1 - dist / 130)})`; ctx.lineWidth = 0.5; ctx.stroke(); }
                }
            });
            animationId = requestAnimationFrame(animate);
        };
        animate();
        return () => { cancelAnimationFrame(animationId); window.removeEventListener('resize', resize); };
    }, []);
    return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
}

const BackgroundGrid = ({ theme }) => {
    if (theme === 'netflix') return null; // No grid in netflix theme
    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden mix-blend-screen opacity-15">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d4_1px,transparent_1px),linear-gradient(to_bottom,#06b6d4_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
        </div>
    );
};

const FeatureCard = ({ icon: Icon, title, description, bullets, delay, accentColor, glowColor, theme }) => {
    const cardRef = useRef(null);

    // Override colors for netflix theme
    const activeAccent = theme === 'cyber' ? accentColor : '#E50914';
    const activeGlow = theme === 'cyber' ? glowColor : 'rgba(229, 9, 20, 0.15)';

    useEffect(() => {
        gsap.fromTo(cardRef.current,
            { y: 50, opacity: 0 },
            {
                y: 0, opacity: 1,
                duration: 1, ease: 'power3.out',
                scrollTrigger: {
                    trigger: cardRef.current,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                }
            }
        );
    }, []);

    return (
        <div
            ref={cardRef}
            className={`backdrop-blur-2xl border rounded-3xl p-8 hover:border-[${activeAccent}]/50 transition-all duration-700 group relative overflow-hidden h-full flex flex-col ${theme === 'cyber' ? 'bg-[#020617]/40 border-slate-800' : 'bg-[#1a1a1a]/80 border-white/10'}`}
            style={{
                borderColor: 'rgba(255,255,255,0.05)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}
        >
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                style={{ background: `radial-gradient(120% 120% at top right, ${activeGlow} 0%, transparent 70%)` }}
            />

            <div className="relative z-10 flex-1 flex flex-col">
                <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border group-hover:scale-110 transition-transform duration-500 shadow-lg ${theme === 'cyber' ? 'bg-[#040b16] border-slate-700/50' : 'bg-[#000000] border-white/10'}`}
                >
                    <Icon className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors duration-500" style={{ color: activeAccent }} />
                </div>
                <h3 className="text-xl font-black text-white mb-3 tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6 flex-1">{description}</p>
                <ul className="space-y-3 mt-auto">
                    {bullets.map((bullet, idx) => (
                        <li key={idx} className="flex items-center gap-3 text-sm text-slate-300 font-medium">
                            <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" style={{ backgroundColor: activeAccent }} />
                            {bullet}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r group-hover:w-full transition-all duration-700 ease-out" style={{ backgroundImage: `linear-gradient(to right, transparent, ${activeAccent}, transparent)` }} />
        </div>
    );
};

const ArchNode = ({ number, title, subtitle, icon: Icon, isLast, colorHex, theme }) => {
    const titleParts = title.split(' + ');
    const activeColor = theme === 'cyber' ? colorHex : '#E50914';

    return (
        <div className="flex flex-col items-center relative w-[240px] shrink-0 mx-2 md:mx-4 z-10 mt-12 md:mt-0">
            <div
                className={`relative z-10 flex flex-col items-center justify-start w-full border rounded-[1.25rem] p-6 pt-10 group transition-all duration-500 h-[280px] ${theme === 'cyber' ? 'bg-[#05080f]' : 'bg-[#1a1a1a]'}`}
                style={{
                    borderColor: 'rgba(255,255,255,0.05)',
                    boxShadow: `0 20px 40px rgba(0,0,0,0.6)`
                }}
            >
                <div
                    className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full border text-[11px] font-bold tracking-widest uppercase whitespace-nowrap shadow-lg transition-colors duration-300 ${theme === 'cyber' ? 'bg-[#020408]' : 'bg-[#0a0a0a]'}`}
                    style={{ borderColor: `${activeColor}40`, color: activeColor }}
                >
                    {number}
                </div>

                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-white/5 transition-all duration-300 group-hover:scale-110 shadow-inner ${theme === 'cyber' ? 'bg-[#0b101d]' : 'bg-black'}`}>
                    <Icon className="w-6 h-6" style={{ color: activeColor }} />
                </div>

                <h4 className="text-white font-black mb-3 text-center text-[15px] tracking-wide leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
                    {titleParts.map((t, i) => (
                        <React.Fragment key={i}>
                            {t}{i < titleParts.length - 1 && <><br /><span className="text-white tracking-widest">+ </span></>}
                        </React.Fragment>
                    ))}
                </h4>

                <p className="text-slate-400 text-[12px] text-center leading-relaxed font-medium px-1">
                    {subtitle}
                </p>
            </div>

            {/* Mobile gap */}
        </div>
    );
};

export default function LandingPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Theme logic: "cyber" or "netflix"
    const [theme, setTheme] = useState('cyber');

    const { scrollYProgress } = useScroll();
    const yHero = useTransform(scrollYProgress, [0, 1], [0, 300]);
    const opacityHero = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    const sectionsRef = useRef([]);

    useLayoutEffect(() => {
        document.documentElement.style.scrollBehavior = 'smooth';
        window.scrollTo(0, 0);

        // GSAP Parallax for sections
        sectionsRef.current.forEach((section, index) => {
            gsap.fromTo(section,
                { y: 100, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 1.2, ease: "power3.out",
                    scrollTrigger: {
                        trigger: section,
                        start: "top 80%",
                        end: "bottom 20%",
                        toggleActions: "play none none reverse"
                    }
                }
            );
        });

        return () => {
            document.documentElement.style.scrollBehavior = 'auto';
            ScrollTrigger.getAll().forEach(t => t.kill());
        };
    }, []);

    const addToRefs = (el) => {
        if (el && !sectionsRef.current.includes(el)) {
            sectionsRef.current.push(el);
        }
    };

    return (
        <div className={`min-h-screen ${theme === 'cyber' ? 'bg-[#020617] selection:bg-cyan-500/30 selection:text-cyan-50' : 'bg-[#141414] selection:bg-[#E50914]/30 selection:text-white'} font-sans overflow-x-hidden relative transition-colors duration-1000`}>

            <Scene3D theme={theme} />
            {theme === 'netflix' && <NetflixParticles />}
            <BackgroundGrid theme={theme} />

            {/* Soft Ambient Glows */}
            {theme === 'cyber' ? (
                <>
                    <div className="fixed top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-cyan-600/[0.04] rounded-full blur-[180px] pointer-events-none transition-opacity duration-1000" />
                    <div className="fixed bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-violet-600/[0.04] rounded-full blur-[180px] pointer-events-none transition-opacity duration-1000" />
                </>
            ) : (
                <>
                    <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[#E50914]/[0.05] rounded-full blur-[250px] pointer-events-none transition-opacity duration-1000" />
                    <div className="fixed top-[40%] right-[-200px] w-[600px] h-[600px] bg-[#E50914]/[0.03] rounded-full blur-[200px] pointer-events-none transition-opacity duration-1000" />
                </>
            )}

            {/* Navbar */}
            <nav className={`fixed top-0 left-0 right-0 z-50 border-b ${theme === 'cyber' ? 'border-white/[0.02] bg-[#020617]/50 shadow-[0_4px_40px_rgba(0,0,0,0.5)]' : 'border-white/[0.04] bg-[#0a0a0a]/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'}  backdrop-blur-2xl transition-colors duration-1000`}>
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3 group cursor-pointer border rounded-2xl px-2 py-1" onClick={() => window.scrollTo(0, 0)} style={{ borderColor: 'transparent' }}>
                        <div className={`w-10 h-10 rounded-xl ${theme === 'cyber' ? 'bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_20px_rgba(34,211,238,0.3)] group-hover:shadow-[0_0_30px_rgba(34,211,238,0.6)]' : 'bg-gradient-to-br from-[#E50914] to-[#8B0000] shadow-[0_0_20px_rgba(229,9,20,0.4)] group-hover:shadow-[0_0_30px_rgba(229,9,20,0.6)]'} flex items-center justify-center font-black text-white text-xl transition-all duration-500 hover:scale-110`} style={{ fontFamily: 'var(--font-display)' }}>
                            {theme === 'cyber' ? <Activity className="w-5 h-5 text-white" /> : 'T'}
                        </div>
                        <span className="font-black text-xl tracking-[0.05em] text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                            TRAFFIC<span className={theme === 'cyber' ? "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500" : "text-[#E50914]"}> AI</span>

                            <div className={`hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-sm border ml-2 ${theme === 'cyber' ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-[#E50914]/10 border-[#E50914]/30'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${theme === 'cyber' ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'bg-[#E50914] shadow-[0_0_8px_rgba(229,9,20,0.8)]'}`} />
                                <span className={`text-[9px] font-black tracking-widest uppercase ${theme === 'cyber' ? 'text-cyan-400' : 'text-[#E50914]'}`}>Live System</span>
                            </div>

                            {/* Theme Toggle Switch */}
                            <button
                                onClick={(e) => { e.stopPropagation(); setTheme(theme === 'cyber' ? 'netflix' : 'cyber'); }}
                                className={`ml-4 flex items-center gap-2 px-3 py-1.5 rounded-full border ${theme === 'cyber' ? 'bg-slate-900 border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/30' : 'bg-neutral-900 border-[#E50914]/30 text-[#E50914] hover:bg-[#E50914]/10'} transition-all duration-300 text-[10px] uppercase font-bold tracking-wider`}
                            >
                                {theme === 'cyber' ? <Activity className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                                {theme === 'cyber' ? 'Cyber Core' : 'Cinematic'}
                            </button>
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        {user ? (
                            <Link to={user.role === 'ambulance_driver' ? '/ambulance' : user.role === 'admin' ? '/dashboard' : '/user-portal'} className={`px-5 py-2.5 rounded-xl border transition-all text-sm font-bold tracking-wide shadow-lg hover:scale-105 active:scale-95 ${theme === 'cyber' ? 'bg-white/5 border-white/10 hover:border-cyan-500/30 text-cyan-50 hover:bg-white/10' : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 text-white'}`}>
                                Go to Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" className={`hidden sm:block px-5 py-2.5 rounded-xl transition-all text-sm font-bold border border-transparent tracking-wide ${theme === 'cyber' ? 'text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    Sign In
                                </Link>
                                <Link to="/register" className={`relative px-6 py-2.5 rounded-xl font-bold text-sm group tracking-wide overflow-hidden border transition-all hover:scale-105 active:scale-95 ${theme === 'cyber' ? 'bg-transparent text-white border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_35px_rgba(34,211,238,0.5)]' : 'bg-[#E50914] text-white border-transparent hover:bg-[#B20710] shadow-[0_0_20px_rgba(229,9,20,0.3)] hover:shadow-[0_0_30px_rgba(229,9,20,0.5)]'}`}>

                                    {theme === 'cyber' && <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 opacity-80 group-hover:opacity-100 transition-opacity" />}

                                    <div className="relative flex items-center gap-2">
                                        Get Started
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <motion.main
                style={{ y: yHero, opacity: opacityHero }}
                className="relative z-10 pt-44 pb-32 px-6 max-w-7xl mx-auto flex flex-col items-center text-center min-h-screen justify-center"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`inline-flex items-center gap-2 px-5 py-2 rounded-full border backdrop-blur-xl mb-8 transition-colors ${theme === 'cyber' ? 'border-cyan-500/30 bg-[#020617]/50 shadow-[0_0_30px_rgba(34,211,238,0.15)]' : 'border-white/10 bg-white/5'}`}
                >
                    <Zap className={`w-4 h-4 ${theme === 'cyber' ? 'text-cyan-400' : 'text-[#E50914]'}`} />
                    <span className={`text-[12px] font-bold tracking-[0.2em] uppercase ${theme === 'cyber' ? 'text-cyan-100' : 'text-gray-300'}`}>Next-Generation Data Core</span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="text-5xl md:text-7xl lg:text-[5.5rem] font-black tracking-tight text-white mb-8 leading-[1.05] drop-shadow-2xl"
                    style={{ fontFamily: 'var(--font-display)' }}
                >
                    {theme === 'cyber' ? (
                        <>
                            Autonomous <span className="text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 via-cyan-500 to-blue-600">Intelligence</span><br />
                            for the Modern Grid.
                        </>
                    ) : (
                        <>
                            Intelligent <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E50914] to-[#ff4b4b]">Surveillance</span><br />
                            for Modern Cities.
                        </>
                    )}
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.4 }}
                    className="max-w-3xl mx-auto text-lg md:text-xl text-slate-300 mb-12 leading-relaxed font-medium mix-blend-screen"
                >
                    Harnessing the power of YOLOv8 computer vision and real-time deep learning to orchestrate autonomous signal control, highly accurate vehicle telemetry, and seamless emergency prioritization.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full sm:w-auto mt-4 z-20"
                >
                    <Link
                        to={user ? (user.role === 'admin' ? '/dashboard' : user.role === 'ambulance_driver' ? '/ambulance' : '/user-portal') : '/login'}
                        className={`relative w-full sm:w-auto px-10 py-5 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 uppercase tracking-wider group overflow-hidden border ${theme === 'cyber' ? 'bg-transparent text-white border-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.3)] hover:shadow-[0_0_60px_rgba(34,211,238,0.5)]' : 'bg-[#E50914] text-white border-transparent shadow-[0_0_30px_rgba(229,9,20,0.3)] hover:shadow-[0_0_40px_rgba(229,9,20,0.5)] hover:bg-[#B20710]'}`}
                    >
                        {theme === 'cyber' && (
                            <>
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:100%_4px] opacity-20" />
                            </>
                        )}
                        <div className="relative flex items-center gap-2 z-10">
                            Initialize Portal <ArrowRight className="w-5 h-5" />
                        </div>
                    </Link>
                    <Link
                        to="/register"
                        className={`w-full sm:w-auto px-10 py-5 rounded-2xl backdrop-blur-2xl border font-bold text-base flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 uppercase tracking-wider ${theme === 'cyber' ? 'bg-[#040b16]/80 hover:bg-slate-800/80 border-slate-700/50 hover:border-violet-500/80 text-slate-200 hover:shadow-[0_0_40px_rgba(139,92,246,0.25)]' : 'bg-[#1a1a1a]/80 hover:bg-[#2a2a2a] border-white/10 hover:border-white/20 text-white'}`}
                    >
                        <Shield className={`w-5 h-5 ${theme === 'cyber' ? 'text-violet-400' : 'text-gray-400'}`} />
                        Create Identity
                    </Link>
                </motion.div>

                {/* Scroll Indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2, duration: 1 }}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-none"
                >
                    <span className={`text-[10px] uppercase tracking-widest font-bold ${theme === 'cyber' ? 'text-cyan-500/80' : 'text-gray-500/80'}`}>Scroll to Explore</span>
                    <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className={`w-6 h-10 rounded-full border-2 flex justify-center p-1.5 backdrop-blur-md ${theme === 'cyber' ? 'border-cyan-500/40' : 'border-[#E50914]/40'}`}
                    >
                        <div className={`w-1.5 h-2.5 rounded-full ${theme === 'cyber' ? 'bg-cyan-400' : 'bg-[#E50914]'}`} />
                    </motion.div>
                </motion.div>
            </motion.main>

            {/* Platform Capabilities */}
            <section ref={addToRefs} className="relative z-10 py-32 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-20 relative">
                    {theme === 'cyber' && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[150px] bg-cyan-600/10 blur-[80px] pointer-events-none" />
                    )}
                    <h2
                        className="text-4xl md:text-6xl font-black text-white mb-6 uppercase tracking-tight relative z-10"
                        style={{ fontFamily: 'var(--font-display)' }}
                    >
                        Core <span className={theme === 'cyber' ? "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500" : "text-[#E50914]"}>Capabilities</span>
                    </h2>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium">
                        Equipped with best-in-class deep learning algorithms for autonomous metropolitan management.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 lg:gap-10">
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
                        accentColor="#22d3ee" // cyan-400
                        glowColor="rgba(34, 211, 238, 0.15)"
                        theme={theme}
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
                        accentColor="#f43f5e" // rose-500 for emergency
                        glowColor="rgba(244, 63, 94, 0.15)"
                        theme={theme}
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
                        accentColor="#a855f7" // purple-500
                        glowColor="rgba(168, 85, 247, 0.15)"
                        theme={theme}
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
                        accentColor="#34d399" // emerald-400
                        glowColor="rgba(52, 211, 153, 0.15)"
                        theme={theme}
                    />
                </div>
            </section>

            {/* Architecture Stack Section */}
            <section ref={addToRefs} className="relative z-10 py-24 px-6 max-w-7xl mx-auto mt-10">
                <div className="relative z-10 text-center mb-16">
                    <h2
                        className="text-4xl md:text-5xl font-black text-white mb-6 uppercase tracking-[-0.02em] drop-shadow-lg"
                        style={{ fontFamily: 'var(--font-display)' }}
                    >
                        DATA <span className={theme === 'cyber' ? "text-[#c084fc]" : "text-[#E50914]"}>ARCHITECTURE</span>
                    </h2>
                    <p className="text-[#9ea7ba] text-[17px] max-w-3xl mx-auto font-medium leading-relaxed">
                        A scalable, ultra-fast pipeline engineered for high throughput and reliable ML inference at the edge.
                    </p>
                </div>

                <div className="relative flex flex-col md:flex-row items-center justify-center max-w-[1100px] mx-auto z-10 pt-10">
                    {/* Continuous horizontal backbone line */}
                    <div className={`hidden md:block absolute top-[180px] left-[5%] right-[5%] h-[1px] z-0 ${theme === 'cyber' ? 'bg-slate-800/80' : 'bg-white/10'}`}>
                        {/* Glowing intersection dots */}
                        <div className={`absolute top-1/2 left-[28%] w-20 h-[2px] -translate-y-1/2 opacity-80 ${theme === 'cyber' ? 'bg-gradient-to-r from-transparent via-[#3b82f6] to-transparent' : 'bg-gradient-to-r from-transparent via-[#E50914] to-transparent'}`} />
                        <div className={`absolute top-1/2 left-[55%] w-20 h-[2px] -translate-y-1/2 opacity-80 ${theme === 'cyber' ? 'bg-gradient-to-r from-transparent via-[#10b981] to-transparent' : 'bg-gradient-to-r from-transparent via-[#E50914] to-transparent'}`} />
                        <div className={`absolute top-1/2 left-[82%] w-20 h-[2px] -translate-y-1/2 opacity-80 ${theme === 'cyber' ? 'bg-gradient-to-r from-transparent via-[#f59e0b] to-transparent' : 'bg-gradient-to-r from-transparent via-[#E50914] to-transparent'}`} />

                        {/* High-speed data packet trace */}
                        <motion.div
                            initial={{ left: "-10%" }}
                            animate={{ left: "110%" }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            className={`absolute top-0 h-full w-32 shadow-[0_0_10px_#ffffff] ${theme === 'cyber' ? 'bg-gradient-to-r from-transparent via-white to-transparent' : 'bg-gradient-to-r from-transparent via-[#ff4b4b] to-transparent'}`}
                        />
                    </div>

                    <ArchNode
                        number="01 · BACKEND"
                        title="FastAPI + Python"
                        subtitle="Asynchronous APIs & core logic orchestration"
                        icon={Terminal}
                        colorHex="#3b82f6"
                        theme={theme}
                    />
                    <ArchNode
                        number="02 · VISION"
                        title="YOLOv8 + OpenCV"
                        subtitle="Real-time object detection & bounding boxes"
                        icon={BrainCircuit}
                        colorHex="#10b981"
                        theme={theme}
                    />
                    <ArchNode
                        number="03 · STORAGE"
                        title="PostgreSQL"
                        subtitle="Robust relational data management via SQLAlchemy"
                        icon={Database}
                        colorHex="#f59e0b"
                        theme={theme}
                    />
                    <ArchNode
                        number="04 · FRONTEND"
                        title="React + Tailwind UI"
                        subtitle="Cinematic glassmorphic Command Center"
                        icon={AppWindow}
                        isLast={true}
                        colorHex="#a855f7"
                        theme={theme}
                    />
                </div>

                <div className="mt-28 flex justify-center relative z-10">
                    <div className={`inline-flex items-center gap-4 px-8 py-4 rounded-full border backdrop-blur-xl shadow-lg hover:scale-105 transition-transform cursor-default ${theme === 'cyber' ? 'border-cyan-500/40 bg-[#020617]/80 shadow-[0_0_40px_rgba(34,211,238,0.25)]' : 'border-[#E50914]/40 bg-[#1a1a1a] shadow-[0_0_40px_rgba(229,9,20,0.25)]'}`}>
                        <div className="relative flex h-4 w-4">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${theme === 'cyber' ? 'bg-cyan-400' : 'bg-[#E50914]'}`}></span>
                            <span className={`relative inline-flex rounded-full h-4 w-4 ${theme === 'cyber' ? 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,1)]' : 'bg-[#E50914] shadow-[0_0_12px_rgba(229,9,20,1)]'}`}></span>
                        </div>
                        <span className={`text-sm font-black tracking-[0.2em] uppercase ${theme === 'cyber' ? 'text-cyan-50' : 'text-white'}`}>Ecosystem Fully Operational</span>
                    </div>
                </div>
            </section>

            {/* Sub-Footer Call to action */}
            <section ref={addToRefs} className="relative z-10 py-32 px-6 text-center">
                <h3 className="text-4xl md:text-5xl font-black text-white mb-10" style={{ fontFamily: 'var(--font-display)' }}>Ready to initialize the grid?</h3>
                <Link
                    to="/register"
                    className={`inline-flex items-center gap-3 px-12 py-6 rounded-2xl text-white font-black text-lg transition-all hover:scale-105 active:scale-95 uppercase tracking-widest border ${theme === 'cyber' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-[0_0_60px_rgba(34,211,238,0.5)] border-cyan-300' : 'bg-[#E50914] hover:bg-[#B20710] hover:shadow-[0_0_60px_rgba(229,9,20,0.5)] border-transparent'}`}
                >
                    Deploy System <Activity className="w-6 h-6" />
                </Link>
            </section>

            {/* Footer */}
            <footer className={`border-t py-12 relative z-10 mt-auto transition-colors duration-1000 ${theme === 'cyber' ? 'border-slate-800/80 bg-[#010309]' : 'border-white/5 bg-[#0a0a0a]'}`}>
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white group-hover:scale-110 transition-transform ${theme === 'cyber' ? 'bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'bg-[#E50914] shadow-[0_0_20px_rgba(229,9,20,0.3)]'}`} style={{ fontFamily: 'var(--font-display)' }}>
                            <Activity className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-xl tracking-[0.1em] text-white flex items-center gap-1" style={{ fontFamily: 'var(--font-display)' }}>
                            TRAFFIC<span className={theme === 'cyber' ? "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500" : "text-[#E50914]"}> AI</span>
                        </span>
                    </div>
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-widest bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800">
                        &copy; {new Date().getFullYear()} Traffic Vision AI Platform. Engineered for smart cities.
                    </div>
                </div>
            </footer>
        </div>
    );
}
