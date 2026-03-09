import React, { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════ */

const PORTALS = [
  {
    role: 'Admin Portal',
    status: 'Live',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-400',
    description:
      'The control hub for system operators. Admins can manually override any signal lane to force green, configure video stream sources (RTSP or local file), view real-time lane statistics, download historical data as CSV, and manage all registered user accounts.',
    capabilities: [
      'Manual signal lane override (force green)',
      'Configure RTSP streams or uploaded video files',
      'Real-time lane vehicle counts & signal state',
      'CSV export of historical traffic data',
      'User account management',
      'System audit log viewing',
    ],
  },
  {
    role: 'User Portal',
    status: 'Live',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    dot: 'bg-blue-400',
    description:
      'A public-facing dashboard for citizens and traffic monitors. Users can submit accident reports with GPS coordinates, track the status of their filed reports, view analytics charts (vehicle distribution, 24-hour trends, lane performance), and see a live city overview map with active incidents and dispatch routes.',
    capabilities: [
      'Submit accident reports with location & GPS',
      'Track report status (Reported → Verified → Resolved)',
      'Vehicle type distribution chart',
      '24-hour peak hour analytics',
      'City overview map with incident pins',
      'View active dispatch routes',
    ],
  },
  {
    role: 'Ambulance Driver Portal',
    status: 'Beta',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    dot: 'bg-amber-400',
    description:
      'A dispatch management interface for ambulance drivers and operators. Drivers receive dispatch assignments with hospital destination and distance, accept or decline assignments, and update real-time status as they progress (Dispatched → En Route → Arrived → Patient Loaded). Note: GPS tracking integration is not yet implemented.',
    capabilities: [
      'View incoming dispatch assignments',
      'Accept or decline dispatch requests',
      'Update status: En Route → Arrived → Patient Loaded',
      'View destination hospital & estimated distance',
      'Dispatch history log',
      'Real-time GPS tracking — Coming Soon',
    ],
  },
];

const PIPELINE_STEPS = [
  {
    num: '01',
    title: 'Detect',
    desc: 'Live video from RTSP cameras or uploaded files is decoded by OpenCV. Every 4th frame is passed through the YOLOv8 Nano model, which detects and counts bicycles, cars, motorcycles, buses, and trucks across each configured lane. The detector also scans for ambulances using two methods: EasyOCR to read text labels ("AMBULANCE", "108", "EMS") and blue/red emergency light cluster detection in the upper vehicle region.',
    tech: ['YOLOv8 Nano', 'OpenCV', 'EasyOCR', 'Python'],
  },
  {
    num: '02',
    title: 'Decide',
    desc: 'The signal controller reads vehicle counts from all lanes and calculates green-phase duration for each lane using a density-priority algorithm. The lane with the highest vehicle count gets the green light. Phase durations range from 10 to 180 seconds, scaled by count. A weather multiplier is also available (Rain ×1.25, Fog ×1.35, Snow ×1.50) to extend phases during poor visibility. All decisions are logged to the database.',
    tech: ['FastAPI', 'SQLAlchemy', 'PostgreSQL', 'Python logic'],
  },
  {
    num: '03',
    title: 'Override',
    desc: 'When an ambulance is detected in any lane, the system immediately preempts the standard schedule: the ambulance lane is forced to green and all other lanes are forced to red, creating a clear corridor. This override persists until the ambulance is no longer detected. Admins can also manually override any signal lane at any time from the Admin Portal. All overrides are recorded in the audit log.',
    tech: ['Preemption logic', 'JWT auth', 'Audit log', 'REST API'],
  },
];

const TECH_STACK = [
  {
    group: 'Frontend',
    items: ['React 19', 'Vite 7', 'Tailwind CSS 4', 'Framer Motion 12', 'Leaflet (maps)', 'Chart.js (analytics)'],
  },
  {
    group: 'Backend',
    items: ['FastAPI (Python)', 'SQLAlchemy 2.0 ORM', 'PostgreSQL', 'Pydantic v2 (validation)', 'Uvicorn ASGI server'],
  },
  {
    group: 'AI & Vision',
    items: ['YOLOv8 Nano (Ultralytics)', 'OpenCV (video decode)', 'EasyOCR (text detection)', 'NumPy'],
  },
  {
    group: 'Authentication',
    items: ['JWT (python-jose)', 'bcrypt password hashing', 'IP-based rate limiting', 'Role-based access control'],
  },
  {
    group: 'Streaming',
    items: ['MJPEG via FastAPI StreamingResponse', 'RTSP decode via OpenCV', 'Local video file loop support'],
  },
];

const COMING_SOON = [
  {
    title: 'Multi-Intersection Coordination',
    desc: 'Coordinating signal timing across multiple intersections simultaneously for wave-progression routing.',
  },
  {
    title: 'Real-Time GPS Ambulance Tracking',
    desc: 'Live map display of ambulance location during dispatch, with ETA calculations.',
  },
  {
    title: 'Mobile App for Drivers',
    desc: 'Push notifications for new dispatches and a mobile-first status update interface for ambulance drivers.',
  },
  {
    title: 'Automated Incident Verification',
    desc: 'Cross-referencing submitted accident reports with camera footage in the affected zone for faster verification.',
  },
];

/* ═══════════════════════════════════════════════════════════
   ANIMATION HELPERS
   ═══════════════════════════════════════════════════════════ */

const Reveal = ({ children, delay = 0, className = '' }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, margin: '-6%' });
  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.div
        initial={{ y: '110%', opacity: 0 }}
        animate={inView ? { y: 0, opacity: 1 } : { y: '110%', opacity: 0 }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
};

