import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Camera, AlertTriangle, History, Navigation, MapPin, CheckCircle, Clock, XCircle } from 'lucide-react';
import { dashboard, reports as reportsApi } from '../api/client';

// Fix for default Leaflet marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapPicker({ setPosition, setLocationText }) {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
            setLocationText(`${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`);
        },
    });
    return null;
}

export default function UserDashboard() {
    const { user } = useAuth();
    const [trafficData, setTrafficData] = useState(null);
    const [myReports, setMyReports] = useState([]);

    // Form state
    const [position, setPosition] = useState(null); // {lat, lng}
    const [locationText, setLocationText] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [flashMsg, setFlashMsg] = useState(null);

    useEffect(() => {
        // Poll traffic status
        const fetchStatus = async () => {
            try {
                const res = await dashboard.status();
                setTrafficData(res);
            } catch (err) {
                console.error("Failed to fetch traffic status");
            }
        };

        // Fetch my reports (simulate via general list for now if backend doesn't filter, or filter on frontend)
        const fetchReports = async () => {
            try {
                const res = await reportsApi.list();
                // Filter to my reports only, or let backend do it
                const mine = (res.reports || []).filter(r => r.user === user?.username);
                setMyReports(mine);
            } catch (err) { }
        };

        fetchStatus();
        fetchReports();
        const tTraffic = setInterval(fetchStatus, 3000);
        return () => clearInterval(tTraffic);
    }, [user?.username]);

    const handleLocateMe = () => {
        if (navigator.geolocation) {
            setLocationText("Getting coordinates...");
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setLocationText(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
                },
                (err) => alert("Could not get location: " + err.message)
            );
        }
    };

    const submitReport = async (e) => {
        e.preventDefault();
        if (!locationText) {
            setFlashMsg({ type: 'error', text: 'Location is required.' });
            return;
        }
        setIsSubmitting(true);
        try {
            await reportsApi.create({
                location: locationText,
                description: description,
                latitude: position?.lat || null,
                longitude: position?.lng || null
            });
            setFlashMsg({ type: 'success', text: 'Accident reported successfully. Authorities have been notified.' });
            setLocationText('');
            setDescription('');
            setPosition(null);

            // Refresh reports
            const res = await reportsApi.list();
            const mine = (res.reports || []).filter(r => r.user === user?.username);
            setMyReports(mine);
        } catch (err) {
            setFlashMsg({ type: 'error', text: err.message || 'Failed to submit report. Please try again.' });
        } finally {
            setIsSubmitting(false);
            setTimeout(() => setFlashMsg(null), 5000);
        }
    };

    const lanes = trafficData?.lane_data || {};
    const states = trafficData?.signal_status?.states || ["—", "—", "—", "—"];

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            {/* Top Nav (Mirrors user/dashboard.html user-nav) */}
            <div className="flex justify-between items-center bg-[#0a0a0a]/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 md:p-6 shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e50914] to-red-900 flex items-center justify-center shadow-lg shadow-red-500/20">
                        <Camera className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Traffic Vision AI</h1>
                        <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">Citizens Portal</p>
                    </div>
                </div>
                <div className="text-sm text-gray-400">
                    Welcome, <strong className="text-white">{user?.username}</strong>
                </div>
            </div>

            <AnimatePresence>
                {flashMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`p-4 rounded-xl flex items-center gap-3 ${flashMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-500' : 'bg-red-500/10 border border-red-500/30 text-red-500'}`}
                    >
                        {flashMsg.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        <span className="font-medium text-sm">{flashMsg.text}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Frame: Report Accident */}
                <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-colors">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-bl-full pointer-events-none" />
                    <h2 className="text-xl font-bold text-red-500 flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-6 h-6" /> Report Accident
                    </h2>
                    <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                        Instantly alert authorities about a traffic accident. Tap on the map to drop a pin.
                    </p>

                    <form onSubmit={submitReport} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Location</label>
                            <div className="h-48 w-full rounded-xl overflow-hidden border border-white/10 z-0 relative shadow-inner">
                                <MapContainer center={position || [12.9716, 77.5946]} zoom={13} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                    <MapPicker setPosition={setPosition} setLocationText={setLocationText} />
                                    {position && <Marker position={position} />}
                                </MapContainer>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={locationText}
                                    readOnly
                                    placeholder="Latitude, Longitude"
                                    className="flex-1 bg-[#141414] border border-white/10 text-white p-3 rounded-xl font-mono text-sm focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={handleLocateMe}
                                    className="px-4 bg-[#e50914] hover:bg-red-700 active:bg-red-800 text-white rounded-xl transition-colors shadow-lg"
                                    title="Use My Location"
                                >
                                    <Navigation className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Description / Details</label>
                            <textarea
                                rows="3"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Severity, vehicles involved, etc."
                                className="w-full bg-[#141414] border border-white/10 text-white p-3 rounded-xl text-sm focus:border-red-500 transition-colors resize-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 bg-gradient-to-r from-[#e50914] to-red-700 hover:to-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-red-500/25 active:scale-[0.98] disabled:opacity-50"
                        >
                            {isSubmitting ? <span className="animate-spin w-5 h-5 border-2 border-white/20 border-t-white rounded-full" /> : <MapPin className="w-5 h-5" />}
                            {isSubmitting ? 'Submitting...' : 'Submit Alert'}
                        </button>
                    </form>
                </div>

                {/* Frame: My Reports */}
                <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 shadow-2xl flex flex-col hover:border-white/10 transition-colors">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                        <History className="w-6 h-6 text-[#3b82f6]" /> My Reports
                    </h2>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar" style={{ maxHeight: '400px' }}>
                        {myReports.length === 0 ? (
                            <div className="text-center py-20 text-gray-500 flex flex-col items-center">
                                <History className="w-12 h-12 opacity-20 mb-4" />
                                <p className="text-sm">No reports submitted yet.</p>
                            </div>
                        ) : (
                            myReports.map((r, i) => (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    key={r.id}
                                    className={`p-4 rounded-xl border-l-4 bg-white/[0.02] border-y border-r border-y-white/5 border-r-white/5 transition-transform hover:-translate-x-1 ${r.status === 'Resolved' ? 'border-l-green-500' : r.status === 'Verified' ? 'border-l-yellow-500' : 'border-l-red-500'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-white">{r.location || 'Unknown Location'}</span>
                                        <span className="text-[10px] bg-black/40 px-2 py-1 rounded text-gray-400 font-mono tracking-wider">{r.timestamp}</span>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">{r.description || 'No description provided.'}</p>
                                    <div className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${r.status === 'Resolved' ? 'text-green-500' : r.status === 'Verified' ? 'text-yellow-500' : 'text-red-500'}`}>
                                        {r.status === 'Resolved' ? <CheckCircle className="w-3 h-3" /> : r.status === 'Verified' ? <Clock className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                        Status: {r.status}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Frame: Live Traffic Status */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-gray-700 to-transparent" />
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                    <Navigation className="w-5 h-5 text-gray-400" /> Live Traffic Status
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map(i => {
                        const count = lanes[i]?.vehicle_count ?? '-';
                        const signal = states[i] || '—';
                        return (
                            <div key={i} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-5 text-center group-hover:border-white/10 transition-colors">
                                <div className={`text-4xl font-black tabular-nums tracking-tighter mb-1 ${signal === 'GREEN' ? 'text-green-500' : signal === 'YELLOW' ? 'text-yellow-500' : 'text-[#e50914]'}`}>
                                    {count}
                                </div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-semibold mb-3">Lane {i + 1}</div>
                                <div className={`inline-block px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${signal === 'GREEN' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                    signal === 'YELLOW' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                        'bg-red-500/10 text-red-500 border-red-500/20'
                                    }`}>
                                    {signal}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
            {/* Inject CSS for custom scrollbar locally */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
            `}</style>
        </div>
    );
}
