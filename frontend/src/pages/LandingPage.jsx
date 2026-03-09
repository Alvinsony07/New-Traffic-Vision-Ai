import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight } from 'lucide-react';
import Lenis from 'lenis';

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CONSTANTS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const SLIDE_DURATION = 6000; // ms per slide

const HERO_SLIDES = [
  {
    id: 1,
    image: '/images/landing/hero-city-skyline.jpg',
    subtitle: 'Density-Driven Signal Control',
    title: ['Autonomous', 'Traffic', 'Intelligence'],
  },
  {
    id: 2,
    image: '/images/landing/city-traffic-night.jpg',
    subtitle: 'Density-Priority Switching',
    title: ['Highest Count', 'Lane Gets', 'Green'],
  },
  {
    id: 3,
    image: '/images/landing/hero-emergency-lights.jpg',
    subtitle: 'Emergency Preemption',
    title: ['Ambulance', 'Corridor', 'Cleared'],
  },
  {
    id: 4,
    image: '/images/landing/aerial-traffic-intersection.jpg',
    subtitle: 'YOLOv8 Vision Inference',
    title: ['Five Vehicle', 'Classes', 'Detected'],
  },
  {
    id: 5,
    image: '/images/landing/hero-city-night.jpg',
    subtitle: 'Operations Dashboard',
    title: ['Live Signal', 'State', 'Analytics'],
  },
];

const FEATURES = [
  {
    image: '/images/landing/aerial-traffic-intersection.jpg',
    label: 'The engine of intelligence',
    title: 'YOLOv8 Detection Core',
    desc: 'Our proprietary pipeline processes multi-camera RTSP streams through YOLOv8 object detection, mapping dense traffic objects into actionable volumetric data states with sub-100ms latency.',
  },
  {
    image: '/images/landing/traffic-signal.jpg',
    label: 'Chosen by cities. Built for scale',
    title: 'Adaptive Signal Logic',
    desc: 'Replaces outdated static timers with genuine volumetric signal logic. Each intersection autonomously adjusts green phases based on real-time vehicle density percentages across all approaches.',
  },
  {
    image: '/images/landing/ambulance-city.jpg',
    label: 'Customised for every intersection',
    title: 'Emergency Preemption',
    desc: 'When an ambulance is detected, the system triggers an immediate signal preemption cascade—clearing corridors with 100ms response time and automatic return-to-normal sequencing.',
  },
];

const PORTAL_MODULES = [
  {
    name: 'Admin Portal',
    status: 'Live',
    statusColor: 'text-emerald-400',
    desc: 'Manual signal override, RTSP stream config, user management, and CSV data export.',
    image: '/images/landing/control-room.jpg',
  },
  {
    name: 'User Portal',
    status: 'Live',
    statusColor: 'text-blue-400',
    desc: 'Accident reporting with GPS, analytics charts, city overview map, and dispatch tracking.',
    image: '/images/landing/analytics-dashboard.jpg',
  },
  {
    name: 'Ambulance Driver',
    status: 'Beta',
    statusColor: 'text-amber-400',
    desc: 'Dispatch acceptance, en-route status updates, and arrival logging for ambulance operators.',
    image: '/images/landing/ambulance-city.jpg',
  },
  {
    name: 'Detection Engine',
    status: 'Live',
    statusColor: 'text-emerald-400',
    desc: 'YOLOv8 Nano processing video frames to count and classify vehicles per lane in real time.',
    image: '/images/landing/ai-code.jpg',
  },
];

const COMING_SOON = [
  { title: 'Multi-Intersection Coordination', desc: 'Coordinated signal timing across multiple intersections for wave-progression routing.' },
  { title: 'Real-Time GPS Ambulance Tracking', desc: 'Live map display of ambulance location during active dispatch with ETA calculations.' },
  { title: 'Mobile App for Drivers', desc: 'Push notifications for new dispatches and a mobile-first status update interface.' },
];

const TECH_STACK = [
  { group: 'Frontend', items: ['React 19', 'Vite 7', 'Tailwind CSS 4', 'Framer Motion 12', 'Leaflet', 'Chart.js'] },
  { group: 'Backend', items: ['FastAPI (Python)', 'SQLAlchemy 2.0', 'PostgreSQL', 'Pydantic v2', 'Uvicorn'] },
  { group: 'AI & Vision', items: ['YOLOv8 Nano', 'OpenCV', 'EasyOCR', 'NumPy'] },
  { group: 'Auth & Stream', items: ['JWT (python-jose)', 'bcrypt', 'IP Rate Limiting', 'MJPEG Streaming'] },
];

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   REUSABLE ANIMATION COMPONENTS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const RevealText = ({ children, delay = 0, className = '' }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: '-8%' });
  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.div
        initial={{ y: '110%', opacity: 0 }}
        animate={isInView ? { y: 0, opacity: 1 } : { y: '110%', opacity: 0 }}
        transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
};

