import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { dashboard, reports as reportsApi, dispatch as dispatchApi } from '../api/client';
import {
    Video, Car, Timer, Siren, Settings, Gauge, AlertTriangle, Clock,
    Truck, Bike, Activity, MapPin, Hospital, ChevronRight, Satellite,
    Navigation, Crosshair, Layers
} from 'lucide-react';

// ── Animated Counter ──
function AnimatedNumber({ value, className = '' }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        const target = Number(value) || 0;
        const duration = 600;
        const start = display;
        const step = (target - start) / (duration / 16);
        let current = start;
        const timer = setInterval(() => {
            current += step;
            if ((step > 0 && current >= target) || (step < 0 && current <= target) || step === 0) {
                current = target;
                clearInterval(timer);
            }
            setDisplay(Math.round(current));
        }, 16);
        return () => clearInterval(timer);
    }, [value]);
    return <span className={className}>{display}</span>;
}

export default function DashboardPage({ manualMode = false }) {
    const { user } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [lastAmbulanceState, setLastAmbulanceState] = useState(false);
    const [streamKey, setStreamKey] = useState(Date.now());
    const [incidentReports, setIncidentReports] = useState([]);
    const feedImgRefs = useRef([null, null, null, null]);
    const [activeDispatches, setActiveDispatches] = useState([]);
    const [eventLog, setEventLog] = useState([{ time: 'System', msg: 'Dashboard initialized. Monitor active.', type: 'system' }]);
    const [startTime] = useState(Date.now());
    const lastReportIdRef = useRef(0);
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef({});
    const dispatchMarkersRef = useRef([]);
    // Map toggles
    const [mapSatellite, setMapSatellite] = useState(false);
    const [mapTraffic, setMapTraffic] = useState(false);
    const [mapTracking, setMapTracking] = useState(false);
    const standardLayerRef = useRef(null);
    const satelliteLayerRef = useRef(null);
    const trafficLayerRef = useRef(null);
    const userMarkerRef = useRef(null);
    const userCircleRef = useRef(null);

    const logEvent = useCallback((type, message) => {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setEventLog(prev => [{ time, msg: message, type: type.toLowerCase() }, ...prev].slice(0, 20));
    }, []);

    // Fetch dashboard status
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await dashboard.status();
                setData(res);
            } catch (err) { console.error("Failed to fetch status:", err); }
        };
        fetchData();
        const interval = setInterval(fetchData, 2000);
        return () => clearInterval(interval);
    }, []);

    // ── Refresh stream URLs on mount + visibility change ──
    useEffect(() => {
        // Fresh key on every mount ensures new MJPEG connections
        setStreamKey(Date.now());

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                // Tab regained focus — refresh all feeds
                setStreamKey(Date.now());
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        // Cleanup: close all MJPEG connections on unmount
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            // Force-close MJPEG streams by clearing img src
            feedImgRefs.current.forEach(img => {
                if (img) img.src = '';
            });
        };
    }, []);

    // Fetch incident reports & track new ones
    useEffect(() => {
        const fetchReports = async () => {
            try {
                const res = await reportsApi.list();
                const reports = res.reports || [];
                // Track new incidents
                reports.forEach(r => {
                    if (r.id > lastReportIdRef.current) {
                        if (lastReportIdRef.current > 0) {
                            logEvent('ALERT', `New Incident Reported at ${r.location}`);
                        }
                    }
                });
                if (reports.length > 0) {
                    lastReportIdRef.current = Math.max(...reports.map(r => r.id));
                }
                setIncidentReports(reports);
            } catch { }
        };
        fetchReports();
        const interval = setInterval(fetchReports, 5000);
        return () => clearInterval(interval);
    }, [logEvent]);

    // Fetch active dispatches
    useEffect(() => {
        const fetchDispatches = async () => {
            try {
                const res = await dispatchApi.active();
                setActiveDispatches(res.dispatches || []);
            } catch { }
        };
        fetchDispatches();
        const interval = setInterval(fetchDispatches, 5000);
        return () => clearInterval(interval);
    }, []);

    // Ambulance detection alerts
    useEffect(() => {
        const ambulanceActive = data?.signal_status?.ambulance_mode || false;
        if (ambulanceActive && !lastAmbulanceState) {
            addToast("EMERGENCY VEHICLE DETECTED! Overriding traffic signals.", "error");
            logEvent('Emergency', 'Ambulance detected on approaching lane!');
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance("Critical Alert. Emergency vehicle detected. Traffic signals overridden.");
                utterance.rate = 1.0;
                window.speechSynthesis.speak(utterance);
            }
        }
        setLastAmbulanceState(ambulanceActive);
    }, [data, lastAmbulanceState, addToast, logEvent]);

    // Initialize Leaflet map with multiple layers
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;
        const L = window.L;
        if (!L) return;
        const map = L.map(mapRef.current).setView([10.0, 76.3], 12);

        // Standard dark layer (default)
        const standardLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap', maxZoom: 19
        }).addTo(map);

        // Satellite layer (Google hybrid)
        const satelliteLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            attribution: 'Imagery &copy; Google', maxZoom: 20, subdomains: '0123'
        });

        // Traffic overlay layer
        const trafficLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=h@221097413,traffic&style=15&x={x}&y={y}&z={z}', {
            attribution: 'Traffic &copy; Google', maxZoom: 20, subdomains: '0123'
        });

        standardLayerRef.current = standardLayer;
        satelliteLayerRef.current = satelliteLayer;
        trafficLayerRef.current = trafficLayer;
        mapInstanceRef.current = map;
        return () => { map.remove(); mapInstanceRef.current = null; };
    }, []);

    // Handle satellite toggle
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;
        if (mapSatellite) {
            if (standardLayerRef.current) map.removeLayer(standardLayerRef.current);
            if (satelliteLayerRef.current) satelliteLayerRef.current.addTo(map);
        } else {
            if (satelliteLayerRef.current) map.removeLayer(satelliteLayerRef.current);
            if (standardLayerRef.current) standardLayerRef.current.addTo(map);
        }
        if (mapTraffic && trafficLayerRef.current) trafficLayerRef.current.bringToFront();
    }, [mapSatellite]);

    // Handle traffic toggle
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;
        if (mapTraffic) {
            if (trafficLayerRef.current) trafficLayerRef.current.addTo(map);
        } else {
            if (trafficLayerRef.current) map.removeLayer(trafficLayerRef.current);
        }
    }, [mapTraffic]);

    // Handle GPS tracking toggle
    useEffect(() => {
        const map = mapInstanceRef.current;
        const L = window.L;
        if (!map || !L) return;

        if (mapTracking) {
            map.locate({ watch: true, setView: true, maxZoom: 16, enableHighAccuracy: true, maximumAge: 0 });
            const onFound = (e) => {
                const radius = e.accuracy / 2;
                if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);
                if (userCircleRef.current) map.removeLayer(userCircleRef.current);
                const locIcon = L.divIcon({
                    className: 'custom-loc-icon',
                    html: `<div style="width:16px;height:16px;background:#fff;border-radius:50%;border:4px solid #0071EB;box-shadow:0 0 15px #0071EB;position:relative;z-index:10;">
                        <div style="position:absolute;top:-5px;left:-5px;right:-5px;bottom:-5px;border-radius:50%;border:2px solid #0071EB;animation:locPulse 1.5s infinite cubic-bezier(0.215,0.610,0.355,1);"></div>
                    </div>`,
                    iconSize: [24, 24], iconAnchor: [12, 12]
                });
                userMarkerRef.current = L.marker(e.latlng, { icon: locIcon }).addTo(map)
                    .bindPopup(`<b>Command Center</b><br>Accuracy: ${Math.round(radius)}m`);
                userCircleRef.current = L.circle(e.latlng, radius, {
                    color: '#0071EB', fillColor: '#0071EB', fillOpacity: 0.1, weight: 1, dashArray: '4, 4'
                }).addTo(map);
            };
            const onError = () => {
                addToast('Location access denied or unavailable', 'warning');
                setMapTracking(false);
            };
            map.on('locationfound', onFound);
            map.on('locationerror', onError);
            return () => {
                map.off('locationfound', onFound);
                map.off('locationerror', onError);
            };
        } else {
            map.stopLocate();
            if (userMarkerRef.current) { map.removeLayer(userMarkerRef.current); userMarkerRef.current = null; }
            if (userCircleRef.current) { map.removeLayer(userCircleRef.current); userCircleRef.current = null; }
        }
    }, [mapTracking, addToast]);

    // Update map markers for incidents (diff-based — only add/remove changed markers)
    useEffect(() => {
        const map = mapInstanceRef.current;
        const L = window.L;
        if (!map || !L) return;
        
        // Collect current report IDs
        const currentIds = new Set(incidentReports.filter(r => r.latitude && r.longitude).map(r => r.id));
        
        // Remove markers for reports that no longer exist
        Object.keys(markersRef.current).forEach(id => {
            if (!currentIds.has(Number(id))) {
                map.removeLayer(markersRef.current[id]);
                delete markersRef.current[id];
            }
        });
        
        // Add markers for new reports only
        incidentReports.forEach(r => {
            if (r.latitude && r.longitude && !markersRef.current[r.id]) {
                const color = r.status === 'Resolved' ? '#10b981' : (r.status === 'Verified' ? '#f59e0b' : '#ef4444');
                const marker = L.circleMarker([r.latitude, r.longitude], {
                    radius: 8, fillColor: color, color: '#fff', weight: 1, opacity: 1, fillOpacity: 0.8
                }).addTo(map);
                marker.bindPopup(`<b>${r.location}</b><br>${r.description || 'No details'}<br>Status: ${r.status}`);
                markersRef.current[r.id] = marker;
            }
        });
    }, [incidentReports]);

    // Manual override toggle with voice
    const handleManualToggle = (checked) => {
        setManualMode(checked);
        logEvent('System', `Manual Override ${checked ? 'ENABLED' : 'DISABLED'}`);
        try {
            const msg = new SpeechSynthesisUtterance(`Manual Override ${checked ? 'Activated' : 'Deactivated'}`);
            window.speechSynthesis.speak(msg);
        } catch {}
    };

    const handleOverride = async (lane) => {
        try {
            await dashboard.override(lane);
            addToast(`Force Green triggered on Lane ${lane + 1}`, 'success');
            logEvent('Manual', `Lane ${lane + 1} forced GREEN`);
        } catch (err) {
            addToast("Failed to trigger override: " + err.message, 'error');
            logEvent('Error', 'Failed to override signal');
        }
    };

    const handleAlertAmbulance = async (report) => {
        if (!report.latitude || !report.longitude) {
            addToast('No GPS coordinates available for this report', 'warning');
            logEvent('System', 'No geographic coordinates available for this location.');
            return;
        }
        try {
            const query = `[out:json];(node["amenity"="hospital"](around:10000,${report.latitude},${report.longitude});way["amenity"="hospital"](around:10000,${report.latitude},${report.longitude}););out center;`;
            const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
            const osm = await res.json();
            let hospitalName = "Nearest Response Center", hLat = null, hLng = null, distKm = null;

            if (osm.elements?.length > 0) {
                const hospitals = osm.elements.map(el => {
                    const lat = el.lat || el.center?.lat;
                    const lng = el.lon || el.center?.lon;
                    const name = el.tags?.name;
                    if (!lat || !lng || !name) return null;
                    const R = 6371;
                    const dLat = (lat - report.latitude) * Math.PI / 180;
                    const dLon = (lng - report.longitude) * Math.PI / 180;
                    const a = Math.sin(dLat / 2) ** 2 + Math.cos(report.latitude * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
                    const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    return { name, lat, lng, dist: d };
                }).filter(Boolean).sort((a, b) => a.dist - b.dist);

                if (hospitals.length > 0) {
                    hospitalName = hospitals[0].name;
                    hLat = hospitals[0].lat;
                    hLng = hospitals[0].lng;
                    distKm = Math.round(hospitals[0].dist * 10) / 10;
                }
            }

            // Save dispatch
            await dispatchApi.create({
                report_id: report.id, hospital_name: hospitalName,
                hospital_lat: hLat, hospital_lng: hLng,
                accident_lat: report.latitude, accident_lng: report.longitude,
                distance_km: distKm
            });

            addToast(`Ambulance dispatched from ${hospitalName}`, 'success');
            logEvent('Emergency', `Dispatched unit from ${hospitalName} to Incident #${report.id}`);

            // Visualize on map
            const map = mapInstanceRef.current;
            const L = window.L;
            if (map && L && hLat && hLng) {
                // Hospital marker
                const hospitalMarker = L.circleMarker([hLat, hLng], {
                    radius: 10, fillColor: '#3b82f6', color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.9
                }).addTo(map);
                hospitalMarker.bindPopup(`<b>${hospitalName}</b><br>Responding to Incident #${report.id}`).openPopup();
                dispatchMarkersRef.current.push(hospitalMarker);

                // Route line
                const routeLine = L.polyline([[hLat, hLng], [report.latitude, report.longitude]], {
                    color: '#3b82f6', weight: 4, dashArray: '10, 10', className: 'route-animation'
                }).addTo(map);
                dispatchMarkersRef.current.push(routeLine);

                // Fit bounds
                map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });

                // Voice alert with hospital name and distance
                try {
                    const speechMsg = `Emergency recorded. Alerting ${hospitalName}, located ${distKm} kilometers away. Ambulance dispatched.`;
                    const msg = new SpeechSynthesisUtterance(speechMsg);
                    window.speechSynthesis.speak(msg);
                } catch {}
            } else {
                // Fallback voice if no hospital found
                try {
                    const msg = new SpeechSynthesisUtterance("Nearest available response center has been alerted and routed to the accident location.");
                    window.speechSynthesis.speak(msg);
                } catch {}
            }
        } catch (err) {
            addToast('Failed to dispatch: ' + err.message, 'error');
            logEvent('Emergency', `Offline Fallback: Alerted nearest unit for #${report.id}`);
        }
    };

    const focusAccident = (lat, lng, id) => {
        const map = mapInstanceRef.current;
        if (map && lat && lng) {
            map.flyTo([lat, lng], 16, { animate: true, duration: 1.5 });
            if (markersRef.current[id]) {
                setTimeout(() => markersRef.current[id].openPopup(), 1500);
            }
        } else {
            logEvent('System', 'No geographic coordinates available for this location.');
        }
    };

    const states = data?.signal_status?.states || ["RED", "RED", "RED", "RED"];
    const remaining = data?.signal_status?.remaining_time || 0;
    const ambulanceActive = data?.signal_status?.ambulance_mode || false;
    const laneData = data?.lane_data || {};
    const totalVehicles = Object.values(laneData).reduce((sum, l) => sum + (l?.count || l?.vehicle_count || 0), 0);
    const activeIncidents = incidentReports.filter(r => r.status !== 'Resolved').length;

    // System uptime
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const uptimeH = Math.floor(uptimeSeconds / 3600);
    const uptimeM = Math.floor((uptimeSeconds % 3600) / 60);
    const uptimeStr = uptimeH > 0 ? `${uptimeH}h ${uptimeM}m` : `${uptimeM}m`;

    // Detection confidence
    let activeLanes = 0;
    for (let i = 0; i < 4; i++) { if ((laneData[i]?.count || 0) > 0) activeLanes++; }
    const confidence = totalVehicles === 0 && activeLanes === 0 ? 'Idle' : activeLanes >= 3 ? 'HIGH' : activeLanes >= 1 ? 'MED' : 'LOW';

    const signalColors = {
        GREEN: { bg: 'bg-[#46D369]/10', border: 'border-[#46D369]/30', text: 'text-[#46D369]', glow: 'shadow-[0_0_15px_rgba(70,211,105,0.2)]', dot: 'bg-[#46D369]' },
        YELLOW: { bg: 'bg-[#E87C03]/10', border: 'border-[#E87C03]/30', text: 'text-[#E87C03]', glow: 'shadow-[0_0_15px_rgba(232,124,3,0.2)]', dot: 'bg-[#E87C03]' },
        RED: { bg: 'bg-[#E50914]/10', border: 'border-[#E50914]/30', text: 'text-[#E50914]', glow: 'shadow-[0_0_15px_rgba(229,9,20,0.2)]', dot: 'bg-[#E50914]' },
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 pb-12">
            {/* Route animation CSS */}
            <style>{`
                .route-animation { stroke-dashoffset: 100; animation: dashAnim 2s linear infinite; }
                @keyframes dashAnim { to { stroke-dashoffset: 0; } }
                @keyframes locPulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(3.5); opacity: 0; } }
                @keyframes activeGreenGlow { 0%, 100% { box-shadow: 0 0 10px rgba(70,211,105,0.2); } 50% { box-shadow: 0 0 25px rgba(70,211,105,0.4); } }
                .active-green-glow { animation: activeGreenGlow 2s ease-in-out infinite; }
            `}</style>

            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-5 gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-[0.04em] text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                        COMMAND CENTER
                    </h2>
                    <p className="text-gray-500 text-sm font-medium">Real-time traffic flow, anomaly detection, and adaptive signal control.</p>
                </div>
                <div className="flex gap-3 flex-wrap">
                    {user?.role === 'admin' && (
                        <button onClick={() => navigate('/camera')}
                            className="px-4 py-2 bg-[#0071EB]/10 text-[#0071EB] hover:bg-[#0071EB]/20 hover:text-white border border-[#0071EB]/30 rounded-xl flex items-center gap-2 font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(0,113,235,0.15)]">
                            <Settings className="w-4 h-4 shrink-0" /> Configure Sources
                        </button>
                    )}

                    {/* Summary stat pills */}
                    {[
                        { icon: Car, label: 'Total Vehicles', value: <AnimatedNumber value={totalVehicles} />, color: '#0071EB' },
                        { icon: AlertTriangle, label: 'Active Incidents', value: activeIncidents, color: '#E50914' },
                        { icon: Activity, label: 'Detection', value: confidence, color: '#46D369' },
                        { icon: Gauge, label: 'Uptime', value: uptimeStr, color: '#9B59B6' },
                    ].map((s, i) => (
                        <div key={i} className="px-4 py-2 bg-[#181818] border border-white/[0.06] rounded-xl flex items-center gap-3">
                            <s.icon className="w-4 h-4" style={{ color: s.color }} />
                            <div>
                                <div className="text-xs text-gray-500 uppercase tracking-wider font-bold">{s.label}</div>
                                <div className="text-white font-bold text-lg leading-none">{s.value}</div>
                            </div>
                        </div>
                    ))}

                    <div className="px-4 py-2 bg-[#181818] border border-white/[0.06] rounded-xl flex items-center gap-3">
                        <Timer className="w-4 h-4 text-[#46D369]" />
                        <div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider font-bold">Signal Timer</div>
                            <div className="text-white font-bold text-lg leading-none tabular-nums">{remaining}s</div>
                        </div>
                    </div>

                    {ambulanceActive && (
                        <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1 }}
                            className="px-4 py-2 bg-[#E50914]/10 border border-[#E50914]/40 shadow-[0_0_20px_rgba(229,9,20,0.3)] text-[#E50914] rounded-xl flex items-center gap-2">
                            <Siren className="w-4 h-4" />
                            <span className="font-black text-xs tracking-widest">AMBULANCE OVERRIDE</span>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Main Content: Video Grid + Side Panel */}
            <div className="flex gap-4">
                {/* Video Grid */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {[0, 1, 2, 3].map((i) => {
                        const state = states[i];
                        const lData = laneData[i] || { count: 0, density: 'Low', details: {} };
                        const vehicleCount = lData.count || lData.vehicle_count || 0;
                        const density = lData.density || 'Low';
                        const details = lData.details || {};
                        const sc = signalColors[state] || signalColors.RED;
                        const isGreen = state === 'GREEN';

                        return (
                            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                className={`bg-[#181818] rounded-2xl border overflow-hidden flex flex-col shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all group ${isGreen ? 'border-[#46D369]/30 active-green-glow' : 'border-white/[0.06] hover:border-white/[0.1]'}`}>
                                {/* Header */}
                                <div className="px-4 py-2.5 border-b border-white/[0.04] flex justify-between items-center bg-white/[0.01]">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/[0.06] p-2 rounded-lg"><Video className="w-4 h-4 text-gray-400" /></div>
                                        <div>
                                            <span className="font-bold text-white tracking-wide text-[15px]">Lane {i + 1}</span>
                                            <div className="text-xs text-gray-600 uppercase tracking-widest font-bold">Node 0{i + 1}</div>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black tracking-widest ${sc.bg} ${sc.border} ${sc.text} ${sc.glow}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${isGreen ? 'animate-pulse' : ''}`} />
                                        {state}
                                    </div>
                                </div>

                                {/* Video Feed */}
                                <div className="aspect-[4/3] max-h-[280px] w-full bg-[#0a0a0a] relative flex items-center justify-center border-b border-white/[0.04] overflow-hidden p-0">
                                    <img
                                        ref={el => { feedImgRefs.current[i] = el; }}
                                        src={`/api/video_feed/${i}?t=${streamKey}`}
                                        className="w-full h-full object-cover z-10 relative saturate-110"
                                        alt={`Lane ${i + 1} Feed`}
                                        onError={(e) => {
                                            e.target.style.opacity = '0';
                                            // Retry after 3 seconds with fresh timestamp
                                            setTimeout(() => {
                                                if (e.target) e.target.src = `/api/video_feed/${i}?t=${Date.now()}`;
                                            }, 3000);
                                        }}
                                        onLoad={(e) => { e.target.style.opacity = '1'; }}
                                        style={{ opacity: 0, transition: 'opacity 0.5s ease-in-out' }} />
                                    <div className="absolute inset-0 flex items-center justify-center z-0">
                                        <div className="flex flex-col items-center text-gray-700 gap-3">
                                            <div className="w-10 h-10 rounded-full border-2 border-[#E50914]/10 border-t-[#E50914]/50 animate-spin" />
                                            <span className="text-xs font-bold tracking-[0.25em] uppercase text-gray-600">Connecting Feed</span>
                                        </div>
                                    </div>
                                    {/* Scan line animation */}
                                    <div className="absolute inset-0 z-15 pointer-events-none" style={{
                                        background: 'linear-gradient(to bottom, transparent 95%, rgba(229,9,20,0.15) 100%)',
                                        backgroundSize: '100% 200%',
                                        animation: 'scanMap 3s infinite linear'
                                    }} />
                                    <div className="absolute top-2 left-2 z-20 flex gap-1.5">
                                        <div className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-gray-300 font-bold tracking-wider flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
                                        </div>
                                    </div>

                                    {/* Manual override overlay */}
                                    {manualMode && (
                                        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 transition-opacity">
                                            <button onClick={() => handleOverride(i)}
                                                className="px-6 py-3 bg-[#E50914] hover:bg-[#B20710] text-white font-bold rounded-xl text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(229,9,20,0.5)] transition-all">
                                                ⚡ Force Green
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Stats */}
                                <div className="p-4 flex justify-between items-center bg-gradient-to-b from-[#181818] to-[#141414]">
                                    <div className="flex gap-6">
                                        <div className="flex gap-4 items-center">
                                            <div className="flex items-center gap-1 text-gray-400" title="Cars"><Car className="w-3.5 h-3.5" /> <span className="text-sm font-mono">{details.car || details.Car || 0}</span></div>
                                            <div className="flex items-center gap-1 text-gray-400" title="Trucks"><Truck className="w-3.5 h-3.5" /> <span className="text-sm font-mono">{(details.truck || 0) + (details.bus || 0)}</span></div>
                                            <div className="flex items-center gap-1 text-gray-400" title="Bikes"><Bike className="w-3.5 h-3.5" /> <span className="text-sm font-mono">{(details.motorcycle || 0) + (details.bicycle || 0)}</span></div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Total</div>
                                            <div className="text-2xl font-black text-white leading-none tabular-nums"><AnimatedNumber value={vehicleCount} /></div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Density</div>
                                            <span className={`text-xs font-black tracking-widest py-1 px-3 rounded-md uppercase ${density === 'High' ? 'bg-[#E50914]/15 text-[#E50914]' : density === 'Medium' ? 'bg-[#E87C03]/15 text-[#E87C03]' : 'bg-[#46D369]/15 text-[#46D369]'}`}>
                                                {density}
                                            </span>
                                        </div>
                                    </div>

                                    {user?.role === 'admin' && !manualMode && (
                                        <button onClick={() => handleOverride(i)} disabled={ambulanceActive || isGreen}
                                            className="px-5 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl text-xs font-bold tracking-wider transition-all disabled:opacity-20 disabled:pointer-events-none uppercase">
                                            Force Green
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Right Side Panel — Incident Reports, Dispatch History, Event Log */}
                <div className="hidden xl:flex w-80 flex-col gap-4 shrink-0">
                    {/* Incident Reports */}
                    <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-4 flex-1 flex flex-col overflow-hidden">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-4 h-4 text-[#E50914]" /> Incident Reports
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-2 tv-scrollbar" style={{ maxHeight: '200px' }}>
                            {incidentReports.length === 0 ? (
                                <p className="text-gray-600 text-xs text-center py-4">No accident reports.</p>
                            ) : incidentReports.map(r => (
                                <div key={r.id} className="p-2.5 rounded-lg bg-white/[0.03] border-l-2 hover:bg-white/[0.06] transition-colors cursor-pointer"
                                    style={{ borderLeftColor: r.status === 'Resolved' ? '#10b981' : r.status === 'Verified' ? '#f59e0b' : '#ef4444' }}
                                    onClick={() => focusAccident(r.latitude, r.longitude, r.id)}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-white truncate">{r.location}</span>
                                        <span className="text-[10px] text-gray-500 shrink-0 ml-2">{r.timestamp?.split(' ')[1] || ''}</span>
                                    </div>
                                    <p className="text-[11px] text-gray-400 truncate">{r.description || 'No details'}</p>
                                    <div className="flex justify-between items-center mt-1.5">
                                        <span className="text-[10px] font-bold" style={{ color: r.status === 'Resolved' ? '#10b981' : '#ef4444' }}>
                                            {r.status}
                                        </span>
                                        {r.status !== 'Resolved' && (
                                            <button onClick={(e) => { e.stopPropagation(); handleAlertAmbulance(r); }}
                                                className="text-[10px] bg-[#E50914] text-white px-2 py-0.5 rounded font-bold flex items-center gap-1 hover:bg-[#B20710] transition-colors">
                                                <Hospital className="w-3 h-3" /> Alert Ambulance
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Dispatch History */}
                    <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-4 flex flex-col">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                            <Siren className="w-4 h-4 text-[#0071EB]" /> Dispatch History
                        </h3>
                        <div className="overflow-y-auto space-y-2 tv-scrollbar" style={{ maxHeight: '150px' }}>
                            {activeDispatches.length === 0 ? (
                                <p className="text-gray-600 text-xs text-center py-2">No active dispatches.</p>
                            ) : activeDispatches.map(d => {
                                const statusColor = { Dispatched: '#f59e0b', 'En Route': '#0071EB', Arrived: '#10b981', 'Patient Loaded': '#10b981' }[d.status] || '#f59e0b';
                                return (
                                    <div key={d.id} className="p-2.5 rounded-lg bg-white/[0.03]">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-white">#{d.id} — {d.hospital_name}</span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: statusColor, background: statusColor + '20' }}>{d.status}</span>
                                        </div>
                                        <div className="text-[10px] text-gray-500 mt-1">{d.description || 'Emergency dispatch'} • {d.timestamp}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Event Log */}
                    <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-4 flex-1 flex flex-col overflow-hidden">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                            <Activity className="w-4 h-4 text-[#9B59B6]" /> Event Log
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-1 tv-scrollbar" style={{ maxHeight: '200px' }}>
                            {eventLog.map((e, idx) => (
                                <div key={idx} className="flex gap-2 py-1 border-b border-white/[0.03]">
                                    <span className="text-[10px] font-mono text-gray-600 shrink-0 w-14">{e.time}</span>
                                    <span className={`text-[11px] ${e.type === 'emergency' || e.type === 'alert' ? 'text-[#E50914] font-bold' : 'text-gray-400'}`}>{e.msg}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Incident Map */}
            <div className="mt-6 bg-[#181818] border border-white/[0.06] rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#0071EB]" /> Live Incident Map
                        <span className="text-[10px] bg-white/[0.06] px-2 py-0.5 rounded text-gray-400 font-normal">Real-time</span>
                    </h3>

                    {/* Map Toggle Controls — matching old project */}
                    <div className="flex items-center gap-3 bg-black/30 px-4 py-2 rounded-full border border-white/[0.1]">
                        {/* Satellite Toggle */}
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setMapSatellite(!mapSatellite)}>
                            <Satellite className={`w-4 h-4 transition-colors ${mapSatellite ? 'text-[#0071EB]' : 'text-gray-500'}`} />
                            <span className="text-xs font-semibold text-white">Satellite</span>
                            <div className={`w-9 h-5 rounded-full border transition-all relative ${mapSatellite ? 'bg-[#10b981]/20 border-[#10b981]' : 'bg-white/10 border-white/20'}`}>
                                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${mapSatellite ? 'left-4 bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'left-0.5 bg-gray-500'}`} />
                            </div>
                        </div>

                        <div className="w-px h-4 bg-white/10" />

                        {/* Traffic Toggle */}
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setMapTraffic(!mapTraffic)}>
                            <Car className={`w-4 h-4 transition-colors ${mapTraffic ? 'text-[#f59e0b]' : 'text-gray-500'}`} />
                            <span className="text-xs font-semibold text-white">Traffic</span>
                            <div className={`w-9 h-5 rounded-full border transition-all relative ${mapTraffic ? 'bg-[#10b981]/20 border-[#10b981]' : 'bg-white/10 border-white/20'}`}>
                                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${mapTraffic ? 'left-4 bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'left-0.5 bg-gray-500'}`} />
                            </div>
                        </div>

                        <div className="w-px h-4 bg-white/10" />

                        {/* GPS Track Toggle */}
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setMapTracking(!mapTracking)}>
                            <Crosshair className={`w-4 h-4 transition-colors ${mapTracking ? 'text-[#10b981]' : 'text-gray-500'}`} />
                            <span className="text-xs font-semibold text-white">Track</span>
                            <div className={`w-9 h-5 rounded-full border transition-all relative ${mapTracking ? 'bg-[#10b981]/20 border-[#10b981]' : 'bg-white/10 border-white/20'}`}>
                                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${mapTracking ? 'left-4 bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'left-0.5 bg-gray-500'}`} />
                            </div>
                        </div>
                    </div>
                </div>
                <div ref={mapRef} className="w-full rounded-xl overflow-hidden border border-white/[0.08]" style={{ height: '500px' }} />
            </div>
        </motion.div>
    );
}
