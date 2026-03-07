import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { dispatch as dispatchApi } from '../api/client';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, MapPin, Activity, Check, X, ShieldAlert, Siren, ArrowRight, Clock, Radio } from 'lucide-react';

const ambIcon = new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background: #0071EB; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 12px rgba(0,113,235,0.8);"></div>`,
    iconSize: [14, 14],
});

const destIcon = new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background: #E50914; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 12px rgba(229,9,20,0.8);"></div>`,
    iconSize: [14, 14],
});

export default function AmbulanceDriverPage() {
    const { user } = useAuth();
    const [dispatches, setDispatches] = useState([]);
    const [selectedDispatch, setSelectedDispatch] = useState(null);

    useEffect(() => {
        const fetchDispatches = async () => {
            try {
                const res = await dispatchApi.active();
                setDispatches(res.dispatches || []);
            } catch (err) { console.error("Failed to fetch dispatches"); }
        };
        fetchDispatches();
        const t = setInterval(fetchDispatches, 5000);
        return () => clearInterval(t);
    }, []);

    const updateStatus = async (id, status) => {
        try {
            await dispatchApi.updateStatus(id, status);
            const res = await dispatchApi.active();
            setDispatches(res.dispatches || []);
            if (selectedDispatch?.id === id) setSelectedDispatch(null);
        } catch (err) { alert('Failed to update status'); }
    };

    const statusFlow = {
        'Dispatched': { next: 'En Route Scene', color: '#E87C03' },
        'En Route Scene': { next: 'On Scene', color: '#0071EB' },
        'On Scene': { next: 'En Route Hospital', color: '#9B59B6' },
        'En Route Hospital': { next: 'Completed', color: '#46D369' },
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center bg-[#181818] border border-white/[0.06] rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#0071EB]/[0.03] to-transparent pointer-events-none" />
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0071EB] to-blue-900 flex items-center justify-center shadow-[0_0_20px_rgba(0,113,235,0.3)] text-white font-black text-lg">
                        {user?.username?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-[0.04em] text-white" style={{ fontFamily: 'var(--font-display)' }}>
                            {user?.username?.toUpperCase()}
                        </h1>
                        <p className="text-xs text-[#0071EB] uppercase tracking-[0.25em] font-bold flex items-center gap-1.5">
                            <Siren className="w-3 h-3" /> Emergency Response Unit
                        </p>
                    </div>
                </div>
                <div className="relative z-10 px-4 py-1.5 bg-[#E50914]/10 border border-[#E50914]/25 text-[#E50914] rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#E50914] animate-pulse" />
                    On Duty
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Dispatch List */}
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <Radio className="w-3.5 h-3.5 text-[#0071EB]" /> Active Dispatches ({dispatches.length})
                    </h2>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 tv-scrollbar">
                        {dispatches.length === 0 ? (
                            <div className="text-center p-10 bg-[#181818] border border-white/[0.06] rounded-2xl">
                                <ShieldAlert className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                                <p className="text-sm text-gray-600 font-medium">No active dispatches</p>
                                <p className="text-xs text-gray-700 mt-1">You will be notified when a new dispatch arrives</p>
                            </div>
                        ) : dispatches.map(d => {
                            const flowInfo = statusFlow[d.status] || { color: '#808080' };
                            const isSelected = selectedDispatch?.id === d.id;

                            return (
                                <motion.div
                                    key={d.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    onClick={() => setSelectedDispatch(d)}
                                    className={`p-4 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-white/[0.04] border-[#0071EB]/40 shadow-[0_0_15px_rgba(0,113,235,0.1)]' : 'bg-[#181818] border-white/[0.06] hover:border-white/[0.1]'}`}
                                >
                                    {/* Status Badge */}
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="px-2.5 py-0.5 rounded text-xs uppercase font-black tracking-widest border"
                                            style={{ backgroundColor: `${flowInfo.color}12`, color: flowInfo.color, borderColor: `${flowInfo.color}30` }}>
                                            {d.status}
                                        </span>
                                        <span className="text-xs text-gray-600 font-mono">{d.timestamp?.split(' ')[1]}</span>
                                    </div>

                                    <h3 className="font-bold text-white text-sm mb-0.5">{d.hospital_name}</h3>
                                    <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-3">
                                        <MapPin className="w-3 h-3 text-[#E50914]" /> {d.distance_km} km away
                                    </p>

                                    {/* Actions */}
                                    {d.status === 'Dispatched' ? (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); updateStatus(d.id, 'En Route Scene'); }}
                                                className="flex-1 py-2 bg-[#46D369]/10 hover:bg-[#46D369]/20 text-[#46D369] border border-[#46D369]/20 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex justify-center items-center gap-1"
                                            >
                                                <Check className="w-3 h-3" /> Accept
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); updateStatus(d.id, 'Declined'); }}
                                                className="flex-1 py-2 bg-[#E50914]/10 hover:bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/20 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex justify-center items-center gap-1"
                                            >
                                                <X className="w-3 h-3" /> Decline
                                            </button>
                                        </div>
                                    ) : d.status !== 'Completed' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateStatus(d.id, flowInfo.next);
                                            }}
                                            className="w-full py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex justify-center items-center gap-1.5"
                                            style={{ color: flowInfo.color }}
                                        >
                                            <ArrowRight className="w-3 h-3" /> Update: {flowInfo.next}
                                        </button>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Map Area */}
                <div className="lg:col-span-2 bg-[#181818] border border-white/[0.06] rounded-2xl overflow-hidden relative shadow-lg h-[600px] flex flex-col">
                    {selectedDispatch ? (
                        <>
                            {/* Route Info Overlay */}
                            <div className="absolute top-4 left-4 z-[1000] bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/[0.08] p-4 rounded-xl shadow-lg max-w-xs">
                                <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                                    <Navigation className="w-4 h-4 text-[#0071EB]" /> Route Details
                                </h3>
                                <div className="space-y-2 text-xs">
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <div className="w-2 h-2 rounded-full bg-[#0071EB] shrink-0" />
                                        <span className="font-medium">{selectedDispatch.hospital_name}</span>
                                    </div>
                                    <div className="ml-1 w-0.5 h-3 bg-gray-700" />
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <div className="w-2 h-2 rounded-full bg-[#E50914] shrink-0" />
                                        <span className="font-medium">Incident Scene</span>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-3">
                                    <div className="text-center">
                                        <div className="text-lg font-black text-white">{selectedDispatch.distance_km}</div>
                                        <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">km</div>
                                    </div>
                                    <div className="w-px h-8 bg-white/[0.06]" />
                                    <div className="text-center">
                                        <div className="text-lg font-black text-white" style={{ color: statusFlow[selectedDispatch.status]?.color }}>{selectedDispatch.status}</div>
                                        <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">Status</div>
                                    </div>
                                </div>
                            </div>

                            <MapContainer
                                bounds={[[selectedDispatch.hospital_lat, selectedDispatch.hospital_lng], [selectedDispatch.accident_lat, selectedDispatch.accident_lng]]}
                                style={{ height: '100%', width: '100%' }}
                                zoomControl={false}
                            >
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                <Marker position={[selectedDispatch.hospital_lat, selectedDispatch.hospital_lng]} icon={ambIcon}>
                                    <Popup><div className="text-sm font-bold p-1">Hospital Base</div></Popup>
                                </Marker>
                                <Marker position={[selectedDispatch.accident_lat, selectedDispatch.accident_lng]} icon={destIcon}>
                                    <Popup><div className="text-sm font-bold p-1">Incident Scene</div></Popup>
                                </Marker>
                                <Polyline
                                    positions={[[selectedDispatch.hospital_lat, selectedDispatch.hospital_lng], [selectedDispatch.accident_lat, selectedDispatch.accident_lng]]}
                                    pathOptions={{ color: '#0071EB', weight: 3, opacity: 0.6, dashArray: '10, 10' }}
                                />
                            </MapContainer>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600">
                            <Navigation className="w-16 h-16 mb-4 opacity-15" />
                            <p className="font-medium text-sm">Select a dispatch to view route</p>
                            <p className="text-xs text-gray-700 mt-1">Click on any active dispatch from the list</p>
                        </div>
                    )}
                </div>
            </div>


        </div>
    );
}
