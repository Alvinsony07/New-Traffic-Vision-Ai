import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { analytics } from '../api/client';
import { Activity, Car, FileText, AlertTriangle, Crosshair, Layers, Navigation } from 'lucide-react';

// Custom icons
const incidentIcon = new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: rgba(239, 68, 68, 0.2); border: 2px solid #ef4444; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(239,68,68,0.5);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

const dispatchIcon = new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: rgba(59, 130, 246, 0.2); border: 2px solid #3b82f6; width: 20px; height: 20px; border-radius: 5px; box-shadow: 0 0 10px rgba(59,130,246,0.5);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

export default function CityOverviewPage() {
    const [mapData, setMapData] = useState({
        signal_status: { states: ["RED", "RED", "RED", "RED"] },
        lane_data: {},
        reports: [],
        dispatches: [],
        summary: { total_vehicles: 0, active_incidents: 0, active_dispatches: 0 }
    });

    const [toggles, setToggles] = useState({
        traffic: true,
        incidents: true,
        dispatches: true
    });

    useEffect(() => {
        const fetchMapData = async () => {
            try {
                const res = await analytics.cityMap();
                setMapData(res);
            } catch (err) {
                console.error("Failed to fetch map data");
            }
        };
        fetchMapData();
        const interval = setInterval(fetchMapData, 3000);
        return () => clearInterval(interval);
    }, []);

    // Create a feed combining reports and dispatches
    const feed = [
        ...mapData.reports.map(r => ({ ...r, type: 'incident', time: r.timestamp })),
        ...mapData.dispatches.map(d => ({ ...d, type: 'dispatch', time: d.timestamp }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 50);

    return (
        <div className="h-[calc(100vh-theme(spacing.16))] w-full relative overflow-hidden bg-[#0a0a0a]">
            {/* Map Background */}
            <div className="absolute inset-0 z-0 opacity-70">
                <MapContainer center={[12.9716, 77.5946]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

                    {/* Render Incidents */}
                    {toggles.incidents && mapData.reports.map(r => r.latitude && r.longitude ? (
                        <Marker key={`rep-${r.id}`} position={[r.latitude, r.longitude]} icon={incidentIcon}>
                            <Popup className="tv-popup">
                                <div className="text-sm font-sans bg-[#0a0a0a] border border-red-500/30 p-3 rounded-lg text-white">
                                    <h4 className="font-bold text-red-500 flex justify-between gap-4 mb-1">
                                        Incident #{r.id} <span className="bg-red-500/20 px-1 rounded text-xs">{r.status}</span>
                                    </h4>
                                    <p className="text-gray-400 mb-2">{r.description}</p>
                                    <div className="text-xs text-gray-500">{r.timestamp}</div>
                                </div>
                            </Popup>
                        </Marker>
                    ) : null)}

                    {/* Render Dispatches */}
                    {toggles.dispatches && mapData.dispatches.map(d => d.hospital_lat && d.hospital_lng ? (
                        <Marker key={`disp-${d.id}`} position={[d.hospital_lat, d.hospital_lng]} icon={dispatchIcon}>
                            <Popup>
                                <div className="text-sm font-sans bg-[#0a0a0a] border border-blue-500/30 p-3 rounded-lg text-white">
                                    <h4 className="font-bold text-blue-500 mb-1">Dispatch to {d.hospital_name}</h4>
                                    <p className="text-gray-400 mb-1">Status: {d.status}</p>
                                    <div className="text-xs text-gray-500">{d.timestamp}</div>
                                </div>
                            </Popup>
                        </Marker>
                    ) : null)}

                    {/* Render Main Intersection (Simulated location of Traffic Lights) */}
                    {toggles.traffic && (
                        <Circle center={[12.9716, 77.5946]} radius={400} pathOptions={{ color: 'rgba(34,197,94,0.3)', fillColor: 'rgba(34,197,94,0.1)', fillOpacity: 0.5 }}>
                            <Popup>
                                <div className="text-center font-sans">
                                    <h4 className="font-bold mb-2">Main Intersection Node 01</h4>
                                    <div className="flex gap-2">
                                        {[0, 1, 2, 3].map(i => (
                                            <div key={i} className="bg-[#141414] p-2 rounded">
                                                <div className="text-xs text-gray-400">L{i + 1}</div>
                                                <div className={`w-3 h-3 rounded-full mx-auto mt-1 ${mapData.signal_status.states[i] === 'GREEN' ? 'bg-green-500' : mapData.signal_status.states[i] === 'YELLOW' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Popup>
                        </Circle>
                    )}
                </MapContainer>
            </div>

            {/* Top HUD */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-[#070b14]/80 backdrop-blur-md border border-[#3b82f6]/20 rounded-2xl px-8 py-3 flex gap-8 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                <div className="text-center">
                    <div className="text-2xl font-black text-white">{mapData.summary.total_vehicles}</div>
                    <div className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Live Vehicles</div>
                </div>
                <div className="w-[1px] h-10 bg-white/10" />
                <div className="text-center">
                    <div className="text-2xl font-black text-white">{mapData.summary.active_incidents}</div>
                    <div className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Incidents</div>
                </div>
                <div className="w-[1px] h-10 bg-white/10" />
                <div className="text-center">
                    <div className="text-2xl font-black text-white">{mapData.summary.active_dispatches}</div>
                    <div className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Dispatches</div>
                </div>
            </div>

            {/* Left HUD Panel: Controls */}
            <div className="absolute top-20 left-4 z-10 w-72 max-h-[calc(100vh-140px)] overflow-y-auto bg-[#070b14]/80 backdrop-blur-md border border-white/10 rounded-2xl p-5 custom-scrollbar">
                <h3 className="text-xs text-[#3b82f6] tracking-widest uppercase font-bold mb-4 flex items-center gap-2">
                    <Crosshair className="w-4 h-4" /> Intersection Nodes
                </h3>

                <div className="space-y-2 mb-6">
                    <div className="p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                        <div className="flex-1">
                            <div className="text-sm font-bold text-white">Central Junction</div>
                            <div className="text-[10px] text-gray-500">Node ID: 01</div>
                        </div>
                        <div className="text-lg font-black text-white">{mapData.summary.total_vehicles}</div>
                    </div>
                </div>

                <h3 className="text-xs text-[#3b82f6] tracking-widest uppercase font-bold mb-3 flex items-center gap-2 pt-4 border-t border-white/10">
                    <Layers className="w-4 h-4" /> Map Layers
                </h3>

                <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer group">
                        <span className="text-sm text-gray-400 group-hover:text-white transition-colors flex items-center gap-2">
                            <Car className="w-4 h-4" /> Traffic Flow
                        </span>
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={toggles.traffic} onChange={e => setToggles({ ...toggles, traffic: e.target.checked })} />
                            <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3b82f6]"></div>
                        </div>
                    </label>
                    <label className="flex items-center justify-between cursor-pointer group">
                        <span className="text-sm text-gray-400 group-hover:text-white transition-colors flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> Incidents
                        </span>
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={toggles.incidents} onChange={e => setToggles({ ...toggles, incidents: e.target.checked })} />
                            <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#e50914]"></div>
                        </div>
                    </label>
                    <label className="flex items-center justify-between cursor-pointer group">
                        <span className="text-sm text-gray-400 group-hover:text-white transition-colors flex items-center gap-2">
                            <Navigation className="w-4 h-4" /> Dispatches
                        </span>
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={toggles.dispatches} onChange={e => setToggles({ ...toggles, dispatches: e.target.checked })} />
                            <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3b82f6]"></div>
                        </div>
                    </label>
                </div>
            </div>

            {/* Bottom Right Event Feed */}
            <div className="absolute bottom-4 right-4 z-10 w-80 bg-[#070b14]/80 backdrop-blur-md border border-white/10 rounded-2xl p-4">
                <h3 className="text-xs text-[#3b82f6] tracking-widest uppercase font-bold mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Live Event Feed
                </h3>

                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {feed.length === 0 ? <div className="text-xs text-center p-4 text-gray-500">No events right now</div> : feed.map((item, i) => (
                        <div key={`${item.type}-${item.id}`} className={`p-2.5 rounded-lg border-l-2 bg-white/[0.02] ${item.type === 'incident' ? 'border-l-red-500' : 'border-l-blue-500'}`}>
                            <div className="text-[10px] text-gray-500 flex justify-between">
                                <span>{item.time || item.timestamp}</span>
                                <span className={`uppercase font-bold ${item.type === 'incident' ? 'text-red-500' : 'text-blue-500'}`}>{item.type}</span>
                            </div>
                            <div className="text-xs text-gray-300 mt-1">
                                {item.type === 'incident' ? item.location : `Dispatch to ${item.hospital_name}`}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                .custom-div-icon { background: transparent; border: none; }
                .tv-popup .leaflet-popup-content-wrapper { background: #0a0a0a; border: none; padding: 0; border-radius: 8px; }
                .tv-popup .leaflet-popup-tip { background: #0a0a0a; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
            `}</style>
        </div>
    );
}