const FadeUp = ({ children, delay = 0, className = '' }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, margin: '-5%' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function AboutSystemPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden font-inter selection:bg-white/20">

      {/* ── STICKY HEADER ── */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/[0.06] py-4 px-8 md:px-16">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors duration-300 text-[11px] tracking-[0.2em] uppercase font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </button>
          <Link to="/" className="text-white text-sm tracking-[0.25em] uppercase font-syncopate font-bold">
            TRAFFIC<span className="text-white/30">VISION</span>
          </Link>
          <Link
            to="/login"
            className="text-[11px] tracking-[0.2em] uppercase font-medium text-white/50 hover:text-white transition-colors duration-300"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="py-24 md:py-36 px-8 md:px-16 xl:px-28">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p className="text-[10px] tracking-[0.4em] uppercase text-white/30 mb-5 font-semibold">
              About the System
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="text-4xl md:text-6xl lg:text-7xl tracking-wide leading-[1.08] font-syncopate font-bold mb-10">
              Traffic Vision AI
            </h1>
          </Reveal>
          <FadeUp delay={0.2}>
            <p className="text-lg md:text-xl text-white/55 font-light leading-relaxed tracking-wide max-w-3xl">
              Traffic Vision AI is a full-stack proof-of-concept system for real-time, vision-based
              traffic signal control. It uses the YOLOv8 Nano object detection model to count vehicles
              across intersection lanes from live video feeds, then autonomously adjusts signal green-phase
              durations based on density. When an ambulance is detected — via OCR text reading or
              emergency light patterns — the system immediately overrides all signals to create a clear
              corridor. The project is built as an academic demonstration of AI-driven infrastructure
              management, not production hardware deployment.
            </p>
          </FadeUp>

          {/* Quick fact chips */}
          <FadeUp delay={0.3} className="mt-12 flex flex-wrap gap-3">
            {[
              '3 User Roles',
              'YOLOv8 Nano Detection',
              'Hybrid Ambulance Detection',
              'FastAPI + PostgreSQL',
              'MJPEG Live Streaming',
              'JWT Auth',
              'MCA Academic Project',
            ].map((chip) => (
              <span
                key={chip}
                className="border border-white/[0.12] text-white/50 text-[10px] tracking-[0.2em] uppercase px-4 py-2"
              >
                {chip}
              </span>
            ))}
          </FadeUp>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="border-t border-white/[0.06] py-24 md:py-36 px-8 md:px-16 xl:px-28 bg-[#0d0d0d]">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <p className="text-[10px] tracking-[0.4em] uppercase text-white/30 mb-3 font-semibold">
              Core Pipeline
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="text-3xl md:text-5xl tracking-wide font-syncopate font-bold mb-20">
              How It Works
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-8">
            {PIPELINE_STEPS.map((step, i) => (
              <FadeUp key={i} delay={i * 0.1} className="border border-white/[0.08] p-8 md:p-10 relative group hover:border-white/20 transition-colors duration-500">
                <div className="text-[60px] font-syncopate font-bold text-white/[0.04] leading-none absolute top-6 right-8 select-none">
                  {step.num}
                </div>
                <h3 className="text-2xl md:text-3xl font-syncopate font-bold tracking-wide mb-6 text-white">
                  {step.title}
                </h3>
                <p className="text-white/50 font-light leading-relaxed text-sm md:text-base tracking-wide mb-8">
                  {step.desc}
                </p>
                <div className="flex flex-wrap gap-2">
                  {step.tech.map((t) => (
                    <span key={t} className="text-[9px] tracking-[0.2em] uppercase text-white/30 border border-white/[0.08] px-2.5 py-1">
                      {t}
                    </span>
                  ))}
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── PORTALS ── */}
      <section className="border-t border-white/[0.06] py-24 md:py-36 px-8 md:px-16 xl:px-28">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <p className="text-[10px] tracking-[0.4em] uppercase text-white/30 mb-3 font-semibold">
              System Portals
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="text-3xl md:text-5xl tracking-wide font-syncopate font-bold mb-20">
              Three Access Roles
            </h2>
          </Reveal>

          <div className="flex flex-col gap-12">
            {PORTALS.map((portal, i) => (
              <FadeUp key={i} delay={i * 0.1} className="border border-white/[0.08] p-8 md:p-12 hover:border-white/15 transition-colors duration-500">
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
                  <h3 className="text-2xl md:text-3xl font-syncopate font-bold tracking-wide text-white">
                    {portal.role}
                  </h3>
                  <span className={`inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase font-bold border px-3 py-1.5 w-max ${portal.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${portal.dot}`} />
                    {portal.status}
                  </span>
                </div>
                <p className="text-white/50 font-light leading-relaxed text-base md:text-lg tracking-wide mb-8 max-w-3xl">
                  {portal.description}
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {portal.capabilities.map((cap, j) => (
                    <li key={j} className="flex items-start gap-3 text-white/40 text-sm tracking-wide">
                      <CheckCircle2 className="w-4 h-4 text-white/20 mt-0.5 shrink-0" />
                      {cap}
                    </li>
                  ))}
                </ul>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECH STACK ── */}
      <section className="border-t border-white/[0.06] py-24 md:py-36 px-8 md:px-16 xl:px-28 bg-[#0d0d0d]">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <p className="text-[10px] tracking-[0.4em] uppercase text-white/30 mb-3 font-semibold">
              Technologies Used
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="text-3xl md:text-5xl tracking-wide font-syncopate font-bold mb-20">
              Tech Stack
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.06]">
            {TECH_STACK.map((group, i) => (
              <FadeUp key={i} delay={i * 0.07} className="bg-[#0d0d0d] p-8 md:p-10">
                <h3 className="text-[10px] tracking-[0.35em] uppercase text-white/30 font-bold mb-6">
                  {group.group}
                </h3>
                <ul className="flex flex-col gap-3">
                  {group.items.map((item, j) => (
                    <li key={j} className="text-white/60 text-sm md:text-base font-light tracking-wide flex items-center gap-3">
                      <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMING SOON ── */}
      <section className="border-t border-white/[0.06] py-24 md:py-36 px-8 md:px-16 xl:px-28">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <p className="text-[10px] tracking-[0.4em] uppercase text-white/30 mb-3 font-semibold">
              Roadmap
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="text-3xl md:text-5xl tracking-wide font-syncopate font-bold mb-5">
              Coming Soon
            </h2>
          </Reveal>
          <FadeUp delay={0.15}>
            <p className="text-white/30 text-sm tracking-wide mb-16 max-w-2xl font-light">
              The following features are not yet implemented. They represent planned future directions for this project.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {COMING_SOON.map((item, i) => (
              <FadeUp key={i} delay={i * 0.08} className="border border-white/[0.08] border-dashed p-8 flex gap-5 items-start hover:border-white/20 transition-colors duration-500">
                <Clock className="w-5 h-5 text-white/20 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base md:text-lg font-semibold tracking-wide text-white/60 mb-2">{item.title}</h3>
                  <p className="text-white/30 text-sm font-light leading-relaxed tracking-wide">{item.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── HONEST SCOPE DISCLAIMER ── */}
      <section className="border-t border-white/[0.06] py-16 px-8 md:px-16 xl:px-28 bg-[#0d0d0d]">
        <div className="max-w-4xl mx-auto flex gap-5 items-start">
          <AlertCircle className="w-5 h-5 text-amber-400/60 shrink-0 mt-1" />
          <div>
            <h3 className="text-sm font-bold tracking-[0.2em] uppercase text-white/40 mb-3">
              Academic Project — Scope Clarification
            </h3>
            <p className="text-white/25 text-sm font-light leading-relaxed tracking-wide">
              Traffic Vision AI is a postgraduate MCA semester project demonstrating a proof-of-concept
              for AI-assisted traffic management. It operates on simulated video data and does not
              integrate with real physical traffic signal hardware. Signal state changes are computed
              and stored in the database but are not transmitted to any external hardware controller.
              All ambulance detection is vision-based on video input; no emergency service APIs or
              real dispatch integrations are connected. The system is intended for academic evaluation
              and demonstration purposes.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-white/[0.06] py-24 md:py-36 px-8 md:px-16 xl:px-28 text-center">
        <div className="max-w-2xl mx-auto">
          <Reveal>
            <h2 className="text-3xl md:text-5xl font-syncopate font-bold tracking-wide mb-8">
              Access the System
            </h2>
          </Reveal>
          <FadeUp delay={0.15}>
            <p className="text-white/40 text-base md:text-lg font-light tracking-wide mb-12">
              Sign in to explore the Admin Portal, User Portal, or Ambulance Driver Portal.
            </p>
          </FadeUp>
          <FadeUp delay={0.25} className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/login"
              className="px-10 py-4 bg-white text-[#0a0a0a] text-[11px] font-bold tracking-[0.25em] uppercase hover:bg-white/90 transition-colors duration-300 inline-flex items-center justify-center gap-2 group"
            >
              Sign In
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            <Link
              to="/register"
              className="px-10 py-4 border border-white/15 text-white text-[11px] font-bold tracking-[0.25em] uppercase hover:border-white/40 transition-colors duration-300"
            >
              Create Account
            </Link>
          </FadeUp>
          <FadeUp delay={0.35} className="mt-10">
            <button
              onClick={() => navigate('/')}
              className="text-white/25 text-[11px] tracking-[0.2em] uppercase hover:text-white/50 transition-colors duration-300 flex items-center gap-2 mx-auto"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to Landing
            </button>
          </FadeUp>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.06] py-8 px-8 md:px-16 xl:px-28">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <Link to="/" className="text-sm tracking-[0.25em] uppercase font-syncopate font-bold">
            TRAFFIC<span className="text-white/30">VISION</span>
          </Link>
          <p className="text-white/15 text-[10px] tracking-[0.15em]">
            &copy; {new Date().getFullYear()} Traffic Vision AI. MCA Project.
          </p>
        </div>
      </footer>
    </div>
  );
}
