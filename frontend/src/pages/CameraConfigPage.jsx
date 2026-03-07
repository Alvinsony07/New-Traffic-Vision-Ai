import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Network, Camera, UploadCloud, CheckCircle, XCircle, Zap } from 'lucide-react';
import { dashboard } from '../api/client';

export default function CameraConfigPage() {
    const navigate = useNavigate();

    // Manage state for 4 cameras. Each has a 'cam' (url/index) and a 'file'
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
            navigate('/dashboard'); // Go to live view when started
        } catch (err) {
            alert("Failed to initialize pipelines: " + err.message);
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 pb-20 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8 bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl shadow-xl">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-3">
                        <Network className="w-7 h-7 text-[#3b82f6]" />
                        Video Feed Matrix Setup
                    </h2>
                    <p className="text-gray-400 text-sm">Configure IP Cameras or upload Local Videos for AI Processing.</p>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#3b82f6] to-blue-700 hover:to-blue-600 text-white rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all font-bold tracking-wide flex items-center gap-2 disabled:opacity-50"
                >
                    {isSubmitting ? <span className="animate-spin w-5 h-5 border-2 border-white/20 border-t-white rounded-full" /> : <Zap className="w-5 h-5" />}
                    Initialize Pipelines
                </button>
            </div>

            <form id="camera-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[0, 1, 2, 3].map(i => {
                    const c = cameras[i];
                    const isActive = c.cam.trim() !== '' || c.file !== null;

                    return (
                        <div key={i} className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 group hover:border-[#3b82f6]/30 transition-colors">
                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                                    <Camera className="w-5 h-5 text-gray-500" />
                                    Intersection Node 0{i + 1}
                                </h3>
                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border ${isActive ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}`}>
                                    {isActive ? <><CheckCircle className="w-3 h-3" /> Ready</> : <><XCircle className="w-3 h-3" /> Offline</>}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-gray-400 font-medium">RTSP Stream URL / IP Camera (Preferred)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. rtsp://admin:1234@192.168.1.100:554/H.264"
                                    value={c.cam}
                                    onChange={e => updateCamera(i, { cam: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 text-white p-3 rounded-lg font-mono text-sm focus:border-[#3b82f6] outline-none transition-colors"
                                />
                            </div>

                            <div className="text-center text-[10px] font-bold text-gray-600 tracking-widest my-2">- OR LOCAL VIDEO FILE -</div>

                            <div className="space-y-2">
                                <label className="flex items-center justify-center gap-2 w-full p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-dashed border-white/20 hover:border-[#3b82f6] text-gray-400 hover:text-white rounded-lg cursor-pointer transition-colors text-sm font-medium">
                                    <UploadCloud className="w-5 h-5" /> Browse MP4 / AVI
                                    <input
                                        type="file"
                                        accept="video/*"
                                        className="hidden"
                                        onChange={e => handleFileChange(e, i)}
                                    />
                                </label>
                                {c.fileName && (
                                    <div className="text-center text-xs text-[#3b82f6] font-medium flex items-center justify-center gap-1.5 mt-2">
                                        <CheckCircle className="w-3 h-3" /> {c.fileName}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </form>
        </motion.div>
    );
}
