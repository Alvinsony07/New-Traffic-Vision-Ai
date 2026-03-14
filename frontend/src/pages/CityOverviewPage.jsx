import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { analytics } from '../api/client';
import { useToast } from '../context/ToastContext';
import {
    Car, Crosshair, AlertTriangle, Siren, Activity,
    Layers, Radio, Thermometer, Tag, TrafficCone, Globe, Moon,
    Mountain, Satellite, Search, Locate, Navigation2, MapPin
} from 'lucide-react';

// ══════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════
const JUNCTION_NAMES = ['Lane 01 Zone', 'Lane 02 Zone', 'Lane 03 Zone', 'Lane 04 Zone'];
const OFFSETS = [
    { dlat: 0.004, dlng: 0.004 },
    { dlat: 0.004, dlng: -0.004 },
    { dlat: -0.004, dlng: 0.004 },
    { dlat: -0.004, dlng: -0.004 }
];

// Kerala signal timing (IRC:93-1985)
const TIMING_PROFILES = {
    MAJOR:    { PEAK: { GREEN: 55, YELLOW: 5, RED: 50 }, NORMAL: { GREEN: 40, YELLOW: 4, RED: 35 }, NIGHT: { GREEN: 30, YELLOW: 4, RED: 20 }, LATE_NIGHT: null },
    STANDARD: { PEAK: { GREEN: 45, YELLOW: 4, RED: 40 }, NORMAL: { GREEN: 35, YELLOW: 4, RED: 30 }, NIGHT: { GREEN: 25, YELLOW: 3, RED: 18 }, LATE_NIGHT: null },
    MINOR:    { PEAK: { GREEN: 35, YELLOW: 3, RED: 30 }, NORMAL: { GREEN: 25, YELLOW: 3, RED: 22 }, NIGHT: { GREEN: 20, YELLOW: 3, RED: 15 }, LATE_NIGHT: null }
};

// ── Reliable, free tile providers ──
const TILE_PROVIDERS = {
    colorful: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        options: { maxZoom: 19, attribution: '© OpenStreetMap' }
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        options: { maxZoom: 19, attribution: '© Esri' }
    },
    terrain: {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        options: { maxZoom: 17, attribution: '© OpenTopoMap' }
    },
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        options: { subdomains: 'abcd', maxZoom: 20, attribution: '© CartoDB' }
    }
};

// ── Persistence ──
const LAYER_KEY = 'trafficVisionAI_layerStates';
function loadLayerStates() { try { return JSON.parse(localStorage.getItem(LAYER_KEY)) || {}; } catch { return {}; } }
function saveLayerStates(s) { try { localStorage.setItem(LAYER_KEY, JSON.stringify(s)); } catch {} }

// ── Helpers ──
function getCurrentMode() {
    const h = new Date().getHours();
    if ((h >= 7 && h < 10) || (h >= 17 && h < 20)) return 'PEAK';
    if (h >= 0 && h < 5) return 'LATE_NIGHT';
    if (h >= 22 || h < 6) return 'NIGHT';
    return 'NORMAL';
}
function classifyJunction(el) {
    const tags = el.tags || {};
    const hw = tags.highway || '';
    if (hw === 'traffic_signals' || hw === 'motorway_junction') return (tags.name || tags['name:en']) ? 'MAJOR' : 'STANDARD';
    if (hw === 'mini_roundabout' || tags.junction) return tags.name ? 'MAJOR' : 'STANDARD';
    if (tags.crossing === 'traffic_signals') return 'STANDARD';
    if (hw === 'stop' || hw === 'give_way') return 'MINOR';
    return (el.id % 100) < 15 ? 'MAJOR' : (el.id % 100) < 55 ? 'STANDARD' : 'MINOR';
}
function getSignalState(sig) {
    const mode = getCurrentMode();
    const p = TIMING_PROFILES[sig.junctionType]?.[mode];
    if (!p) return { state: 'BLINK_YELLOW', remaining: 0, color: '#f59e0b', mode };
    const total = p.GREEN + p.YELLOW + p.RED;
    const t = (Math.floor(Date.now() / 1000) + sig.offset) % total;
    if (t < p.GREEN) return { state: 'GREEN', remaining: p.GREEN - t, color: '#10b981', mode };
    if (t < p.GREEN + p.YELLOW) return { state: 'YELLOW', remaining: p.GREEN + p.YELLOW - t, color: '#f59e0b', mode };
    return { state: 'RED', remaining: total - t, color: '#ef4444', mode };
}

