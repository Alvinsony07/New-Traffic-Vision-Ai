import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { dispatch as dispatchApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
    Siren, Navigation, Clock, MapPin, Hospital, CheckCircle, XCircle,
    Truck, ArrowRight, Phone, AlertTriangle, RefreshCw
} from 'lucide-react';

export default function AmbulanceDriverPage() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [dispatches, setDispatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(new Set());
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);

    const fetchDispatches = async () => {
        try {
            const res = await dispatchApi.active();
            setDispatches(res.dispatches || []);
        } catch { }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchDispatches();
        const interval = setInterval(fetchDispatches, 3000);
        return () => clearInterval(interval);
    }, []);

    // Init map
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;
        const L = window.L;
        if (!L) return;
        const map = L.map(mapRef.current).setView([10.0, 76.3], 12);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
        mapInstanceRef.current = map;
        return () => { map.remove(); mapInstanceRef.current = null; };
    }, []);

    // Update map markers
    useEffect(() => {
        const map = mapInstanceRef.current;
        const L = window.L;
        if (!map || !L) return;

        markersRef.current.forEach(m => map.removeLayer(m));
        markersRef.current = [];

        dispatches.forEach(d => {
            // Accident location
            if (d.accident_lat && d.accident_lng) {
                const icon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style="width:16px;height:16px;background:#E50914;border-radius:50%;border:3px solid white;box-shadow:0 0 15px #E50914"></div>`,
                    iconSize: [16, 16], iconAnchor: [8, 8]
                });
                const marker = L.marker([d.accident_lat, d.accident_lng], { icon }).addTo(map);
                marker.bindPopup(`<b>Accident Location</b><br>Dispatch #${d.id}`);
                markersRef.current.push(marker);
            }

            // Hospital location
            if (d.hospital_lat && d.hospital_lng) {
                const icon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style="width:16px;height:16px;background:#0071EB;border-radius:4px;border:3px solid white;box-shadow:0 0 15px #0071EB;display:flex;align-items:center;justify-content:center;font-size:9px;color:white;font-weight:bold">H</div>`,
                    iconSize: [16, 16], iconAnchor: [8, 8]
                });
                const marker = L.marker([d.hospital_lat, d.hospital_lng], { icon }).addTo(map);
                marker.bindPopup(`<b>${d.hospital_name}</b>`);
                markersRef.current.push(marker);
            }

            // Draw route line
            if (d.accident_lat && d.accident_lng && d.hospital_lat && d.hospital_lng) {
                const polyline = L.polyline(
                    [[d.accident_lat, d.accident_lng], [d.hospital_lat, d.hospital_lng]],
                    { color: '#0071EB', weight: 2, dashArray: '10, 8', opacity: 0.6 }
                ).addTo(map);
                markersRef.current.push(polyline);
            }
        });
    }, [dispatches]);

    const handleAccept = async (id) => {
        setProcessing(prev => new Set(prev).add(id));
        try {
            await dispatchApi.accept(id);
            addToast('Dispatch accepted! Navigate to the accident location.', 'success');
            fetchDispatches();
        } catch (err) { addToast(err.message, 'error'); }
        finally { setProcessing(prev => { const s = new Set(prev); s.delete(id); return s; }); }
    };

    const handleDecline = async (id) => {
        setProcessing(prev => new Set(prev).add(id));
        try {
            await dispatchApi.decline(id);
            addToast('Dispatch declined.', 'warning');
            fetchDispatches();
        } catch (err) { addToast(err.message, 'error'); }
        finally { setProcessing(prev => { const s = new Set(prev); s.delete(id); return s; }); }
    };

    const handleUpdateStatus = async (id, status) => {
        setProcessing(prev => new Set(prev).add(id));
        try {
            await dispatchApi.updateStatus(id, status);
            addToast(`Status updated: ${status}`, 'success');
            fetchDispatches();
        } catch (err) { addToast(err.message, 'error'); }
        finally { setProcessing(prev => { const s = new Set(prev); s.delete(id); return s; }); }
    };

    const statusFlow = ['Dispatched', 'En Route', 'Arrived', 'Patient Loaded', 'Complete'];
    const statusColor = (s) => ({ Dispatched: '#f59e0b', 'En Route': '#0071EB', Arrived: '#10b981', 'Patient Loaded': '#9B59B6', Complete: '#46D369' }[s] || '#808080');

    const focusOnMap = (lat, lng) => {
        if (mapInstanceRef.current && lat && lng) {
            mapInstanceRef.current.flyTo([lat, lng], 15, { animate: true, duration: 1 });
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 pb-12">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-black tracking-[0.04em] text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                        AMBULANCE PORTAL
                    </h2>
                    <p className="text-gray-500 text-sm">
                        Welcome, <span className="text-white font-semibold">{user?.full_name || user?.username}</span>. Manage active dispatches.
                    </p>
                </div>
                <button onClick={fetchDispatches} className="p-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl transition-all">
                    <RefreshCw className="w-5 h-5 text-gray-400" />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Dispatch List */}
                <div className="space-y-4">
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="p-6 bg-[#181818] border border-white/[0.06] rounded-2xl animate-shimmer h-40" />
                        ))
                    ) : dispatches.length === 0 ? (
                        <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-12 text-center">
                            <Siren className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                            <p className="text-gray-500 text-sm font-medium">No active dispatches at the moment.</p>
                            <p className="text-gray-600 text-xs mt-1">Dispatches will appear here when assigned to you.</p>
                        </div>
                    ) : dispatches.map((d, idx) => (
                        <motion.div key={d.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                            className="bg-[#181818] border border-white/[0.06] rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:border-white/[0.1] transition-all">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: statusColor(d.status) + '20' }}>
                                        <Siren className="w-5 h-5" style={{ color: statusColor(d.status) }} />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold">Dispatch #{d.id}</h3>
                                        <div className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {d.timestamp}</div>
                                    </div>
                                </div>
                                <span className="text-xs font-black tracking-widest px-3 py-1 rounded-full uppercase"
                                    style={{ color: statusColor(d.status), background: statusColor(d.status) + '20' }}>
                                    {d.status}
                                </span>
                            </div>

                            {/* Details */}
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 p-2.5 bg-white/[0.02] rounded-lg cursor-pointer hover:bg-white/[0.04] transition-colors"
                                    onClick={() => focusOnMap(d.hospital_lat, d.hospital_lng)}>
                                    <Hospital className="w-4 h-4 text-[#0071EB]" />
                                    <span className="text-sm text-white font-medium">{d.hospital_name || 'Nearest Hospital'}</span>
                                    {d.distance_km && <span className="text-xs text-gray-500 ml-auto">{d.distance_km} km</span>}
                                </div>
                                {d.accident_lat && d.accident_lng && (
                                    <div className="flex items-center gap-2 p-2.5 bg-white/[0.02] rounded-lg cursor-pointer hover:bg-white/[0.04] transition-colors"
                                        onClick={() => focusOnMap(d.accident_lat, d.accident_lng)}>
                                        <MapPin className="w-4 h-4 text-[#E50914]" />
                                        <span className="text-xs text-gray-400 font-mono">{d.accident_lat.toFixed(4)}, {d.accident_lng.toFixed(4)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Status Progress */}
                            <div className="flex items-center gap-1 mb-4">
                                {statusFlow.map((s, i) => {
                                    const currentIdx = statusFlow.indexOf(d.status);
                                    const isCompleted = i <= currentIdx;
                                    return (
                                        <React.Fragment key={s}>
                                            <div className={`w-2 h-2 rounded-full transition-all ${isCompleted ? '' : 'bg-gray-700'}`}
                                                style={isCompleted ? { background: statusColor(s), boxShadow: `0 0 8px ${statusColor(s)}` } : {}} />
                                            {i < statusFlow.length - 1 && (
                                                <div className={`flex-1 h-0.5 ${i < currentIdx ? '' : 'bg-gray-800'}`}
                                                    style={i < currentIdx ? { background: statusColor(s) } : {}} />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                {d.status === 'Dispatched' && (
                                    <>
                                        <button onClick={() => handleAccept(d.id)} disabled={processing.has(d.id)}
                                            className="flex-1 py-2.5 bg-[#46D369] hover:bg-[#3bb85a] text-white font-bold rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                                            <CheckCircle className="w-4 h-4" /> Accept
                                        </button>
                                        <button onClick={() => handleDecline(d.id)} disabled={processing.has(d.id)}
                                            className="flex-1 py-2.5 bg-[#E50914]/10 text-[#E50914] border border-[#E50914]/20 hover:bg-[#E50914]/20 font-bold rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                                            <XCircle className="w-4 h-4" /> Decline
                                        </button>
                                    </>
                                )}
                                {['En Route', 'Arrived', 'Patient Loaded'].includes(d.status) && (
                                    <button onClick={() => {
                                        const nextIdx = statusFlow.indexOf(d.status) + 1;
                                        if (nextIdx < statusFlow.length) handleUpdateStatus(d.id, statusFlow[nextIdx]);
                                    }} disabled={processing.has(d.id)}
                                        className="flex-1 py-2.5 bg-[#0071EB] hover:bg-[#005bbd] text-white font-bold rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                                        <ArrowRight className="w-4 h-4" />
                                        {d.status === 'En Route' ? 'Mark Arrived' : d.status === 'Arrived' ? 'Patient Loaded' : 'Complete'}
                                    </button>
                                )}
                                {d.status === 'Complete' && (
                                    <div className="flex-1 py-2.5 bg-[#46D369]/10 text-[#46D369] font-bold rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                                        <CheckCircle className="w-4 h-4" /> Mission Complete
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Map */}
                <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-[#0071EB]" /> Dispatch Map
                        <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#E50914]" /> Accident</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-[#0071EB]" /> Hospital</span>
                        </div>
                    </h3>
                    <div ref={mapRef} className="w-full rounded-xl overflow-hidden border border-white/[0.08]" style={{ height: '600px' }} />
                </div>
            </div>
        </motion.div>
    );
}
