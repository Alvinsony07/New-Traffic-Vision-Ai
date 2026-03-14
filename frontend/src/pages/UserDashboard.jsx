import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { reports as reportsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AlertTriangle, MapPin, Send, Clock, CheckCircle, XCircle, FileText, Navigation, Eye } from 'lucide-react';

export default function UserDashboard() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [myReports, setMyReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ location: '', description: '', latitude: null, longitude: null });
    const [gettingLocation, setGettingLocation] = useState(false);
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const res = await reportsApi.list();
                setMyReports(res.reports || []);
            } catch { }
            finally { setLoading(false); }
        };
        fetchReports();
        const interval = setInterval(fetchReports, 10000);
        return () => clearInterval(interval);
    }, []);

    // Init map for location picking
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;
        const L = window.L;
        if (!L) return;

        const map = L.map(mapRef.current).setView([10.0, 76.3], 12);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

        map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            setForm(prev => ({ ...prev, latitude: lat, longitude: lng }));

            if (markerRef.current) map.removeLayer(markerRef.current);
            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="width:16px;height:16px;background:#E50914;border-radius:50%;border:3px solid white;box-shadow:0 0 15px #E50914"></div>`,
                iconSize: [16, 16], iconAnchor: [8, 8]
            });
            markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
            markerRef.current.bindPopup(`<b>Incident Location</b><br>${lat.toFixed(5)}, ${lng.toFixed(5)}`).openPopup();
        });

        mapInstanceRef.current = map;
        return () => { map.remove(); mapInstanceRef.current = null; };
    }, []);

    const handleGetLocation = () => {
        setGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setForm(prev => ({ ...prev, latitude, longitude }));
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo([latitude, longitude], 15);
                    const L = window.L;
                    if (markerRef.current) mapInstanceRef.current.removeLayer(markerRef.current);
                    const icon = L.divIcon({
                        className: 'custom-div-icon',
                        html: `<div style="width:16px;height:16px;background:#E50914;border-radius:50%;border:3px solid white;box-shadow:0 0 15px #E50914"></div>`,
                        iconSize: [16, 16], iconAnchor: [8, 8]
                    });
                    markerRef.current = L.marker([latitude, longitude], { icon }).addTo(mapInstanceRef.current);
                }
                addToast('Location detected', 'success');
                setGettingLocation(false);
            },
            () => { addToast('Unable to get location', 'warning'); setGettingLocation(false); }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.location) { addToast('Location name is required', 'warning'); return; }
        setSubmitting(true);
        try {
            await reportsApi.create(form);
            addToast('Accident report submitted successfully!', 'success');
            setForm({ location: '', description: '', latitude: null, longitude: null });
            if (markerRef.current && mapInstanceRef.current) {
                mapInstanceRef.current.removeLayer(markerRef.current);
                markerRef.current = null;
            }
            const res = await reportsApi.list();
            setMyReports(res.reports || []);
        } catch (err) { addToast(err.message, 'error'); }
        finally { setSubmitting(false); }
    };

    const statusIcon = (status) => {
        switch (status) {
            case 'Resolved': return <CheckCircle className="w-4 h-4 text-[#46D369]" />;
            case 'Verified': return <Eye className="w-4 h-4 text-[#E87C03]" />;
            default: return <AlertTriangle className="w-4 h-4 text-[#E50914]" />;
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 pb-12">
            <div className="mb-6">
                <h2 className="text-3xl font-black tracking-[0.04em] text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                    CITIZENS PORTAL
                </h2>
                <p className="text-gray-500 text-sm">
                    Welcome, <span className="text-white font-semibold">{user?.full_name || user?.username}</span>. Report accidents and track their status.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Report Form */}
                <div>
                    <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-[#E50914]" /> Report an Accident
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Location Name *</label>
                                <input type="text" value={form.location} onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
                                    placeholder="e.g. MG Road Junction, Near Bus Stand"
                                    className="w-full bg-[#2a2a2a] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/20 transition-all placeholder-gray-600"
                                    required />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Description</label>
                                <textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Describe what happened..."
                                    rows={3}
                                    className="w-full bg-[#2a2a2a] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/20 transition-all placeholder-gray-600 resize-none" />
                            </div>

                            {/* GPS Coordinates */}
                            <div>
                                <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">GPS Coordinates</label>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-[#2a2a2a] border border-white/[0.08] rounded-xl px-4 py-3 text-sm">
                                        {form.latitude && form.longitude ? (
                                            <span className="text-[#46D369] font-mono">{form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}</span>
                                        ) : (
                                            <span className="text-gray-600">Click map or use GPS button</span>
                                        )}
                                    </div>
                                    <button type="button" onClick={handleGetLocation} disabled={gettingLocation}
                                        className="px-4 py-3 bg-[#0071EB]/10 text-[#0071EB] border border-[#0071EB]/20 rounded-xl hover:bg-[#0071EB]/20 transition-all">
                                        {gettingLocation ? <div className="w-4 h-4 border-2 border-[#0071EB]/30 border-t-[#0071EB] rounded-full animate-spin" /> : <Navigation className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" disabled={submitting}
                                className="w-full py-3.5 bg-[#E50914] hover:bg-[#B20710] text-white font-bold rounded-xl text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(229,9,20,0.3)] flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                                {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send className="w-4 h-4" /> Submit Report</>}
                            </button>
                        </form>
                    </div>

                    {/* Map for location picking */}
                    <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-4 mt-4 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#E50914]" /> Click to select accident location
                        </h3>
                        <div ref={mapRef} className="w-full rounded-xl overflow-hidden border border-white/[0.08]" style={{ height: '300px' }} />
                    </div>
                </div>

                {/* My Reports */}
                <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#0071EB]" /> My Reports
                        <span className="text-xs bg-white/[0.06] px-2 py-0.5 rounded text-gray-400 font-normal ml-auto">{myReports.length} total</span>
                    </h3>

                    <div className="space-y-3 overflow-y-auto tv-scrollbar" style={{ maxHeight: '700px' }}>
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="p-4 bg-white/[0.03] rounded-xl animate-shimmer h-20" />
                            ))
                        ) : myReports.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <AlertTriangle className="w-8 h-8 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">No reports yet. Use the form to report an accident.</p>
                            </div>
                        ) : myReports.map((r, i) => (
                            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                className="p-4 bg-white/[0.03] rounded-xl border-l-2 hover:bg-white/[0.05] transition-colors"
                                style={{ borderLeftColor: r.status === 'Resolved' ? '#46D369' : r.status === 'Verified' ? '#E87C03' : '#E50914' }}>
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <span className="text-sm font-bold text-white">{r.location}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Clock className="w-3 h-3 text-gray-600" />
                                            <span className="text-xs text-gray-500 font-mono">{r.timestamp}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {statusIcon(r.status)}
                                        <span className="text-xs font-bold" style={{ color: r.status === 'Resolved' ? '#46D369' : r.status === 'Verified' ? '#E87C03' : '#E50914' }}>
                                            {r.status}
                                        </span>
                                    </div>
                                </div>
                                {r.description && <p className="text-xs text-gray-400 mt-1">{r.description}</p>}
                                {r.latitude && r.longitude && (
                                    <div className="text-[10px] text-gray-600 font-mono mt-2 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
