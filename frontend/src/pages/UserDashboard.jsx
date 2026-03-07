import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { reports } from '../api/client';
import { AlertTriangle, MapPin, Clock, Send, Loader2, CheckCircle, ChevronDown, User, Shield, Plus, FileText } from 'lucide-react';

const pinIcon = new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="
        background: #E50914;
        width: 18px; height: 18px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 15px rgba(229,9,20,0.8);
    "></div>`,
    iconSize: [18, 18], iconAnchor: [9, 9]
});

function LocationPicker({ position, onPositionChange }) {
    useMapEvents({
        click(e) { onPositionChange([e.latlng.lat, e.latlng.lng]); },
    });
    return position ? <Marker position={position} icon={pinIcon} /> : null;
}

export default function UserDashboard() {
    const { user } = useAuth();
    const [reportList, setReportList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    const [form, setForm] = useState({
        location: '',
        description: '',
        latitude: null,
        longitude: null,
    });
    const [mapPosition, setMapPosition] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const res = await reports.list();
                setReportList(res.reports || []);
            } catch (err) { console.error("Failed to load reports"); }
            finally { setLoading(false); }
        };
        fetchReports();
    }, []);

    const handlePositionChange = (pos) => {
        setMapPosition(pos);
        setForm(prev => ({ ...prev, latitude: pos[0], longitude: pos[1] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.location || !form.description) {
            addToast('Please fill all required fields', 'error');
            return;
        }
        setSubmitting(true);
        try {
            await reports.create(form);
            addToast('Report submitted successfully!', 'success');
            setForm({ location: '', description: '', latitude: null, longitude: null });
            setMapPosition(null);
            const res = await reports.list();
            setReportList(res.reports || []);
            setTimeout(() => { setShowForm(false); }, 1000);
        } catch (err) {
            addToast(err.message || 'Submission failed', 'error');
        } finally { setSubmitting(false); }
    };

    const myReports = reportList.filter(r => r.user === user?.username);

    const statusConfig = {
        Reported: { color: '#E50914', label: 'Pending Review' },
        Verified: { color: '#E87C03', label: 'Under Investigation' },
        Resolved: { color: '#46D369', label: 'Resolved' },
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-6 shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#E50914]/[0.03] to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E50914] to-red-900 flex items-center justify-center shadow-[0_0_20px_rgba(229,9,20,0.3)] text-white font-black text-lg">
                            {user?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-[0.04em] text-white" style={{ fontFamily: 'var(--font-display)' }}>
                                CITIZENS PORTAL
                            </h1>
                            <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-bold flex items-center gap-1.5">
                                <Shield className="w-3 h-3 text-[#E50914]" /> Welcome, {user?.username}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowForm(!showForm)}
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm tracking-wide flex items-center gap-2 transition-all ${showForm
                            ? 'bg-white/[0.04] border border-white/[0.08] text-gray-300 hover:bg-white/[0.08]'
                            : 'bg-[#E50914] hover:bg-[#B20710] text-white shadow-[0_0_20px_rgba(229,9,20,0.3)]'}`}
                    >
                        {showForm ? <ChevronDown className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {showForm ? 'Close Form' : 'Report Accident'}
                    </button>
                </div>
            </div>

            {/* Report Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-[#181818] border border-white/[0.06] rounded-2xl shadow-lg overflow-hidden">
                            <div className="h-[2px] bg-gradient-to-r from-transparent via-[#E50914] to-transparent" />
                            <div className="p-6">
                                <h2 className="text-lg font-black text-white mb-1 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                                    <AlertTriangle className="w-5 h-5 text-[#E50914]" /> REPORT AN ACCIDENT
                                </h2>
                                <p className="text-xs text-gray-500 mb-5">Provide details and pin the location on the map. Emergency services will be notified.</p>



                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Location Name *</label>
                                                <input
                                                    type="text"
                                                    value={form.location}
                                                    onChange={e => setForm({ ...form, location: e.target.value })}
                                                    className="w-full bg-[#0a0a0a] border border-white/[0.08] text-white p-3 rounded-xl focus:border-[#E50914]/50 outline-none text-sm transition-all"
                                                    placeholder="e.g., MG Road Junction, Bangalore"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Description *</label>
                                                <textarea
                                                    rows="4"
                                                    value={form.description}
                                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                                    className="w-full bg-[#0a0a0a] border border-white/[0.08] text-white p-3 rounded-xl focus:border-[#E50914]/50 outline-none text-sm transition-all resize-none tv-scrollbar"
                                                    placeholder="Describe the severity, vehicles involved, injuries if visible..."
                                                    required
                                                />
                                            </div>

                                            {mapPosition && (
                                                <div className="flex gap-3">
                                                    <div className="flex-1 bg-[#0a0a0a] border border-white/[0.04] rounded-lg p-2 text-center">
                                                        <div className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Latitude</div>
                                                        <div className="text-xs font-mono text-white">{mapPosition[0].toFixed(6)}</div>
                                                    </div>
                                                    <div className="flex-1 bg-[#0a0a0a] border border-white/[0.04] rounded-lg p-2 text-center">
                                                        <div className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Longitude</div>
                                                        <div className="text-xs font-mono text-white">{mapPosition[1].toFixed(6)}</div>
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={submitting}
                                                className="w-full py-3 bg-[#E50914] hover:bg-[#B20710] text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(229,9,20,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 text-sm tracking-wide"
                                            >
                                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                {submitting ? 'Sending...' : 'Submit Report'}
                                            </button>
                                        </div>

                                        {/* Map */}
                                        <div className="h-[300px] md:h-auto rounded-xl overflow-hidden border border-white/[0.06]">
                                            <MapContainer center={[12.9716, 77.5946]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                                                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                                <LocationPicker position={mapPosition} onPositionChange={handlePositionChange} />
                                            </MapContainer>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reports History */}
            <div className="bg-[#181818] border border-white/[0.06] rounded-2xl shadow-lg overflow-hidden">
                <div className="p-5 border-b border-white/[0.04] flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#E87C03]" /> Your Reports
                    </h2>
                    <span className="text-[10px] text-gray-600 font-bold">{myReports.length} total</span>
                </div>

                {loading ? (
                    <div className="p-10 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-2 border-[#E50914]/20 border-t-[#E50914] animate-spin" />
                    </div>
                ) : myReports.length === 0 ? (
                    <div className="text-center py-14 text-gray-600">
                        <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium">No reports yet</p>
                        <p className="text-[10px] text-gray-700 mt-1">Your submitted accident reports will appear here</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/[0.03]">
                        {myReports.map((r) => {
                            const sc = statusConfig[r.status] || statusConfig.Reported;
                            return (
                                <motion.div
                                    key={r.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="p-4 hover:bg-white/[0.02] transition-colors group"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${sc.color}15` }}>
                                                <AlertTriangle className="w-4 h-4" style={{ color: sc.color }} />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-white text-sm flex items-center gap-2">
                                                    <MapPin className="w-3 h-3 text-[#E50914]" />{r.location || 'Unknown Location'}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5 line-clamp-1 group-hover:line-clamp-none">{r.description}</div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1.5">
                                            <span className="px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border"
                                                style={{ backgroundColor: `${sc.color}12`, color: sc.color, borderColor: `${sc.color}30` }}>
                                                {sc.label}
                                            </span>
                                            <div className="flex items-center gap-1 text-[10px] text-gray-600 font-mono">
                                                <Clock className="w-3 h-3" /> {r.timestamp}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>


        </div>
    );
}