// ══════════════════════════════════════════════════
//  GPS ENGINE — retries until <100m accuracy
// ══════════════════════════════════════════════════
function acquireGPS(maxAttempts = 3) {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
        let attempt = 0;
        const tryOnce = () => {
            attempt++;
            navigator.geolocation.getCurrentPosition(
                pos => {
                    if (pos.coords.accuracy > 100 && attempt < maxAttempts) {
                        setTimeout(tryOnce, 600);
                    } else {
                        resolve(pos);
                    }
                },
                err => attempt < maxAttempts ? setTimeout(tryOnce, 600) : reject(err),
                { enableHighAccuracy: true, timeout: 8000 + attempt * 4000, maximumAge: 0 }
            );
        };
        tryOnce();
    });
}

// ══════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════
export default function CityOverviewPage() {
    const { addToast } = useToast();

    // ── state ──
    const [mapData, setMapData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mapView, setMapView] = useState('colorful');
    const [mapTracking, setMapTracking] = useState(false);
    const [gpsAccuracy, setGpsAccuracy] = useState(null);
    const [gpsStatus, setGpsStatus] = useState('acquiring');   // acquiring | locked | fallback | denied
    const [searchQuery, setSearchQuery] = useState('');
    const [keralaLoading, setKeralaLoading] = useState(false);
    const [keralaInfo, setKeralaInfo] = useState(null);
    const [eventFeed, setEventFeed] = useState([{ time: 'System', msg: 'City Surveillance initialized.', type: 'signal' }]);
    const [hudStats, setHudStats] = useState({ vehicles: 0, incidents: 0, dispatches: 0, greenLanes: 0, keralaCount: '—' });

    const saved = loadLayerStates();
    const [layers, setLayers] = useState({
        heatmap: saved.heatmap ?? true,
        incidents: saved.incidents ?? true,
        dispatches: saved.dispatches ?? true,
        junctionLabels: saved.junctionLabels ?? true,
        keralaSignals: saved.keralaSignals ?? false,
        trafficLayer: saved.trafficLayer ?? false
    });

    // ── refs ──
    const mapElRef = useRef(null);
    const mapRef = useRef(null);             // Leaflet map instance
    const tileRef = useRef(null);            // current base tile layer
    const trafficTileRef = useRef(null);
    const userLatRef = useRef(null);
    const userLngRef = useRef(null);
    const userMarkerRef = useRef(null);
    const userCircleRef = useRef(null);
    const watchIdRef = useRef(null);
    const junctionMarkersRef = useRef({});
    const heatZonesRef = useRef({});
    const labelTipsRef = useRef({});
    const junctionStateRef = useRef({});
    const incidentMkrsRef = useRef({});
    const dispatchLinesRef = useRef({});
    const dispatchHospRef = useRef({});
    const knownReportIds = useRef(new Set());
    const knownDispatchIds = useRef(new Set());
    const prevAmbulance = useRef(false);
    const keralaClusterRef = useRef(null);
    const keralaDataRef = useRef([]);
    const keralaLoadedRef = useRef(false);
    const signalTickRef = useRef(null);
    const junctionsRef = useRef([]);

    // ── feed logger ──
    const addFeed = useCallback((type, msg) => {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setEventFeed(prev => [{ time, msg, type }, ...prev].slice(0, 40));
    }, []);

    const toggleLayer = useCallback(key => {
        setLayers(prev => { const n = { ...prev, [key]: !prev[key] }; saveLayerStates(n); return n; });
    }, []);

    // ══════════════════════════════════════════
    //  DATA FETCH — every 5s
    // ══════════════════════════════════════════
    const fetchMapData = useCallback(async () => {
        try { setMapData(await analytics.cityMap()); } catch {} finally { setLoading(false); }
    }, []);
    useEffect(() => {
        fetchMapData();
        const id = setInterval(fetchMapData, 5000);
        return () => clearInterval(id);
    }, [fetchMapData]);

    // ══════════════════════════════════════════
    //  MAP INIT — runs once
    // ══════════════════════════════════════════
    useEffect(() => {
        if (!mapElRef.current || mapRef.current) return;
        const L = window.L;
        if (!L) return;

        // Create map — no setView until GPS resolves
        const map = L.map(mapElRef.current, {
            zoomControl: false,
            attributionControl: false,
            center: [20.5937, 78.9629],
            zoom: 5
        });
        L.control.zoom({ position: 'topright' }).addTo(map);

        // Base tile — use reliable provider
        const prov = TILE_PROVIDERS.colorful;
        tileRef.current = L.tileLayer(prov.url, prov.options).addTo(map);
        mapRef.current = map;

        // ── GPS Acquisition ──
        addFeed('signal', 'Acquiring high-accuracy GPS...');
        setGpsStatus('acquiring');

        acquireGPS(3)
            .then(pos => {
                const { latitude, longitude, accuracy } = pos.coords;
                setGpsAccuracy(Math.round(accuracy));
                setGpsStatus('locked');
                addFeed('signal', `GPS locked — ±${Math.round(accuracy)}m accuracy.`);
                setupMapCenter(latitude, longitude, map, L);
            })
            .catch(() => {
                addFeed('signal', 'GPS unavailable — using network location...');
                setGpsStatus('fallback');
                // IP geolocation fallback chain
                fetch('https://ipapi.co/json/')
                    .then(r => r.json())
                    .then(d => {
                        if (d.latitude && d.longitude) {
                            setupMapCenter(d.latitude, d.longitude, map, L);
                            addFeed('signal', `Network location: ${d.city || 'Unknown'}, ${d.country_name || ''}`);
                        } else throw new Error();
                    })
                    .catch(() => {
                        setupMapCenter(10.8505, 76.2711, map, L);
                        addFeed('signal', 'Default location: Kerala, India.');
                    });
            });

        return () => {
            if (signalTickRef.current) clearInterval(signalTickRef.current);
            if (watchIdRef.current !== null) navigator.geolocation?.clearWatch(watchIdRef.current);
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // ── Setup map center + junction markers ──
    const setupMapCenter = useCallback((lat, lng, map, L) => {
        userLatRef.current = lat;
        userLngRef.current = lng;

        // Create junction markers
        const juncs = OFFSETS.map((o, i) => ({
            id: i, lat: lat + o.dlat, lng: lng + o.dlng, name: JUNCTION_NAMES[i]
        }));
        junctionsRef.current = juncs;

        juncs.forEach(j => {
            const icon = L.divIcon({
                className: '',
                html: `<div style="width:18px;height:18px;border-radius:50%;background:#94a3b8;border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 12px #94a3b8;"></div>`,
                iconSize: [18, 18], iconAnchor: [9, 9]
            });
            junctionMarkersRef.current[j.id] = L.marker([j.lat, j.lng], { icon }).addTo(map)
                .bindPopup(`<b>${j.name}</b><br>Initializing...`);

            heatZonesRef.current[j.id] = L.circle([j.lat, j.lng], {
                radius: 250, fillColor: '#94a3b8', fillOpacity: 0.12, stroke: false
            });
            if (layers.heatmap) heatZonesRef.current[j.id].addTo(map);

            labelTipsRef.current[j.id] = L.tooltip({
                permanent: true, direction: 'top', offset: [0, -14],
                className: 'junction-label-tooltip'
            }).setContent(`<b>${j.name}</b>`).setLatLng([j.lat, j.lng]);
            if (layers.junctionLabels) labelTipsRef.current[j.id].addTo(map);
        });

        map.flyTo([lat, lng], 15, { animate: true, duration: 1.8 });
        if (layers.keralaSignals) loadKeralaSignals(map, L);
    }, [addFeed]);

    // ══════════════════════════════════════════
    //  MAP VIEW SWITCH — reliable tile swap
    // ══════════════════════════════════════════
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        const L = window.L;

        // Remove old tile
        if (tileRef.current) map.removeLayer(tileRef.current);

        // Add new tile from reliable provider
        const prov = TILE_PROVIDERS[mapView] || TILE_PROVIDERS.colorful;
        tileRef.current = L.tileLayer(prov.url, prov.options).addTo(map);
        tileRef.current.bringToBack();

        addFeed('signal', `Map view: ${mapView}`);
    }, [mapView, addFeed]);

    // ══════════════════════════════════════════
    //  TRAFFIC LAYER TOGGLE
    // ══════════════════════════════════════════
    useEffect(() => {
        const map = mapRef.current;
        const L = window.L;
        if (!map || !L) return;
        if (layers.trafficLayer) {
            if (!trafficTileRef.current) {
                // TomTom free traffic flow tiles (no API key needed for basic usage)
                trafficTileRef.current = L.tileLayer(
                    'https://mt{s}.google.com/vt/lyrs=m@221097413,traffic&x={x}&y={y}&z={z}',
                    { subdomains: '0123', maxZoom: 20, opacity: 0.6 }
                );
            }
            if (!map.hasLayer(trafficTileRef.current)) trafficTileRef.current.addTo(map);
        } else {
            if (trafficTileRef.current && map.hasLayer(trafficTileRef.current)) map.removeLayer(trafficTileRef.current);
        }
    }, [layers.trafficLayer]);

    // ══════════════════════════════════════════
    //  GPS TRACKING (watchPosition)
    // ══════════════════════════════════════════
    useEffect(() => {
        const map = mapRef.current;
        const L = window.L;
        if (!map || !L) return;

        if (mapTracking) {
            const onPos = pos => {
                const { latitude, longitude, accuracy } = pos.coords;
                userLatRef.current = latitude;
                userLngRef.current = longitude;
                setGpsAccuracy(Math.round(accuracy));
                setGpsStatus('locked');

                // Update / create user marker
                if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);
                if (userCircleRef.current) map.removeLayer(userCircleRef.current);

                const locIcon = L.divIcon({
                    className: '',
                    html: `<div style="width:16px;height:16px;background:#fff;border-radius:50%;border:4px solid #0071EB;box-shadow:0 0 15px #0071EB;position:relative;">
                        <div style="position:absolute;top:-5px;left:-5px;right:-5px;bottom:-5px;border-radius:50%;border:2px solid #0071EB;animation:locPulse 1.5s infinite;"></div></div>`,
                    iconSize: [24, 24], iconAnchor: [12, 12]
                });
                userMarkerRef.current = L.marker([latitude, longitude], { icon: locIcon }).addTo(map)
                    .bindPopup(`<b>Your Location</b><br>±${Math.round(accuracy)}m<br>${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                userCircleRef.current = L.circle([latitude, longitude], accuracy, {
                    color: '#0071EB', fillColor: '#0071EB', fillOpacity: 0.08, weight: 1, dashArray: '4,4'
                }).addTo(map);
                map.flyTo([latitude, longitude], Math.max(map.getZoom(), 16), { animate: true, duration: 1 });
            };
            const onErr = () => { addToast('Location access denied', 'warning'); setMapTracking(false); setGpsStatus('denied'); };
            watchIdRef.current = navigator.geolocation.watchPosition(onPos, onErr, {
                enableHighAccuracy: true, timeout: 20000, maximumAge: 0
            });
            return () => { if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; } };
        } else {
            if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
            if (userMarkerRef.current) { mapRef.current?.removeLayer(userMarkerRef.current); userMarkerRef.current = null; }
            if (userCircleRef.current) { mapRef.current?.removeLayer(userCircleRef.current); userCircleRef.current = null; }
        }
    }, [mapTracking, addToast]);

    // ══════════════════════════════════════════
    //  UPDATE JUNCTIONS + INCIDENTS + DISPATCHES
    // ══════════════════════════════════════════
    useEffect(() => {
        const map = mapRef.current;
        const L = window.L;
        if (!map || !L || !mapData) return;

        const status = mapData.signal_status || {};
        const laneData = mapData.lane_data || {};
        const states = status.states || [];
        let greenCount = 0;

        for (let i = 0; i < 4; i++) {
            const info = laneData[i.toString()] || {};
            const count = info.count || 0;
            const density = info.density || 'LOW';
            const state = states[i] || 'RED';
            const ambulance = status.ambulance_mode;

            let color, heatColor, heatOpacity;
            if (ambulance) { color = '#ef4444'; heatColor = '#ef4444'; heatOpacity = 0.25; }
            else if (density === 'HIGH' || state === 'RED') { color = '#ef4444'; heatColor = '#ef4444'; heatOpacity = 0.2; }
            else if (density === 'MEDIUM' || state === 'YELLOW') { color = '#f59e0b'; heatColor = '#f59e0b'; heatOpacity = 0.15; }
            else { color = '#10b981'; heatColor = '#10b981'; heatOpacity = 0.1; greenCount++; }

            // Icon diff — only update DOM if color changed
            const cacheKey = `${i}-${color}`;
            if (junctionMarkersRef.current[i] && junctionStateRef.current[i] !== cacheKey) {
                junctionStateRef.current[i] = cacheKey;
                junctionMarkersRef.current[i].setIcon(L.divIcon({
                    className: '',
                    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 12px ${color};"></div>`,
                    iconSize: [18, 18], iconAnchor: [9, 9]
                }));
            }
            if (junctionMarkersRef.current[i]) {
                junctionMarkersRef.current[i].setPopupContent(
                    `<div style="font-family:Inter,sans-serif;color:#fff;"><b>${JUNCTION_NAMES[i]}</b><br>Signal: <span style="color:${color};font-weight:700;">${state}</span><br>Vehicles: <b>${count}</b><br>Density: <b>${density}</b></div>`
                );
            }
            if (heatZonesRef.current[i]) {
                heatZonesRef.current[i].setStyle({ fillColor: heatColor, fillOpacity: heatOpacity });
                heatZonesRef.current[i].setRadius(250 + Math.min(count * 10, 500));
                if (layers.heatmap && !map.hasLayer(heatZonesRef.current[i])) map.addLayer(heatZonesRef.current[i]);
                else if (!layers.heatmap && map.hasLayer(heatZonesRef.current[i])) map.removeLayer(heatZonesRef.current[i]);
            }
        }

        // Incidents
        (mapData.reports || []).forEach(r => {
            if (!r.latitude || !r.longitude) return;
            if (!incidentMkrsRef.current[r.id]) {
                const sc = r.status === 'Resolved' ? '#10b981' : r.status === 'Verified' ? '#f59e0b' : '#ef4444';
                incidentMkrsRef.current[r.id] = L.marker([r.latitude, r.longitude], {
                    icon: L.divIcon({ className: '', html: `<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:2px solid ${sc}60;background:${sc}30;color:${sc};font-size:14px;animation:incidentPulse 1.5s infinite;">⚠</div>`, iconSize: [28, 28], iconAnchor: [14, 14] })
                }).bindPopup(`<b style="color:${sc}">Incident #${r.id}</b><br>${r.location}<br>Status: ${r.status}`);
                if (layers.incidents) incidentMkrsRef.current[r.id].addTo(map);
                if (!knownReportIds.current.has(r.id)) { knownReportIds.current.add(r.id); addFeed('incident', `Incident at ${r.location}`); }
            } else {
                if (layers.incidents && !map.hasLayer(incidentMkrsRef.current[r.id])) incidentMkrsRef.current[r.id].addTo(map);
                else if (!layers.incidents && map.hasLayer(incidentMkrsRef.current[r.id])) map.removeLayer(incidentMkrsRef.current[r.id]);
            }
        });

        // Dispatches
        (mapData.dispatches || []).forEach(d => {
            if (!dispatchLinesRef.current[d.id] && d.hospital_lat && d.hospital_lng && d.accident_lat && d.accident_lng) {
                dispatchLinesRef.current[d.id] = L.polyline([[d.hospital_lat, d.hospital_lng], [d.accident_lat, d.accident_lng]], { color: '#3b82f6', weight: 3, dashArray: '8,8', opacity: 0.7 });
                dispatchHospRef.current[d.id] = L.marker([d.hospital_lat, d.hospital_lng], {
                    icon: L.divIcon({ className: '', html: `<div style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:8px;border:2px solid rgba(59,130,246,0.8);background:rgba(59,130,246,0.2);color:#3b82f6;font-size:12px;">🏥</div>`, iconSize: [26, 26], iconAnchor: [13, 13] })
                }).bindPopup(`<b style="color:#3b82f6">${d.hospital_name}</b><br>${d.status}`);
                if (layers.dispatches) { dispatchLinesRef.current[d.id].addTo(map); dispatchHospRef.current[d.id].addTo(map); }
                if (!knownDispatchIds.current.has(d.id)) { knownDispatchIds.current.add(d.id); addFeed('dispatch', `Ambulance from ${d.hospital_name}`); }
            }
        });

        if (status.ambulance_mode && !prevAmbulance.current) addFeed('emergency', 'EMERGENCY: Ambulance detected!');
        else if (!status.ambulance_mode && prevAmbulance.current) addFeed('signal', 'Emergency mode deactivated.');
        prevAmbulance.current = !!status.ambulance_mode;

        setHudStats({
            vehicles: mapData.summary?.total_vehicles || 0,
            incidents: mapData.summary?.active_incidents || 0,
            dispatches: mapData.summary?.active_dispatches || 0,
            greenLanes: greenCount,
            keralaCount: keralaLoadedRef.current ? keralaDataRef.current.length : '—'
        });
    }, [mapData, layers, addFeed]);

    // Junction labels toggle
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        Object.values(labelTipsRef.current).forEach(t => {
            if (layers.junctionLabels && !map.hasLayer(t)) t.addTo(map);
            else if (!layers.junctionLabels && map.hasLayer(t)) map.removeLayer(t);
        });
    }, [layers.junctionLabels]);

    // ══════════════════════════════════════════
    //  KERALA SIGNALS
    // ══════════════════════════════════════════
    const loadKeralaSignals = useCallback(async (map, L) => {
        if (keralaLoadedRef.current) { if (keralaClusterRef.current && !map.hasLayer(keralaClusterRef.current)) map.addLayer(keralaClusterRef.current); return; }
        setKeralaLoading(true);
        addFeed('signal', 'Loading Kerala signals from OSM...');
        const query = `[out:json][timeout:90];(node["highway"="traffic_signals"](8.17,74.85,12.79,77.42);node["crossing"="traffic_signals"](8.17,74.85,12.79,77.42);node["highway"="mini_roundabout"](8.17,74.85,12.79,77.42);node["junction"](8.17,74.85,12.79,77.42););out body;`;
        try {
            const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(query), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
            const data = await res.json();
            if (!data.elements?.length) { addFeed('signal', 'No signals found.'); setKeralaLoading(false); return; }
            let major = 0, std = 0, minor = 0;
            const signals = data.elements.map(el => {
                const jt = classifyJunction(el);
                if (jt === 'MAJOR') major++; else if (jt === 'STANDARD') std++; else minor++;
                const p = TIMING_PROFILES[jt]?.[getCurrentMode()];
                const tc = p ? p.GREEN + p.YELLOW + p.RED : 70;
                let name = el.tags?.name || el.tags?.['name:en'] || '';
                if (!name) name = `${(el.tags?.highway || '') === 'traffic_signals' ? 'Signal' : 'Junction'} #${el.id}`;
                return { id: el.id, lat: el.lat, lng: el.lon, name, junctionType: jt, offset: el.id % tc };
            });
            keralaDataRef.current = signals;
            if (window.L.markerClusterGroup) {
                const cluster = window.L.markerClusterGroup({ maxClusterRadius: 50, disableClusteringAtZoom: 16 });
                signals.forEach(sig => {
                    const s = getSignalState(sig);
                    const bg = s.state === 'GREEN' ? '#10b981' : s.state === 'YELLOW' ? '#f59e0b' : s.state === 'BLINK_YELLOW' ? '#f59e0b' : '#ef4444';
                    const marker = L.marker([sig.lat, sig.lng], { icon: L.divIcon({ className: '', html: `<div style="width:14px;height:14px;border-radius:50%;border:2px solid rgba(255,255,255,0.6);box-shadow:0 0 8px ${bg};background:${bg};"></div>`, iconSize: [14, 14], iconAnchor: [7, 7] }) })
                        .bindPopup(`<div style="text-align:center;font-family:Inter,sans-serif;color:#fff;min-width:140px;"><b>${sig.name}</b><br><small>${sig.junctionType}</small><br><span style="color:${s.color};font-weight:700;">${s.state}</span>${s.remaining ? `<br>${s.remaining}s` : ''}</div>`);
                    sig._marker = marker;
                    cluster.addLayer(marker);
                });
                keralaClusterRef.current = cluster;
                map.addLayer(cluster);
                keralaLoadedRef.current = true;
                setHudStats(prev => ({ ...prev, keralaCount: signals.length }));
                setKeralaInfo({ total: signals.length, major, std, minor, mode: getCurrentMode() });
                addFeed('signal', `${signals.length} Kerala signals loaded`);
                map.flyTo([10.5, 76.3], 8, { animate: true, duration: 2 });
                signalTickRef.current = setInterval(() => {
                    keralaDataRef.current.forEach(sig => {
                        if (!sig._marker?._icon) return;
                        const s = getSignalState(sig);
                        const pin = sig._marker._icon.querySelector('div');
                        if (pin) { pin.style.background = s.color; pin.style.boxShadow = `0 0 8px ${s.color}`; }
                    });
                }, 1000);
            }
        } catch (err) { addFeed('incident', 'Failed to load Kerala signals.'); }
        setKeralaLoading(false);
    }, [addFeed]);

    useEffect(() => {
        const map = mapRef.current; const L = window.L;
        if (!map || !L) return;
        if (layers.keralaSignals) loadKeralaSignals(map, L);
        else if (keralaClusterRef.current && map.hasLayer(keralaClusterRef.current)) map.removeLayer(keralaClusterRef.current);
    }, [layers.keralaSignals, loadKeralaSignals]);

    // ══════════════════════════════════════════
    //  ACTIONS
    // ══════════════════════════════════════════
    const reCenter = useCallback(() => {
        const map = mapRef.current;
        if (!map || !userLatRef.current) return;
        map.flyTo([userLatRef.current, userLngRef.current], 15, { animate: true, duration: 1 });
        addFeed('signal', 'Re-centered on your location.');
    }, [addFeed]);

    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) return;
        const map = mapRef.current;
        if (!map) return;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
            const data = await res.json();
            if (data.length) {
                map.flyTo([parseFloat(data[0].lat), parseFloat(data[0].lon)], 15, { animate: true, duration: 1.5 });
                addFeed('signal', `Found: ${data[0].display_name.split(',')[0]}`);
            } else addToast('Location not found', 'warning');
        } catch { addToast('Search failed', 'error'); }
    }, [searchQuery, addFeed, addToast]);

    // ══════════════════════════════════════════
    //  RENDER
    // ══════════════════════════════════════════
    const gpsColor = gpsAccuracy !== null ? (gpsAccuracy <= 20 ? '#10b981' : gpsAccuracy <= 100 ? '#f59e0b' : '#ef4444') : '#6b7280';

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 pb-12">
            <style>{`
                @keyframes locPulse { 0%{transform:scale(1);opacity:1} 100%{transform:scale(3.5);opacity:0} }
                @keyframes incidentPulse { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)} 50%{box-shadow:0 0 0 12px rgba(239,68,68,0)} }
                .junction-label-tooltip{background:rgba(7,11,20,0.85)!important;color:#f8fafc!important;border:1px solid rgba(59,130,246,0.3)!important;border-radius:6px!important;padding:4px 10px!important;font-size:0.7rem!important;font-weight:600!important;}
                .leaflet-popup-content-wrapper{background:rgba(7,11,20,0.92)!important;color:#fff!important;border:1px solid rgba(59,130,246,0.3)!important;border-radius:12px!important;}
                .leaflet-popup-tip{background:rgba(7,11,20,0.92)!important;}
            `}</style>

            {/* HUD */}
            <div className="flex flex-wrap gap-3 mb-4">
                {[
                    { label: 'Vehicles', val: hudStats.vehicles, color: '#0071EB', icon: Car },
                    { label: 'Incidents', val: hudStats.incidents, color: '#ef4444', icon: AlertTriangle },
                    { label: 'Dispatches', val: hudStats.dispatches, color: '#f59e0b', icon: Siren },
                    { label: 'Green Lanes', val: hudStats.greenLanes, color: '#10b981', icon: Activity },
                    { label: 'Kerala Signals', val: hudStats.keralaCount, color: '#8b5cf6', icon: TrafficCone },
                ].map((s, i) => (
                    <div key={i} className="px-4 py-2 bg-[#181818] border border-white/[0.06] rounded-xl flex items-center gap-3">
                        <s.icon className="w-4 h-4" style={{ color: s.color }} />
                        <div><div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{s.label}</div>
                            <div className="text-white font-bold text-lg leading-none">{s.val}</div></div>
                    </div>
                ))}
                {/* GPS accuracy badge */}
                <div className={`px-4 py-2 rounded-xl flex items-center gap-3 border`} style={{ background: gpsColor + '10', borderColor: gpsColor + '40' }}>
                    <Crosshair className="w-4 h-4" style={{ color: gpsColor }} />
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">GPS</div>
                        <div className="text-white font-bold text-lg leading-none">
                            {gpsStatus === 'acquiring' ? '...' : gpsStatus === 'denied' ? 'OFF' : gpsAccuracy !== null ? `±${gpsAccuracy}m` : '~IP'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
                {/* Control Panel */}
                <div className="bg-[#0a0a0a]/80 border border-white/[0.06] rounded-2xl p-4 space-y-4 backdrop-blur-md">

                    {/* Search */}
                    <div>
                        <h3 className="text-[11px] text-[#0071EB] uppercase tracking-[2px] font-bold mb-2 flex items-center gap-2"><Search className="w-3.5 h-3.5" /> Search</h3>
                        <div className="flex gap-1.5">
                            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                placeholder="Search any location..."
                                className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#0071EB] transition-colors" />
                            <button onClick={handleSearch} className="px-3 py-2 bg-[#0071EB]/20 border border-[#0071EB]/30 rounded-lg text-[#0071EB] hover:bg-[#0071EB]/30 transition-colors"><Search className="w-3.5 h-3.5" /></button>
                        </div>
                    </div>

                    {/* Layers */}
                    <div className="border-t border-white/[0.06] pt-3">
                        <h3 className="text-[11px] text-[#0071EB] uppercase tracking-[2px] font-bold mb-3 flex items-center gap-2"><Layers className="w-3.5 h-3.5" /> Layers</h3>
                        {[
                            { key: 'heatmap', label: 'Traffic Heatmap', icon: Thermometer },
                            { key: 'trafficLayer', label: 'Live Traffic', icon: Car },
                            { key: 'incidents', label: 'Incidents', icon: AlertTriangle },
                            { key: 'dispatches', label: 'Dispatch Routes', icon: Siren },
                            { key: 'junctionLabels', label: 'Junction Labels', icon: Tag },
                            { key: 'keralaSignals', label: 'Kerala Signals', icon: TrafficCone },
                        ].map(({ key, label, icon: Icon }) => (
                            <div key={key} className={`flex items-center justify-between py-1.5 ${layers[key] ? '' : 'opacity-50'}`}>
                                <div className="flex items-center gap-2 text-xs text-gray-300"><Icon className="w-3.5 h-3.5" /> {label}</div>
                                <div className="relative w-9 h-5 cursor-pointer" onClick={() => toggleLayer(key)}>
                                    <div className={`w-9 h-5 rounded-full border transition-all ${layers[key] ? 'bg-[#0071EB]/20 border-[#0071EB]' : 'bg-white/[0.08] border-white/[0.15]'}`} />
                                    <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${layers[key] ? 'left-4 bg-[#0071EB] shadow-[0_0_8px_rgba(0,113,235,0.5)]' : 'left-0.5 bg-gray-500'}`} />
                                </div>
                            </div>
                        ))}
                        {keralaLoading && <div className="text-[10px] text-[#0071EB] mt-1 animate-pulse">⏳ Loading Kerala signals...</div>}
                        {keralaInfo && <div className="text-[10px] text-gray-500 mt-1">✓ {keralaInfo.total} signals</div>}
                    </div>

                    {/* Map View */}
                    <div className="border-t border-white/[0.06] pt-3">
                        <h3 className="text-[11px] text-gray-500 uppercase tracking-[2px] font-bold mb-2 flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Map Style</h3>
                        <div className="grid grid-cols-2 gap-1.5">
                            {[
                                { key: 'colorful', label: 'Standard', icon: Globe },
                                { key: 'satellite', label: 'Satellite', icon: Satellite },
                                { key: 'terrain', label: 'Terrain', icon: Mountain },
                                { key: 'dark', label: 'Night', icon: Moon },
                            ].map(({ key, label, icon: Icon }) => (
                                <button key={key} onClick={() => setMapView(key)}
                                    className={`p-2 rounded-lg border text-[11px] font-semibold flex flex-col items-center gap-1 transition-all ${mapView === key ? 'bg-[#0071EB]/15 border-[#0071EB] text-[#0071EB]' : 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:bg-white/[0.06]'}`}>
                                    <Icon className="w-4 h-4" /> {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* GPS */}
                    <div className="border-t border-white/[0.06] pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-gray-300"><Navigation2 className="w-3.5 h-3.5" /> GPS Track</div>
                            <div className="relative w-9 h-5 cursor-pointer" onClick={() => setMapTracking(!mapTracking)}>
                                <div className={`w-9 h-5 rounded-full border transition-all ${mapTracking ? 'bg-[#10b981]/20 border-[#10b981]' : 'bg-white/[0.08] border-white/[0.15]'}`} />
                                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${mapTracking ? 'left-4 bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'left-0.5 bg-gray-500'}`} />
                            </div>
                        </div>
                        <button onClick={reCenter} className="w-full flex items-center justify-center gap-2 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-gray-300 hover:bg-[#0071EB]/10 hover:border-[#0071EB]/30 hover:text-[#0071EB] transition-all">
                            <Locate className="w-3.5 h-3.5" /> Re-center
                        </button>
                    </div>
                </div>

                {/* Map + Feed */}
                <div className="space-y-4">
                    <div className="relative bg-[#181818] border border-white/[0.06] rounded-2xl overflow-hidden" style={{ minHeight: '600px' }}>
                        <div ref={mapElRef} className="w-full" style={{ height: '600px' }} />
                        {/* Legend */}
                        <div className="absolute bottom-4 left-4 z-[500] bg-black/70 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/[0.1]">
                            <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">Legend</div>
                            <div className="space-y-1.5">
                                {[
                                    { color: '#10b981', label: 'Low / Green' },
                                    { color: '#f59e0b', label: 'Medium / Yellow' },
                                    { color: '#ef4444', label: 'High / Red' },
                                    { color: '#3b82f6', label: 'Dispatch', sq: true },
                                    { color: '#8b5cf6', label: 'Kerala Signal', sq: true },
                                ].map((l, i) => (
                                    <div key={i} className="flex items-center gap-2 text-[11px] text-gray-300">
                                        <div className={`w-3 h-3 ${l.sq ? 'rounded' : 'rounded-full'} border border-white/50`} style={{ background: l.color }} /> {l.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Event Feed */}
                    <div className="bg-[#0a0a0a]/80 border border-white/[0.06] rounded-2xl p-4 backdrop-blur-md max-h-[280px] overflow-hidden">
                        <h3 className="text-[11px] text-[#0071EB] uppercase tracking-[2px] font-bold mb-3 flex items-center gap-2"><Radio className="w-3.5 h-3.5" /> Live Feed</h3>
                        <div className="space-y-1.5 overflow-y-auto max-h-[200px] tv-scrollbar">
                            {eventFeed.map((e, i) => {
                                const bc = e.type === 'incident' ? '#ef4444' : e.type === 'dispatch' ? '#3b82f6' : e.type === 'emergency' ? '#f59e0b' : '#10b981';
                                return (
                                    <div key={i} className="p-2 rounded-lg text-xs" style={{ borderLeft: `3px solid ${bc}`, background: `${bc}08` }}>
                                        <div className="text-[10px] text-gray-500">{e.time}</div>
                                        <div className="text-gray-300">{e.msg}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