const FadeInView = ({ children, delay = 0, className = '' }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: '-5%' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const ParallaxImage = ({ src, alt, className = '', speed = 0.15 }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [`-${speed * 100}%`, `${speed * 100}%`]);
  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.img
        src={src}
        alt={alt}
        style={{ y }}
        className="w-full h-[120%] object-cover"
        loading="lazy"
      />
    </div>
  );
};

/* Scroll-triggered marquee: lines slide in from opposite sides as section enters viewport */
const ScrollMarquee = ({ lineLeft, lineRight }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const xLeft = useTransform(scrollYProgress, [0, 1], ['-52%', '0%']);
  const xRight = useTransform(scrollYProgress, [0, 1], ['52%', '0%']);
  return (
    <div ref={ref} className="w-full overflow-hidden py-2">
      <motion.h2
        style={{ x: xLeft, willChange: 'transform' }}
        className="text-white text-center text-[clamp(1.8rem,4vw,4.5rem)] leading-none tracking-wide font-syncopate font-bold whitespace-nowrap select-none"
      >
        {lineLeft}
      </motion.h2>
      <motion.h2
        style={{ x: xRight, willChange: 'transform' }}
        className="text-white text-center text-[clamp(1.8rem,4vw,4.5rem)] leading-none tracking-wide font-syncopate font-bold whitespace-nowrap select-none mt-2"
      >
        {lineRight}
      </motion.h2>
    </div>
  );
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   NAVBAR
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const Navbar = ({ user }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
      <motion.nav
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 ${
          scrolled
            ? 'bg-black/90 backdrop-blur-xl py-4 shadow-[0_1px_0_rgba(255,255,255,0.06)]'
            : 'bg-transparent py-7'
        }`}
      >
        <div className="max-w-[92vw] mx-auto flex items-center justify-between">
          <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="group z-50">
            <span
              className="text-white text-lg md:text-xl tracking-[0.25em] uppercase font-syncopate font-bold"
            >
              TRAFFIC
              <span className="text-white/40 group-hover:text-white transition-colors duration-500">VISION</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-10">
            {['About', 'Technology', 'Modules'].map((item) => (
              <button
                key={item}
                onClick={() => {
                  const el = document.getElementById(item.toLowerCase());
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-white/60 text-[11px] tracking-[0.2em] uppercase font-medium hover:text-white transition-colors duration-300 font-inter"
              >
                {item}
              </button>
            ))}

            <button
              onClick={() => navigate('/about-system')}
              className="text-white/60 text-[11px] tracking-[0.2em] uppercase font-medium hover:text-white transition-colors duration-300 font-inter"
            >
              About System
            </button>

            {user ? (
              <Link
                to={user.role === 'admin' ? '/dashboard' : '/user-portal'}
                className="text-white text-[11px] tracking-[0.2em] uppercase font-medium relative group py-2 font-inter"
              >
                <span>Open Portal</span>
                <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-white transition-all duration-500 group-hover:w-full" />
              </Link>
            ) : (
              <Link
                to="/register"
                className="text-white text-[11px] tracking-[0.2em] uppercase font-medium relative group py-2 font-inter"
              >
                <span>Deploy System</span>
                <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-white transition-all duration-500 group-hover:w-full" />
              </Link>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="z-50 flex flex-col gap-[6px] group cursor-pointer md:hidden"
            aria-label="Toggle menu"
          >
            <span
              className={`block w-7 h-[1.5px] bg-white transition-all duration-500 origin-center ${
                mobileOpen ? 'rotate-45 translate-y-[7.5px]' : ''
              }`}
            />
            <span
              className={`block w-7 h-[1.5px] bg-white transition-all duration-500 ${
                mobileOpen ? 'opacity-0 scale-0' : ''
              }`}
            />
            <span
              className={`block w-7 h-[1.5px] bg-white transition-all duration-500 origin-center ${
                mobileOpen ? '-rotate-45 -translate-y-[7.5px]' : ''
              }`}
            />
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[90] bg-black flex flex-col items-center justify-center gap-10"
          >
            {['About', 'Technology', 'Modules'].map((item, i) => (
              <motion.button
                key={item}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.6 }}
                onClick={() => {
                  setMobileOpen(false);
                  setTimeout(() => {
                    document.getElementById(item.toLowerCase())?.scrollIntoView({ behavior: 'smooth' });
                  }, 400);
                }}
                className="text-white text-2xl tracking-[0.3em] uppercase font-syncopate font-normal"
              >
                {item}
              </motion.button>
            ))}
            <motion.button
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.38, duration: 0.6 }}
              onClick={() => { setMobileOpen(false); navigate('/about-system'); }}
              className="text-white text-2xl tracking-[0.3em] uppercase font-syncopate font-normal"
            >
              About System
            </motion.button>
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              {user ? (
                <Link
                  to={user.role === 'admin' ? '/dashboard' : '/user-portal'}
                  onClick={() => setMobileOpen(false)}
                  className="text-white/60 text-lg tracking-[0.2em] uppercase font-inter"
                >
                  Open Portal
                </Link>
              ) : (
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="text-white/60 text-lg tracking-[0.2em] uppercase font-inter"
                >
                  Deploy System
                </Link>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   HERO SLIDESHOW
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const HeroSlideshow = () => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef(null);
  const [progressKeys, setProgressKeys] = useState(HERO_SLIDES.map(() => 0));

  const goto = useCallback(
    (index) => {
      setDirection(index > current ? 1 : -1);
      setCurrent(index);
      setProgressKeys(prev => { const next = [...prev]; next[index] += 1; return next; });
    },
    [current],
  );

  const next = useCallback(() => {
    const n = (current + 1) % HERO_SLIDES.length;
    goto(n);
  }, [current, goto]);

  const prev = useCallback(() => {
    const n = (current - 1 + HERO_SLIDES.length) % HERO_SLIDES.length;
    goto(n);
  }, [current, goto]);

  useEffect(() => {
    timerRef.current = setTimeout(next, SLIDE_DURATION);
    return () => clearTimeout(timerRef.current);
  }, [current, next]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  const slide = HERO_SLIDES[current];

  const slideVariants = {
    enter: (d) => ({ opacity: 0, scale: 1.08, x: d > 0 ? 60 : -60 }),
    center: { opacity: 1, scale: 1, x: 0 },
    exit: (d) => ({ opacity: 0, scale: 1.04, x: d > 0 ? -60 : 60 }),
  };

  return (
    <section
      className="relative h-screen w-full overflow-hidden bg-black"
    >
      <AnimatePresence custom={direction} mode="sync">
        <motion.div
          key={slide.id}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <div
            className="absolute inset-0 bg-cover bg-center will-change-transform"
            style={{
              backgroundImage: `url('${slide.image}')`,
              animation: `kenBurns ${SLIDE_DURATION}ms linear forwards`,
            }}
          />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-black/60 z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 z-10" />

      <div className="absolute inset-0 z-20 flex items-center">
        <div className="px-8 md:px-16 xl:px-28 max-w-4xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id + '-text'}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <p
                className="text-white/50 text-[10px] md:text-xs tracking-[0.35em] uppercase mb-6 font-inter font-medium"
              >
                {slide.subtitle}
              </p>
              <h1
                className="text-white leading-[1.05] font-inter"
              >
                {slide.title.map((line, i) => (
                  <span key={i} className="block">
                    <span
                      className={`${
                        i === slide.title.length - 1 ? 'font-bold' : 'font-light'
                      } text-[clamp(2.2rem,6vw,5rem)] tracking-[0.04em]`}
                    >
                      {line}
                    </span>
                  </span>
                ))}
              </h1>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full z-20 overflow-hidden pointer-events-none">
        <motion.h2
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '22%', opacity: 1 }}
          transition={{ duration: 1.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="text-[9vw] md:text-[8vw] leading-none text-white/[0.07] whitespace-nowrap tracking-tighter text-center select-none font-syncopate font-bold"
        >
          TRAFFICVISION
        </motion.h2>
      </div>

      <div className="absolute bottom-10 left-8 md:left-16 xl:left-28 z-30 flex items-center gap-2">
        {HERO_SLIDES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goto(i)}
            className="h-[2px] relative cursor-pointer group"
            style={{ width: i === current ? 48 : 32 }}
            aria-label={`Go to slide ${i + 1}`}
          >
            <span className="absolute inset-0 bg-white/20 rounded-full" />
            {i === current && (
              <span
                key={`prog-${s.id}-${progressKeys[i]}`}
                className="absolute inset-0 rounded-full landing-progress-bar"
                style={{ '--slide-duration': `${SLIDE_DURATION}ms` }}
              />
            )}
          </button>
        ))}
        <span
          className="ml-4 text-white/40 text-[10px] tracking-[0.15em] tabular-nums font-inter"
        >
          {String(current + 1).padStart(2, '0')} / {String(HERO_SLIDES.length).padStart(2, '0')}
        </span>
      </div>


    </section>
  );
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MAIN LANDING PAGE
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export default function LandingPage() {
  const { user } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  /* Lenis ultra-smooth scroll */
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
    });
    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] text-white selection:bg-white/20 selection:text-white overflow-x-hidden font-inter"
    >
      <Navbar user={user} />

      {/* â”€â”€â”€ 1. HERO SLIDESHOW â”€â”€â”€ */}
      <HeroSlideshow />

      {/* â”€â”€â”€ 2. INTRODUCTION (Warm White Section) â”€â”€â”€ */}
      <section id="about" className="relative z-30 bg-[#f5f3ef] text-[#1a1a1a] py-28 md:py-40 px-8 md:px-16 xl:px-28">
        <div className="max-w-7xl mx-auto">
          <RevealText>
            <p
              className="text-[11px] tracking-[0.35em] uppercase text-[#1a1a1a]/40 mb-6 font-inter font-semibold"
            >
              Welcome to Traffic Vision
            </p>
          </RevealText>

          <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">
            <div className="lg:w-1/2">
              <RevealText delay={0.1}>
                <h2
                  className="text-3xl md:text-5xl lg:text-[3.5rem] leading-[1.1] tracking-wide font-syncopate font-bold"
                >
                  Redefine<br />your traffic
                </h2>
              </RevealText>

              <FadeInView delay={0.3} className="mt-14">
                <div className="relative h-[280px] md:h-[380px] w-full overflow-hidden group">
                  <img
                    src="/images/landing/intro-aerial.jpg"
                    alt="Traffic intersection aerial view"
                    className="absolute inset-0 w-full h-full object-cover transition-all duration-700 scale-105 hover:scale-100 group-hover:brightness-110 group-hover:saturate-125"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-[1] pointer-events-none" />
                </div>
              </FadeInView>
            </div>

            <div className="lg:w-1/2 flex flex-col justify-center gap-8">
              <RevealText delay={0.15}>
                <p className="text-lg md:text-xl font-light leading-relaxed text-[#1a1a1a]/70 tracking-wide">
                  Traffic Vision AI counts vehicles across intersection lanes using the YOLOv8 Nano
                  model on live video feeds. The system autonomously assigns green-phase durations
                  based on real-time lane density—the busiest lane always gets priority.
                </p>
              </RevealText>
              <RevealText delay={0.25}>
                <p className="text-lg md:text-xl font-light leading-relaxed text-[#1a1a1a]/70 tracking-wide">
                  When an ambulance is detected via OCR text reading or emergency light patterns,
                  every other lane is immediately forced to red—creating an unobstructed corridor.
                  Admins, users, and ambulance drivers each access distinct role-based portals.
                </p>
              </RevealText>
              <RevealText delay={0.35}>
                <Link
                  to="/about-system"
                  className="inline-flex items-center gap-3 text-[11px] font-bold tracking-[0.25em] uppercase mt-4 border-b border-[#1a1a1a] pb-2 hover:border-[#1a1a1a]/30 transition-all duration-500 group w-max text-[#1a1a1a] font-inter"
                >
                  About the system
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1.5 transition-transform duration-300" />
                </Link>
              </RevealText>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€â”€ 3. "MADE WITH AI / PERFECTED IN REAL-TIME" Feature Sections â”€â”€â”€ */}
      <section id="technology" className="relative z-30 bg-[#0a0a0a] overflow-hidden">

        {/* Full-width editorial parallax band */}
        <div className="relative h-[50vh] md:h-[70vh] w-full overflow-hidden">
          <ParallaxImage
            src="/images/landing/band-city-panorama.jpg"
            alt="Smart city panorama with traffic"
            className="h-full w-full"
            speed={0.1}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a] z-10" />
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <ScrollMarquee lineLeft="Density-Driven Logic" lineRight="Emergency-First Design" />
          </div>
        </div>

        {/* Feature editorial sections */}
        <div className="max-w-7xl mx-auto py-28 md:py-40 px-8 md:px-16 xl:px-28 space-y-32 md:space-y-48">
          {FEATURES.map((feat, i) => {
            const isReversed = i % 2 !== 0;
            return (
              <div
                key={i}
                className={`flex flex-col ${isReversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 lg:gap-20 items-center`}
              >
                <FadeInView delay={0.1} className="lg:w-[55%] w-full">
                  <div className="relative h-[350px] md:h-[500px] w-full overflow-hidden group">
                    <img
                      src={feat.image}
                      alt={feat.title}
                      className="absolute inset-0 w-full h-full object-cover transition-all duration-700 scale-[1.02] group-hover:scale-100 group-hover:brightness-110 group-hover:saturate-125"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-[1] pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-[2]" />
                  </div>
                </FadeInView>

                <div className="lg:w-[45%] w-full flex flex-col justify-center">
                  <RevealText>
                    <p
                      className="text-[10px] tracking-[0.35em] uppercase text-white/30 mb-4 font-inter font-semibold"
                    >
                      {feat.label}
                    </p>
                  </RevealText>
                  <RevealText delay={0.1}>
                    <h3
                      className="text-2xl md:text-4xl tracking-wide text-white leading-[1.15] mb-6 font-syncopate font-bold"
                    >
                      {feat.title}
                    </h3>
                  </RevealText>
                  <RevealText delay={0.2}>
                    <p className="text-white/50 text-base md:text-lg font-light leading-relaxed tracking-wide">
                      {feat.desc}
                    </p>
                  </RevealText>
                </div>
              </div>
            );
          })}
        </div>

        {/* Second parallax band */}
        <div className="relative h-[50vh] md:h-[70vh] w-full overflow-hidden">
          <ParallaxImage
            src="/images/landing/band-city-dusk.jpg"
            alt="City traffic at dusk"
            className="h-full w-full"
            speed={0.1}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a] z-10" />
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <ScrollMarquee lineLeft="Built with Python" lineRight="Powered by YOLOv8" />
          </div>
        </div>
      </section>

      {/* â”€â”€â”€ 4. BENTO IMAGE GRID — Architecture â”€â”€â”€ */}
      <section className="relative z-30 bg-[#0a0a0a] py-28 md:py-40 px-8 md:px-16 xl:px-28">
        <div className="max-w-7xl mx-auto">
          <RevealText>
            <p
              className="text-[10px] tracking-[0.35em] uppercase text-white/30 mb-3 font-inter font-semibold"
            >
              Core Technologies
            </p>
          </RevealText>
          <RevealText delay={0.1}>
            <h2
              className="text-3xl md:text-5xl tracking-wide text-white mb-16 md:mb-24 font-syncopate font-bold"
            >
              Architecture
            </h2>
          </RevealText>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6">
            <FadeInView className="md:col-span-8 h-[400px] md:h-[600px] relative overflow-hidden group">
              <img
                src="/images/landing/city-traffic-night.jpg"
                alt="AI Traffic monitoring system"
                className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 group-hover:brightness-110 group-hover:saturate-125 transition-all duration-700"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-[1] pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8">
                <h3
                  className="text-2xl md:text-3xl tracking-widest uppercase mb-3 text-white font-syncopate font-bold"
                >
                  YOLOv8 Engine
                </h3>
                <p className="text-white/60 font-light text-base md:text-lg max-w-lg">
                  Proprietary logic mapping dense traffic objects into actionable volumetric data states.
                </p>
              </div>
            </FadeInView>

            <div className="md:col-span-4 flex flex-col gap-5 md:gap-6">
              <FadeInView delay={0.15} className="flex-1 relative overflow-hidden group h-[280px] md:h-auto">
                <img
                  src="/images/landing/ambulance-city.jpg"
                  alt="Emergency vehicle on road"
                  className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 group-hover:brightness-110 group-hover:saturate-125 transition-all duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-[1] pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-6 left-6">
                  <h3
                    className="text-lg md:text-xl tracking-widest uppercase mb-1 text-white font-syncopate font-bold"
                  >
                    Emergency
                  </h3>
                  <p className="text-white/50 text-sm tracking-wide">100ms Preemption Bypass</p>
                </div>
              </FadeInView>

              <FadeInView delay={0.25} className="flex-1 relative overflow-hidden group h-[280px] md:h-auto">
                <img
                  src="/images/landing/analytics-dashboard.jpg"
                  alt="Analytics dashboard"
                  className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 group-hover:brightness-110 group-hover:saturate-125 transition-all duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-[1] pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-6 left-6">
                  <h3
                    className="text-lg md:text-xl tracking-widest uppercase mb-1 text-white font-syncopate font-bold"
                  >
                    Telemetry
                  </h3>
                  <p className="text-white/50 text-sm tracking-wide">Asynchronous Data Stream</p>
                </div>
              </FadeInView>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 mt-5 md:mt-6">
            {[
              {
                img: '/images/landing/aerial-highway.jpg',
                title: 'Signal Logic',
                desc: 'Density-priority phase control',
              },
              {
                img: '/images/landing/traffic-signal.jpg',
                title: 'Python Backend',
                desc: 'FastAPI microservices',
              },
              {
                img: '/images/landing/band-highway.jpg',
                title: 'Scalable Deploy',
                desc: 'Single-node prototype',
              },
            ].map((card, i) => (
              <FadeInView key={i} delay={0.1 + i * 0.1} className="relative h-[280px] md:h-[320px] overflow-hidden group">
                <img
                  src={card.img}
                  alt={card.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 group-hover:brightness-110 group-hover:saturate-125 transition-all duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-[1] pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-6 left-6">
                  <h3
                    className="text-lg tracking-widest uppercase mb-1 text-white font-syncopate font-bold"
                  >
                    {card.title}
                  </h3>
                  <p className="text-white/50 text-sm tracking-wide">{card.desc}</p>
                </div>
              </FadeInView>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€â”€ 5. SPECS / ARCHITECTURE LIST â”€â”€â”€ */}
      <section className="relative z-30 bg-[#0a0a0a] border-t border-white/[0.06] py-28 md:py-40 px-8 md:px-16 xl:px-28">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 lg:gap-24">
          <div className="lg:w-2/5">
            <RevealText>
              <h2
                className="text-3xl md:text-5xl tracking-wide text-white leading-[1.15] font-syncopate font-bold"
              >
                System<br />Specifications
              </h2>
            </RevealText>
            <FadeInView delay={0.2} className="hidden lg:flex flex-col gap-8 mt-16 sticky top-32">
              <div className="relative h-[440px] w-full overflow-hidden group">
                <img
                  src="/images/landing/city-traffic-night.jpg"
                  alt="City traffic at night with light trails"
                  className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:brightness-110 group-hover:saturate-125 transition-all duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-[1] pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 z-10">
                  <span className="text-[9px] tracking-[0.2em] uppercase text-white/40 font-inter font-semibold">Detection &amp; Control</span>
                </div>
              </div>
              <div className="relative h-[360px] w-full overflow-hidden group">
                <img
                  src="/images/landing/ambulance-city.jpg"
                  alt="Ambulance responding to emergency on city street"
                  className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:brightness-110 group-hover:saturate-125 transition-all duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-[1] pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 z-10">
                  <span className="text-[9px] tracking-[0.2em] uppercase text-white/40 font-inter font-semibold">Emergency Preemption</span>
                </div>
              </div>
            </FadeInView>
          </div>

          <div className="lg:w-3/5 flex flex-col gap-0">
            {[
              {
                title: 'Ingestion Core',
                desc: 'RTSP streams and uploaded video files decoded by OpenCV, with staggered per-lane detection every 4 frames to keep CPU load manageable across all channels.',
              },
              {
                title: 'Algorithmic State',
                desc: 'Density-priority scheduler gives the highest-count lane a green phase of 10–180 seconds, scaled by vehicle count and an optional weather severity multiplier.',
              },
              {
                title: 'Command Portal',
                desc: 'React admin dashboard with REST API polling for live signal state, manual lane override, stream configuration, and CSV data export.',
              },
              {
                title: 'Detection Pipeline',
                desc: 'YOLOv8 Nano model detects 5 vehicle classes (bicycle, car, motorcycle, bus, truck). Ambulances identified via EasyOCR text reading and emergency light pattern scanning.',
              },
              {
                title: 'Emergency Protocol',
                desc: 'When an ambulance is detected, all other lanes are instantly forced red and the ambulance lane turns green—returning to normal schedule once detection clears.',
              },
              {
                title: 'Analytics Engine',
                desc: 'Lane-by-lane historical counts, 24-hour peak analysis, and traffic trend graphs stored in PostgreSQL and visualised with Chart.js on the user dashboard.',
              },
            ].map((spec, i) => (
              <RevealText key={i} delay={i * 0.06}>
                <div className="border-b border-white/[0.06] py-8 md:py-10 group cursor-default">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-8">
                    <div className="flex items-baseline gap-6 md:w-2/5">
                      <span className="text-white/15 text-xs tabular-nums tracking-wider font-inter">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <h3 className="text-xl md:text-2xl font-light tracking-wider text-white group-hover:text-white/70 transition-colors duration-300">
                        {spec.title}
                      </h3>
                    </div>
                    <p className="text-white/40 text-sm md:text-base font-light tracking-wide md:w-3/5 md:text-right leading-relaxed">
                      {spec.desc}
                    </p>
                  </div>
                </div>
              </RevealText>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€â”€ 6. MODULE RANGE — Horizontal Scroll â”€â”€â”€ */}
      <section id="modules" className="relative z-30 bg-[#0a0a0a] border-t border-white/[0.06] py-28 md:py-40">
        <div className="px-8 md:px-16 xl:px-28 max-w-7xl mx-auto mb-14">
          <RevealText>
            <p
              className="text-[10px] tracking-[0.35em] uppercase text-white/30 mb-3 font-inter font-semibold"
            >
              Access the system
            </p>
          </RevealText>
          <RevealText delay={0.1}>
            <h2
              className="text-3xl md:text-5xl tracking-wide text-white font-syncopate font-bold"
            >
              System Portals
            </h2>
          </RevealText>
        </div>

        <FadeInView>
          <div
            className="flex gap-5 md:gap-6 overflow-x-auto pb-6 px-8 md:px-16 xl:px-28 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none' }}
          >
            {PORTAL_MODULES.map((mod, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[80vw] sm:w-[45vw] md:w-[30vw] lg:w-[22vw] snap-start relative h-[420px] md:h-[520px] overflow-hidden group"
              >
                <img
                  src={mod.image}
                  alt={mod.name}
                  className="absolute inset-0 w-full h-full object-cover transition-all duration-700 scale-[1.02] group-hover:scale-100 group-hover:brightness-110 group-hover:saturate-125"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-[1] pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[9px] tracking-[0.2em] uppercase font-bold ${mod.statusColor}`}>
                      â— {mod.status}
                    </span>
                  </div>
                  <h3
                    className="text-xl md:text-2xl tracking-widest uppercase text-white mb-2 font-syncopate font-bold"
                  >
                    {mod.name}
                  </h3>
                  <p className="text-white/50 text-sm tracking-wide font-light">{mod.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </FadeInView>

        {/* Coming Soon */}
        <div className="px-8 md:px-16 xl:px-28 max-w-7xl mx-auto mt-20">
          <RevealText>
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/30 mb-3 font-inter font-semibold">
              Roadmap
            </p>
          </RevealText>
          <RevealText delay={0.08}>
            <h3 className="text-2xl md:text-3xl tracking-wide text-white mb-10 font-syncopate font-bold">
              Coming Soon
            </h3>
          </RevealText>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {COMING_SOON.map((item, i) => (
              <FadeInView key={i} delay={i * 0.08} className="border border-white/[0.08] border-dashed p-6 hover:border-white/20 transition-colors duration-500">
                <p className="text-[9px] tracking-[0.25em] uppercase text-white/20 font-bold mb-3">Soon</p>
                <h4 className="text-white/60 font-semibold tracking-wide text-sm md:text-base mb-2">{item.title}</h4>
                <p className="text-white/25 text-xs font-light leading-relaxed tracking-wide">{item.desc}</p>
              </FadeInView>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div className="px-8 md:px-16 xl:px-28 max-w-7xl mx-auto mt-20">
          <RevealText>
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/30 mb-3 font-inter font-semibold">
              Under The Hood
            </p>
          </RevealText>
          <RevealText delay={0.08}>
            <h3 className="text-2xl md:text-3xl tracking-wide text-white mb-10 font-syncopate font-bold">
              Tech Stack
            </h3>
          </RevealText>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.06]">
            {TECH_STACK.map((group, i) => (
              <FadeInView key={i} delay={i * 0.07} className="bg-[#0a0a0a] p-6">
                <p className="text-[9px] tracking-[0.3em] uppercase text-white/25 font-bold mb-4">{group.group}</p>
                <ul className="flex flex-col gap-2">
                  {group.items.map((item, j) => (
                    <li key={j} className="text-white/45 text-xs md:text-sm font-light tracking-wide flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-white/15 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </FadeInView>
            ))}
          </div>
        </div>

        <div className="px-8 md:px-16 xl:px-28 max-w-7xl mx-auto mt-10">
          <RevealText>
            <Link
              to="/about-system"
              className="inline-flex items-center gap-3 text-[11px] font-bold tracking-[0.25em] uppercase border-b border-white/20 pb-2 hover:border-white transition-all duration-500 group text-white/60 hover:text-white font-inter"
            >
              Explore full system details
              <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1.5 transition-transform duration-300" />
            </Link>
          </RevealText>
        </div>
      </section>

      {/* â”€â”€â”€ 7. SYSTEM FACTS (replaces fake testimonial) â”€â”€â”€ */}
      <section className="relative z-30 bg-[#f5f3ef] text-[#1a1a1a] py-28 md:py-40 px-8 md:px-16 xl:px-28 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <RevealText>
            <p className="text-[10px] tracking-[0.35em] uppercase text-[#1a1a1a]/30 mb-12 font-inter font-semibold">
              What the system actually does
            </p>
          </RevealText>

          <RevealText delay={0.08}>
            <h2 className="text-3xl md:text-5xl tracking-wide font-syncopate font-bold mb-16 text-[#1a1a1a]">
              System Facts
            </h2>
          </RevealText>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#1a1a1a]/10">
            {[
              { num: '5', label: 'Vehicle Classes', detail: 'Bicycle, car, motorcycle, bus, truck — detected by YOLOv8 Nano on every 4th video frame.' },
              { num: '2', label: 'Detection Methods', detail: 'EasyOCR reads ambulance text labels; emergency light scanning detects blue/red clusters in the vehicle\'s upper region.' },
              { num: '3', label: 'User Roles', detail: 'Admin (signal control), User (incident reporting & analytics), and Ambulance Driver (dispatch management).' },
              { num: '10–180s', label: 'Signal Phase Range', detail: 'Green phase duration scales with lane vehicle count. Weather multipliers extend phases during rain, fog, or snow.' },
              { num: 'MJPEG', label: 'Live Streaming', detail: 'Video feeds streamed as MJPEG via FastAPI StreamingResponse, supporting both RTSP sources and uploaded files.' },
              { num: 'JWT', label: 'Auth & Audit', detail: 'All API calls are JWT-authenticated with role-based access; every admin action is logged to a persistent audit trail.' },
            ].map((fact, i) => (
              <FadeInView key={i} delay={i * 0.07} className="bg-[#f5f3ef] p-8 md:p-10">
                <p className="text-3xl md:text-4xl font-syncopate font-bold text-[#1a1a1a] mb-3">{fact.num}</p>
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#1a1a1a]/40 font-bold mb-4">{fact.label}</p>
                <p className="text-[#1a1a1a]/55 text-sm font-light leading-relaxed">{fact.detail}</p>
              </FadeInView>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€â”€ 8. EXTRA IMAGE BAND — Parallax break â”€â”€â”€ */}
      <section className="relative z-30 h-[40vh] md:h-[60vh] w-full overflow-hidden">
        <ParallaxImage
          src="/images/landing/band-highway.jpg"
          alt="Aerial view of a complex highway interchange"
          className="h-full w-full"
          speed={0.12}
        />
        <div className="absolute inset-0 bg-black/40 z-10" />
      </section>

      {/* â”€â”€â”€ 9. NEWSLETTER / SUBSCRIBE â”€â”€â”€ */}
      <section className="relative z-30 bg-[#0a0a0a] py-28 md:py-40 px-8 md:px-16 xl:px-28 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto text-center">
          <RevealText>
            <p
              className="text-[10px] tracking-[0.35em] uppercase text-white/30 mb-6 font-inter font-semibold"
            >
              Subscribe to system updates
            </p>
          </RevealText>
          <RevealText delay={0.1}>
            <h2
              className="text-2xl md:text-4xl tracking-wide text-white mb-10 font-syncopate font-bold"
            >
              Stay Connected
            </h2>
          </RevealText>
          <FadeInView delay={0.2}>
            <form
              className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="Your email address"
                className="flex-1 bg-transparent border border-white/15 px-5 py-3.5 text-white text-sm tracking-wider placeholder:text-white/25 focus:border-white/40 focus:outline-none transition-colors duration-300 font-inter"
              />
              <button
                type="submit"
                className="px-8 py-3.5 bg-white text-[#0a0a0a] text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-white/90 transition-colors duration-300 font-inter"
              >
                Subscribe
              </button>
            </form>
          </FadeInView>
        </div>
      </section>

      {/* â”€â”€â”€ 10. IMPOSING FOOTER CTA â”€â”€â”€ */}
      <section className="relative z-30 bg-[#0a0a0a] pt-28 md:pt-40 pb-12 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/landing/hero-city-skyline.jpg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-[0.04] blur-sm"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-[#0a0a0a]/70" />
        </div>

        <div className="relative z-10 text-center px-8 md:px-16">
          <RevealText>
            <h2
              className="text-3xl md:text-6xl lg:text-7xl tracking-widest text-white leading-[1.1] mb-8 font-syncopate font-bold"
            >
              Initialize The<br />Standard
            </h2>
          </RevealText>

          <RevealText delay={0.15}>
            <p className="text-white/35 text-base md:text-lg font-light tracking-wider max-w-xl mx-auto mb-14">
              Secure authorization required to deploy edge nodes and access administration portals.
            </p>
          </RevealText>

          <RevealText delay={0.25}>
            <Link
              to="/register"
              className="inline-block px-12 py-4 border border-white/15 text-white text-[11px] font-bold tracking-[0.25em] uppercase hover:bg-white hover:text-[#0a0a0a] transition-all duration-500 font-inter"
            >
              Create Root Access
            </Link>
          </RevealText>
        </div>

        {/* Sub footer */}
        <div className="relative z-10 mt-32 md:mt-40 pt-8 border-t border-white/[0.06] mx-8 md:mx-16 xl:mx-28">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-10">
            <div>
              <span
                className="text-white text-sm tracking-[0.25em] uppercase font-syncopate font-bold"
              >
                TRAFFIC<span className="text-white/30">VISION</span>
              </span>
              <p className="text-white/20 text-[10px] tracking-[0.15em] mt-3 font-inter">
                Intelligent Traffic Monitoring &amp; Control
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/30 font-bold mb-2 font-inter">
                Explore
              </p>
              {['About', 'Technology', 'Modules'].map((item) => (
                <button
                  key={item}
                  onClick={() => document.getElementById(item.toLowerCase())?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-white/40 text-xs tracking-wider hover:text-white transition-colors duration-300 text-left font-inter"
                >
                  {item}
                </button>
              ))}
              <Link
                to="/about-system"
                className="text-white/40 text-xs tracking-wider hover:text-white transition-colors duration-300 font-inter"
              >
                About System
              </Link>
              <Link
                to="/login"
                className="text-white/40 text-xs tracking-wider hover:text-white transition-colors duration-300 font-inter"
              >
                Sign In
              </Link>
            </div>

            <div className="text-right">
              <p
                className="text-white/15 text-[10px] tracking-[0.15em] font-inter"
              >
                &copy; {new Date().getFullYear()} Traffic Vision. All rights reserved.
              </p>
              <p
                className="text-white/10 text-[10px] tracking-[0.15em] mt-2 font-inter"
              >
                Designed for uninterrupted flow.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
