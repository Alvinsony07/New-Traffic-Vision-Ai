import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Network, Camera, UploadCloud, CheckCircle, XCircle, Zap, Loader2, Wifi, WifiOff } from 'lucide-react';
import { dashboard } from '../api/client';

export default function CameraConfigPage() {
    const navigate = useNavigate();

    const [cameras, setCameras] = useState([
        { cam: '', file: null, fileName: '' },
        { cam: '', file: null, fileName: '' },
        { cam: '', file: null, fileName: '' },
        { cam: '', file: null, fileName: '' },
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateCamera = (idx, updates) => {
        setCameras(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], ...updates };
            return next;
        });
    };

    const handleFileChange = (e, idx) => {
        if (e.target.files && e.target.files.length > 0) {
            updateCamera(idx, { file: e.target.files[0], fileName: e.target.files[0].name });
        } else {
            updateCamera(idx, { file: null, fileName: '' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            cameras.forEach((c, i) => {
                if (c.cam) formData.append(`cam_${i + 1}`, c.cam);
                if (c.file) formData.append(`video_${i + 1}`, c.file);
            });
            await dashboard.setupStreams(formData);
            navigate('/dashboard');
        } catch (err) {
            alert("Failed to initialize pipelines: " + err.message);
            setIsSubmitting(false);
        }
    };

    const activeCount = cameras.filter(c => c.cam.trim() || c.file).length;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 lg:p-8 pb-20 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8 bg-[#181818] border border-white/[0.06] p-6 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#0071EB]/[0.03] rounded-bl-[100px] pointer-events-none" />
                <div className="relative z-10">
                    <h2 className="text-3xl font-black tracking-[0.04em] text-white mb-1 flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
                        <Network className="w-7 h-7 text-[#0071EB]" />
                        VIDEO FEED MATRIX
                    </h2>
                    <p className="text-gray-500 text-sm font-medium">Configure IP cameras or upload local videos for YOLOv8 AI processing.</p>
                </div>

                <div className="relative z-10 flex items-center gap-4">
                    <div className="px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl text-center">
                        <div className="text-lg font-black text-white tabular-nums">{activeCount}/4</div>
                        <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">Ready</div>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || activeCount === 0}
                        className="px-6 py-3 bg-gradient-to-r from-[#0071EB] to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white rounded-xl shadow-[0_0_20px_rgba(0,113,235,0.3)] hover:shadow-[0_0_30px_rgba(0,113,235,0.5)] transition-all font-bold tracking-wide flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                    >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                        {isSubmitting ? 'Initializing...' : 'Initialize Pipelines'}
                    </button>
                </div>
            </div>

            {/* Camera Grid */}
            <form id="camera-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[0, 1, 2, 3].map(i => {
                    const c = cameras[i];
                    const isActive = c.cam.trim() !== '' || c.file !== null;

                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`bg-[#181818] border rounded-2xl p-5 shadow-lg flex flex-col gap-4 group transition-all ${isActive ? 'border-[#0071EB]/30 shadow-[0_0_20px_rgba(0,113,235,0.05)]' : 'border-white/[0.06] hover:border-white/[0.1]'}`}
                        >
                            {/* Card Header */}
                            <div className="flex justify-between items-center border-b border-white/[0.04] pb-3">
                                <h3 className="text-lg font-black flex items-center gap-2 text-white" style={{ fontFamily: 'var(--font-display)' }}>
                                    <Camera className="w-5 h-5 text-gray-500 group-hover:text-[#0071EB] transition-colors" />
                                    NODE 0{i + 1}
                                </h3>
                                <div className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1.5 border ${isActive
                                    ? 'bg-[#46D369]/10 text-[#46D369] border-[#46D369]/25'
                                    : 'bg-[#E50914]/10 text-[#E50914] border-[#E50914]/25'}`}
                                >
                                    {isActive ? <><Wifi className="w-3 h-3" /> Ready</> : <><WifiOff className="w-3 h-3" /> Offline</>}
                                </div>
                            </div>

                            {/* RTSP Input */}
                            <div className="space-y-1.5">
                                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">RTSP Stream URL</label>
                                <input
                                    type="text"
                                    placeholder="rtsp://admin:1234@192.168.1.100:554/stream"
                                    value={c.cam}
                                    onChange={e => updateCamera(i, { cam: e.target.value })}
                                    className="w-full bg-[#0a0a0a] border border-white/[0.08] text-white p-3 rounded-xl font-mono text-xs focus:border-[#0071EB]/50 focus:shadow-[0_0_0_3px_rgba(0,113,235,0.1)] outline-none transition-all placeholder-gray-700"
                                />
                            </div>

                            <div className="text-center text-xs font-bold text-gray-700 tracking-[0.2em] uppercase">— or local video —</div>

                            {/* File Upload */}
                            <div className="space-y-2">
                                <label className="flex items-center justify-center gap-2 w-full p-3 bg-white/[0.02] hover:bg-white/[0.04] border border-dashed border-white/[0.1] hover:border-[#0071EB]/40 text-gray-500 hover:text-white rounded-xl cursor-pointer transition-all text-sm font-medium">
                                    <UploadCloud className="w-5 h-5" /> Browse MP4 / AVI
                                    <input type="file" accept="video/*" className="hidden" onChange={e => handleFileChange(e, i)} />
                                </label>
                                {c.fileName && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-center text-xs text-[#0071EB] font-medium flex items-center justify-center gap-1.5"
                                    >
                                        <CheckCircle className="w-3.5 h-3.5" /> {c.fileName}
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </form>
        </motion.div>
    );
}
