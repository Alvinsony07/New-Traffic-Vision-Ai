import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { dispatch as dispatchApi } from '../api/client';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, MapPin, Activity, CheckCircle, Clock, Check, X, ShieldAlert } from 'lucide-react';

const ambIcon = new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(59,130,246,0.8);"></div>`,
    iconSize: [14, 14],
});

const destIcon = new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #e50914; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(229,9,20,0.8);"></div>`,
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
            } catch (err) {
                console.error("Failed to fetch dispatches");
            }
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
            if (selectedDispatch && selectedDispatch.id === id) {
                setSelectedDispatch(null);
            }
        } catch (err) {
            alert('Failed to update status');
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3b82f6] to-blue-900 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)] text-white font-bold text-lg">
                        {user?.username?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white">{user?.username}</h1>
                        <p className="text-xs text-[#3b82f6] uppercase tracking-widest font-bold mt-0.5">Emergency Response Unit</p>
                    </div>
                </div>
                <div className="px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 text-[#3b82f6] rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse" /> Live
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pending & Active List */}
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Active Dispatches ({dispatches.length})
                    </h2>

                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {dispatches.length === 0 ? (
                            <div className="text-center p-10 bg-[#0a0a0a] border border-white/5 rounded-2xl">
                                <ShieldAlert className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                                <p className="text-sm text-gray-500">No active dispatches waiting.</p>
                            </div>
                        ) : dispatches.map(d => (
                            <motion.div
                                key={d.id}
                                onClick={() => setSelectedDispatch(d)}
                                className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedDispatch?.id === d.id ? 'bg-white/5 border-[#3b82f6]' : 'bg-[#0a0a0a] border-white/10 hover:border-white/20'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest border ${d.status === 'Dispatched' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-blue-500/10 text-[#3b82f6] border-blue-500/20'}`}>
                                        {d.status}
                                    </div>
                                    <span className="text-xs text-gray-500">{d.timestamp.split(' ')[1]}</span>
                                </div>
                                <h3 className="font-bold text-white text-sm mb-1">{d.hospital_name}</h3>
                                <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-4">
                                    <MapPin className="w-3 h-3 text-[#e50914]" /> Incident location
                                </p>

                                {d.status === 'Dispatched' ? (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); updateStatus(d.id, 'En Route Scene'); }}
                                            className="flex-1 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 rounded-lg text-xs font-bold transition-colors flex justify-center items-center gap-1"
                                        >
                                            <Check className="w-3 h-3" /> Accept
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); updateStatus(d.id, 'Declined'); }}
                                            className="flex-1 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold transition-colors flex justify-center items-center gap-1"
                                        >
                                            <X className="w-3 h-3" /> Decline
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const nextStatus = d.status === 'En Route Scene' ? 'On Scene' : d.status === 'On Scene' ? 'En Route Hospital' : 'Completed';
                                            updateStatus(d.id, nextStatus);
                                        }}
                                        className="w-full py-1.5 bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/20 rounded-lg text-xs font-bold transition-colors flex justify-center items-center gap-1 uppercase tracking-wider"
                                    >
                                        Update: {d.status === 'En Route Scene' ? 'On Scene' : d.status === 'On Scene' ? 'En Route Hospital' : 'Completed'}
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Map Area */}
                <div className="lg:col-span-2 bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden relative shadow-2xl h-[600px] flex flex-col">
                    {selectedDispatch ? (
                        <>
                            <div className="absolute top-4 left-4 z-10 bg-[#0a0a0a]/90 backdrop-blur border border-white/10 p-4 rounded-xl shadow-lg max-w-sm">
                                <h3 className="text-white font-bold mb-1">Dispatch Instruction</h3>
                                <p className="text-xs text-gray-400 mb-2">Distance: <span className="text-white">{selectedDispatch.distance_km} km</span></p>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full bg-[#3b82f6]" /> {selectedDispatch.hospital_name}</div>
                                    <div className="w-0.5 h-3 bg-gray-600 ml-1" />
                                    <div className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full bg-[#e50914]" /> Incident Scene</div>
                                </div>
                            </div>
                            <MapContainer
                                bounds={[[selectedDispatch.hospital_lat, selectedDispatch.hospital_lng], [selectedDispatch.accident_lat, selectedDispatch.accident_lng]]}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                <Marker position={[selectedDispatch.hospital_lat, selectedDispatch.hospital_lng]} icon={ambIcon}>
                                    <Popup><div className="text-black font-bold">Hospital</div></Popup>
                                </Marker>
                                <Marker position={[selectedDispatch.accident_lat, selectedDispatch.accident_lng]} icon={destIcon}>
                                    <Popup><div className="text-black text-xs">Scene</div></Popup>
                                </Marker>
                                <Polyline
                                    positions={[[selectedDispatch.hospital_lat, selectedDispatch.hospital_lng], [selectedDispatch.accident_lat, selectedDispatch.accident_lng]]}
                                    pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.6, dashArray: '10, 10' }}
                                />
                            </MapContainer>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500">
                            <Navigation className="w-16 h-16 mb-4 opacity-20" />
                            <p>Select a dispatch to view route</p>
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
            `}</style>
        </div>
    );
}
