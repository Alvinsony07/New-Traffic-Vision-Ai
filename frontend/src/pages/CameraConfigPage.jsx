import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { dashboard } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Video, Upload, Link as LinkIcon, Play, X, Camera } from 'lucide-react';

export default function CameraConfigPage() {
    const [sources, setSources] = useState([
        { url: '', file: null }, { url: '', file: null }, { url: '', file: null }, { url: '', file: null }
    ]);
    const [loading, setLoading] = useState(false);
    const fileRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
    const { addToast } = useToast();
    const navigate = useNavigate();

    const updateSource = (index, field, value) => {
        setSources(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const formData = new FormData();
            sources.forEach((src, i) => {
                if (src.file) formData.append(`video_${i + 1}`, src.file);
                else if (src.url) formData.append(`cam_${i + 1}`, src.url);
            });
            await dashboard.setupStreams(formData);
            addToast('Video sources configured successfully! Processing started.', 'success');
            // Redirect back to dashboard to view the streams
            setTimeout(() => navigate('/dashboard'), 600);
        } catch (err) {
            addToast('Failed to configure sources: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 pb-12">
            <div className="mb-6">
                <h2 className="text-3xl font-black tracking-[0.04em] text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                    CAMERA CONFIGURATION
                </h2>
                <p className="text-gray-500 text-sm">Configure video sources for each of the 4 monitored lanes.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                {sources.map((src, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                        className="bg-[#181818] border border-white/[0.06] rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-[#0071EB]/10 rounded-xl flex items-center justify-center border border-[#0071EB]/20">
                                <Camera className="w-5 h-5 text-[#0071EB]" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold">Lane {i + 1} Source</h3>
                                <p className="text-xs text-gray-500">Enter URL/index or upload video file</p>
                            </div>
                        </div>

                        {/* URL Input */}
                        <div className="mb-3">
                            <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">
                                <LinkIcon className="w-3 h-3 inline mr-1" /> Camera URL / Index
                            </label>
                            <input
                                type="text"
                                value={src.url}
                                onChange={e => updateSource(i, 'url', e.target.value)}
                                placeholder="rtsp://... or 0 (webcam index)"
                                className="w-full bg-[#2a2a2a] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#0071EB] focus:ring-2 focus:ring-[#0071EB]/20 transition-all placeholder-gray-600"
                                disabled={!!src.file}
                            />
                        </div>

                        <div className="text-center text-xs text-gray-600 font-bold tracking-wider my-3">— OR UPLOAD FILE —</div>

                        {/* File Upload */}
                        <div>
                            {src.file ? (
                                <div className="flex items-center gap-3 bg-[#46D369]/5 border border-[#46D369]/20 rounded-xl px-4 py-3">
                                    <Video className="w-4 h-4 text-[#46D369]" />
                                    <span className="text-sm text-[#46D369] font-medium flex-1 truncate">{src.file.name}</span>
                                    <button onClick={() => updateSource(i, 'file', null)}
                                        className="text-gray-500 hover:text-white transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => fileRefs[i].current?.click()}
                                    disabled={!!src.url}
                                    className="w-full border-2 border-dashed border-white/[0.08] rounded-xl py-6 flex flex-col items-center gap-2 text-gray-500 hover:text-white hover:border-white/[0.15] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <Upload className="w-6 h-6" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Upload Video File</span>
                                    <span className="text-[10px] text-gray-600">MP4, AVI, MOV, MKV, WebM</span>
                                </button>
                            )}
                            <input ref={fileRefs[i]} type="file" accept="video/*" className="hidden"
                                onChange={e => { if (e.target.files[0]) updateSource(i, 'file', e.target.files[0]); }} />
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="flex justify-center">
                <button onClick={handleSubmit} disabled={loading}
                    className="px-8 py-3.5 bg-[#E50914] hover:bg-[#B20710] active:scale-[0.98] text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(229,9,20,0.3)] hover:shadow-[0_0_30px_rgba(229,9,20,0.5)] disabled:opacity-50 flex items-center gap-2 text-sm uppercase tracking-widest">
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <><Play className="w-5 h-5" /> Start Processing</>
                    )}
                </button>
            </div>
        </motion.div>
    );
}
