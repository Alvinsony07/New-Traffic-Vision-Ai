import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { analytics } from '../api/client';
import { Activity, Car, AlertTriangle, Crosshair, Layers, Navigation, Radio, Zap } from 'lucide-react';

// Custom map marker icons
const incidentIcon = new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background: rgba(229,9,20,0.2); border: 2px solid #E50914; width: 18px; height: 18px; border-radius: 50%; box-shadow: 0 0 12px rgba(229,9,20,0.6);"></div>`,
    iconSize: [18, 18], iconAnchor: [9, 9]
});

const dispatchIcon = new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background: rgba(0,113,235,0.2); border: 2px solid #0071EB; width: 18px; height: 18px; border-radius: 4px; box-shadow: 0 0 12px rgba(0,113,235,0.6);"></div>`,
    iconSize: [18, 18], iconAnchor: [9, 9]
});

export default function CityOverviewPage() {
    const [mapData, setMapData] = useState({
        signal_status: { states: ["RED", "RED", "RED", "RED"] },
        lane_data: {},
        reports: [],
        dispatches: [],
        summary: { total_vehicles: 0, active_incidents: 0, active_dispatches: 0 }
    });

    const [toggles, setToggles] = useState({ traffic: true, incidents: true, dispatches: true });

    useEffect(() => {
        const fetchMapData = async () => {
            try {
                const res = await analytics.cityMap();
                setMapData(res);
            } catch (err) { console.error("Failed to fetch map data"); }
        };
        fetchMapData();
        const interval = setInterval(fetchMapData, 3000);
        return () => clearInterval(interval);
    }, []);

    const feed = [
        ...mapData.reports.map(r => ({ ...r, type: 'incident', time: r.timestamp })),
        ...mapData.dispatches.map(d => ({ ...d, type: 'dispatch', time: d.timestamp }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 50);

    const signalColors = ['#E50914', '#E87C03', '#46D369'];

    return (
        <div className="h-[calc(100vh-0px)] w-full relative overflow-hidden bg-[#0a0a0a]">
            {/* Map */}
            <div className="absolute inset-0 z-0 opacity-80">
                <MapContainer center={[12.9716, 77.5946]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

                    {toggles.incidents && mapData.reports.map(r => r.latitude && r.longitude ? (
                        <Marker key={`rep-${r.id}`} position={[r.latitude, r.longitude]} icon={incidentIcon}>
                            <Popup>
                                <div className="text-sm p-1 min-w-[180px]">
                                    <div className="font-bold text-[#E50914] flex justify-between gap-4 mb-1">
                                        Incident #{r.id} <span className="bg-[#E50914]/20 text-[#E50914] px-1.5 rounded text-xs font-bold">{r.status}</span>
                                    </div>
                                    <p className="text-gray-300 text-xs mb-1">{r.description}</p>
                                    <div className="text-xs text-gray-500">{r.timestamp}</div>
                                </div>
                            </Popup>
                        </Marker>
                    ) : null)}

                    {toggles.dispatches && mapData.dispatches.map(d => d.hospital_lat && d.hospital_lng ? (
                        <Marker key={`disp-${d.id}`} position={[d.hospital_lat, d.hospital_lng]} icon={dispatchIcon}>
                            <Popup>
                                <div className="text-sm p-1 min-w-[180px]">
                                    <div className="font-bold text-[#0071EB] mb-1">Dispatch → {d.hospital_name}</div>
                                    <p className="text-gray-300 text-xs mb-1">Status: {d.status}</p>
                                    <div className="text-xs text-gray-500">{d.timestamp}</div>
                                </div>
                            </Popup>
                        </Marker>
                    ) : null)}

                    {toggles.traffic && (
                        <Circle center={[12.9716, 77.5946]} radius={400} pathOptions={{ color: 'rgba(70,211,105,0.3)', fillColor: 'rgba(70,211,105,0.1)', fillOpacity: 0.4 }}>
                            <Popup>
                                <div className="text-center p-2 min-w-[160px]">
                                    <h4 className="font-bold text-white mb-2 text-sm">Main Junction</h4>
                                    <div className="flex gap-2 justify-center">
                                        {[0, 1, 2, 3].map(i => {
                                            const s = mapData.signal_status.states[i];
                                            return (
                                                <div key={i} className="bg-[#0a0a0a] p-2 rounded-lg">
                                                    <div className="text-xs text-gray-400 text-center">L{i + 1}</div>
                                                    <div className={`w-3 h-3 rounded-full mx-auto mt-1 ${s === 'GREEN' ? 'bg-[#46D369] shadow-[0_0_8px_rgba(70,211,105,0.8)]' : s === 'YELLOW' ? 'bg-[#E87C03]' : 'bg-[#E50914]'}`} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </Popup>
                        </Circle>
                    )}
                </MapContainer>
            </div>

            {/* Top HUD */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-[#0a0a0a]/85 backdrop-blur-xl border border-white/[0.08] rounded-2xl px-6 py-3 flex gap-6 shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
                <div className="text-center">
                    <div className="text-2xl font-black text-white tabular-nums">{mapData.summary.total_vehicles}</div>
                    <div className="text-xs text-gray-500 font-bold tracking-[0.2em] uppercase">Live Vehicles</div>
                </div>
                <div className="w-[1px] bg-white/[0.06]" />
                <div className="text-center">
                    <div className="text-2xl font-black text-[#E50914] tabular-nums">{mapData.summary.active_incidents}</div>
                    <div className="text-xs text-gray-500 font-bold tracking-[0.2em] uppercase">Incidents</div>
                </div>
                <div className="w-[1px] bg-white/[0.06]" />
                <div className="text-center">
                    <div className="text-2xl font-black text-[#0071EB] tabular-nums">{mapData.summary.active_dispatches}</div>
                    <div className="text-xs text-gray-500 font-bold tracking-[0.2em] uppercase">Dispatches</div>
                </div>
            </div>

            {/* Left Panel */}
            <div className="absolute top-16 left-4 z-10 w-64 max-h-[calc(100vh-100px)] overflow-y-auto bg-[#0a0a0a]/85 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 tv-scrollbar shadow-lg">
                <h3 className="text-xs text-[#0071EB] tracking-[0.2em] uppercase font-bold mb-3 flex items-center gap-2">
                    <Crosshair className="w-3.5 h-3.5" /> Intersection Nodes
                </h3>

                <div className="p-3 bg-white/[0.03] border border-white/[0.04] rounded-xl mb-5 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#46D369] shadow-[0_0_8px_rgba(70,211,105,0.6)]" />
                    <div className="flex-1">
                        <div className="text-sm font-bold text-white">Central Junction</div>
                        <div className="text-xs text-gray-600 font-mono">Node 01</div>
                    </div>
                    <div className="text-lg font-black text-white tabular-nums">{mapData.summary.total_vehicles}</div>
                </div>

                <h3 className="text-xs text-[#0071EB] tracking-[0.2em] uppercase font-bold mb-3 flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                    <Layers className="w-3.5 h-3.5" /> Map Layers
                </h3>

                <div className="space-y-2.5">
                    {[
                        { key: 'traffic', label: 'Traffic Flow', icon: Car, color: '#46D369' },
                        { key: 'incidents', label: 'Incidents', icon: AlertTriangle, color: '#E50914' },
                        { key: 'dispatches', label: 'Dispatches', icon: Navigation, color: '#0071EB' },
                    ].map(({ key, label, icon: Icon, color }) => (
                        <label key={key} className="flex items-center justify-between cursor-pointer group">
                            <span className="text-sm text-gray-400 group-hover:text-white transition-colors flex items-center gap-2">
                                <Icon className="w-3.5 h-3.5" /> {label}
                            </span>
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={toggles[key]} onChange={e => setToggles({ ...toggles, [key]: e.target.checked })} />
                                <div className="w-8 h-4 bg-white/[0.08] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-500 after:rounded-full after:h-3 after:w-3 after:transition-all" style={toggles[key] ? { backgroundColor: `${color}30` } : {}}>
                                    <div className={`absolute top-[2px] ${toggles[key] ? 'left-[calc(100%-14px)]' : 'left-[2px]'} w-3 h-3 rounded-full transition-all`} style={{ backgroundColor: toggles[key] ? color : '#666' }} />
                                </div>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Bottom Right: Live Feed */}
            <div className="absolute bottom-4 right-4 z-10 w-72 bg-[#0a0a0a]/85 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs text-[#0071EB] tracking-[0.2em] uppercase font-bold flex items-center gap-2">
                        <Radio className="w-3.5 h-3.5" /> Live Event Feed
                    </h3>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#E50914] animate-pulse" />
                        <span className="text-xs text-gray-500 font-bold tracking-wider">LIVE</span>
                    </div>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto tv-scrollbar">
                    {feed.length === 0 ? (
                        <div className="text-xs text-center p-6 text-gray-600">No events yet</div>
                    ) : feed.map((item) => (
                        <div key={`${item.type}-${item.id}`} className={`p-2.5 rounded-lg border-l-2 bg-white/[0.02] ${item.type === 'incident' ? 'border-l-[#E50914]' : 'border-l-[#0071EB]'}`}>
                            <div className="text-xs text-gray-600 flex justify-between">
                                <span className="font-mono">{item.time || item.timestamp}</span>
                                <span className={`uppercase font-bold ${item.type === 'incident' ? 'text-[#E50914]' : 'text-[#0071EB]'}`}>{item.type}</span>
                            </div>
                            <div className="text-xs text-gray-300 mt-0.5 font-medium">
                                {item.type === 'incident' ? item.location : `→ ${item.hospital_name}`}
                            </div>
                        </div>
                    ))}
                </div>
            </div>



        </div>
    );
}
