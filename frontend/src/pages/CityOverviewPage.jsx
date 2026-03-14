import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { analytics } from '../api/client';
import { useToast } from '../context/ToastContext';
import {
    MapPin, Satellite, Car, Crosshair, AlertTriangle, Siren, Activity,
    Navigation, Layers, RefreshCw, Eye, EyeOff, Radio, Thermometer,
    Tag, TrafficCone, Globe, Moon, Mountain
} from 'lucide-react';

// Junction offsets around user location (matching old project)
const OFFSETS = [
    { dlat: 0.004, dlng: 0.004 },
    { dlat: 0.004, dlng: -0.004 },
    { dlat: -0.004, dlng: 0.004 },
    { dlat: -0.004, dlng: -0.004 }
];
const JUNCTION_NAMES = ['Lane 01 Zone', 'Lane 02 Zone', 'Lane 03 Zone', 'Lane 04 Zone'];

// Kerala signal timing profiles (IRC:93-1985)
const TIMING_PROFILES = {
    MAJOR: { PEAK: { GREEN: 55, YELLOW: 5, RED: 50 }, NORMAL: { GREEN: 40, YELLOW: 4, RED: 35 }, NIGHT: { GREEN: 30, YELLOW: 4, RED: 20 }, LATE_NIGHT: null },
    STANDARD: { PEAK: { GREEN: 45, YELLOW: 4, RED: 40 }, NORMAL: { GREEN: 35, YELLOW: 4, RED: 30 }, NIGHT: { GREEN: 25, YELLOW: 3, RED: 18 }, LATE_NIGHT: null },
    MINOR: { PEAK: { GREEN: 35, YELLOW: 3, RED: 30 }, NORMAL: { GREEN: 25, YELLOW: 3, RED: 22 }, NIGHT: { GREEN: 20, YELLOW: 3, RED: 15 }, LATE_NIGHT: null }
};

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
    const hash = el.id % 100;
    return hash < 15 ? 'MAJOR' : hash < 55 ? 'STANDARD' : 'MINOR';
}

function getSignalState(sig) {
    const mode = getCurrentMode();
    const profile = TIMING_PROFILES[sig.junctionType]?.[mode];
    if (!profile) return { state: 'BLINK_YELLOW', remaining: 0, color: '#f59e0b', mode };
    const total = profile.GREEN + profile.YELLOW + profile.RED;
    const t = (Math.floor(Date.now() / 1000) + sig.offset) % total;
    if (t < profile.GREEN) return { state: 'GREEN', remaining: profile.GREEN - t, color: '#10b981', mode, total, profile };
    if (t < profile.GREEN + profile.YELLOW) return { state: 'YELLOW', remaining: profile.GREEN + profile.YELLOW - t, color: '#f59e0b', mode, total, profile };
    return { state: 'RED', remaining: total - t, color: '#ef4444', mode, total, profile };
}

const LAYER_KEY = 'trafficVisionAI_layerStates';
function loadLayerStates() {
    try { return JSON.parse(localStorage.getItem(LAYER_KEY)) || {}; } catch { return {}; }
}
function saveLayerStates(s) {
    try { localStorage.setItem(LAYER_KEY, JSON.stringify(s)); } catch {}
}

export default function CityOverviewPage() {
    const { addToast } = useToast();
    const [mapData, setMapData] = useState(null);
    const [loading, setLoading] = useState(true);
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);
    const junctionMarkersRef = useRef({});
    const heatZonesRef = useRef({});
    const junctionLabelsRef = useRef({});
    const incidentMarkersRef = useRef({});
    const dispatchLinesRef = useRef({});
    const dispatchHospMarkersRef = useRef({});
    const userLatRef = useRef(null);
    const userLngRef = useRef(null);
    const junctionsRef = useRef([]);
    const knownReportIdsRef = useRef(new Set());
    const knownDispatchIdsRef = useRef(new Set());
    const prevAmbulanceRef = useRef(false);
    const keralaClusterRef = useRef(null);
    const keralaDataRef = useRef([]);
    const keralaLoadedRef = useRef(false);
    const signalTickRef = useRef(null);
    const userMarkerRef = useRef(null);
    const userCircleRef = useRef(null);
    const tileLayersRef = useRef({});
    const currentTileRef = useRef('colorful');

    // Layer toggle states
    const saved = loadLayerStates();
    const [layers, setLayers] = useState({
        heatmap: saved.heatmap ?? true,
        incidents: saved.incidents ?? true,
        dispatches: saved.dispatches ?? true,
        junctionLabels: saved.junctionLabels ?? true,
        keralaSignals: saved.keralaSignals ?? false
    });
    const [mapView, setMapView] = useState('colorful');
    const [mapTracking, setMapTracking] = useState(false);
    const [eventFeed, setEventFeed] = useState([{ time: 'System', msg: 'City Surveillance initialized. Acquiring GPS...', type: 'signal' }]);
    const [hudStats, setHudStats] = useState({ vehicles: 0, incidents: 0, dispatches: 0, greenLanes: 0, keralaCount: '—' });
    const [keralaLoading, setKeralaLoading] = useState(false);
    const [keralaInfo, setKeralaInfo] = useState(null);

    const addFeed = useCallback((type, msg) => {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setEventFeed(prev => [{ time, msg, type }, ...prev].slice(0, 30));
    }, []);

    const toggleLayer = useCallback((key) => {
        setLayers(prev => {
            const next = { ...prev, [key]: !prev[key] };
            saveLayerStates(next);
            return next;
        });
    }, []);

    // Fetch data
    const fetchMapData = useCallback(async () => {
        try {
            const res = await analytics.cityMap();
            setMapData(res);
        } catch {} finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchMapData();
        const interval = setInterval(fetchMapData, 3000);
        return () => clearInterval(interval);
    }, [fetchMapData]);

    // Initialize map
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;
        const L = window.L;
        if (!L) return;

        const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([20.5937, 78.9629], 5);
        L.control.zoom({ position: 'topright' }).addTo(map);

        const tiles = {
            colorful: L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { subdomains: '0123', maxZoom: 20 }),
            satellite: L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { subdomains: '0123', maxZoom: 20 }),
            terrain: L.tileLayer('https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', { subdomains: '0123', maxZoom: 20 }),
            dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd', maxZoom: 20 })
        };
        tiles.colorful.addTo(map);
        tileLayersRef.current = tiles;
        currentTileRef.current = 'colorful';
        mapInstanceRef.current = map;

        // GPS with fallback
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => initMapLocation(pos.coords.latitude, pos.coords.longitude, map, L),
                () => {
                    addFeed('signal', 'GPS denied — using network location...');
                    fetch('https://ipapi.co/json/').then(r => r.json()).then(d => {
                        initMapLocation(d.latitude, d.longitude, map, L);
                        addFeed('signal', 'Network location acquired.');
                    }).catch(() => {
                        initMapLocation(10.8505, 76.2711, map, L);
                        addFeed('signal', 'Using default coordinates (Kerala, India).');
                    });
                },
                { timeout: 8000 }
            );
        } else {
            initMapLocation(10.8505, 76.2711, map, L);
        }

        return () => {
            if (signalTickRef.current) clearInterval(signalTickRef.current);
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    const initMapLocation = useCallback((lat, lng, map, L) => {
        userLatRef.current = lat;
        userLngRef.current = lng;
        addFeed('signal', 'GPS lock acquired. Map centered on your location.');

        // Create junction markers around user
        const juncs = OFFSETS.map((o, i) => ({ id: i, lat: lat + o.dlat, lng: lng + o.dlng, name: JUNCTION_NAMES[i] }));
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

            junctionLabelsRef.current[j.id] = L.tooltip({
                permanent: true, direction: 'top', offset: [0, -14],
                className: 'junction-label-tooltip'
            }).setContent(`<b>${j.name}</b>`).setLatLng([j.lat, j.lng]);
            if (layers.junctionLabels) junctionLabelsRef.current[j.id].addTo(map);
        });

        map.flyTo([lat, lng], 15, { animate: true, duration: 1.8 });

        if (layers.keralaSignals) loadKeralaSignals(map, L);
    }, [addFeed, layers.heatmap, layers.junctionLabels, layers.keralaSignals]);

    // Switch map view
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;
        const tiles = tileLayersRef.current;
        const old = currentTileRef.current;
        if (old === mapView) return;
        if (tiles[old]) map.removeLayer(tiles[old]);
        if (tiles[mapView]) { tiles[mapView].addTo(map); if (tiles[mapView].bringToBack) tiles[mapView].bringToBack(); }
        currentTileRef.current = mapView;
        addFeed('signal', `Map view switched to ${mapView}.`);
    }, [mapView, addFeed]);

    // GPS tracking toggle
    useEffect(() => {
        const map = mapInstanceRef.current;
        const L = window.L;
        if (!map || !L) return;
        if (mapTracking) {
            navigator.geolocation?.getCurrentPosition((pos) => {
                const { latitude, longitude, accuracy } = pos.coords;
                if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);
                if (userCircleRef.current) map.removeLayer(userCircleRef.current);
                const locIcon = L.divIcon({
                    className: '',
                    html: `<div style="width:16px;height:16px;background:#fff;border-radius:50%;border:4px solid #0071EB;box-shadow:0 0 15px #0071EB;position:relative;">
                        <div style="position:absolute;top:-5px;left:-5px;right:-5px;bottom:-5px;border-radius:50%;border:2px solid #0071EB;animation:locPulse 1.5s infinite;"></div></div>`,
                    iconSize: [24, 24], iconAnchor: [12, 12]
                });
                userMarkerRef.current = L.marker([latitude, longitude], { icon: locIcon }).addTo(map)
                    .bindPopup(`<b>Your Location</b><br>Accuracy: ${Math.round(accuracy)}m<br>${latitude.toFixed(6)}, ${longitude.toFixed(6)}`).openPopup();
                userCircleRef.current = L.circle([latitude, longitude], accuracy / 2, {
                    color: '#0071EB', fillColor: '#0071EB', fillOpacity: 0.1, weight: 1, dashArray: '4, 4'
                }).addTo(map);
                map.flyTo([latitude, longitude], 16, { animate: true, duration: 1.2 });
                addFeed('signal', `GPS tracking active. Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`);
            }, () => {
                addToast('Location access denied', 'warning');
                setMapTracking(false);
            }, { enableHighAccuracy: true, timeout: 10000 });
        } else {
            if (userMarkerRef.current) { map.removeLayer(userMarkerRef.current); userMarkerRef.current = null; }
            if (userCircleRef.current) { map.removeLayer(userCircleRef.current); userCircleRef.current = null; }
        }
    }, [mapTracking, addToast, addFeed]);

    // Update junctions & markers from API data
    useEffect(() => {
        const map = mapInstanceRef.current;
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

            if (junctionMarkersRef.current[i]) {
                const icon = L.divIcon({
                    className: '',
                    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 12px ${color};"></div>`,
                    iconSize: [18, 18], iconAnchor: [9, 9]
                });
                junctionMarkersRef.current[i].setIcon(icon);
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

        // Update incidents
        const reports = mapData.reports || [];
        const currentIds = new Set();
        reports.forEach(r => {
            if (!r.latitude || !r.longitude) return;
            currentIds.add(r.id);
            if (!incidentMarkersRef.current[r.id]) {
                const sc = r.status === 'Resolved' ? '#10b981' : r.status === 'Verified' ? '#f59e0b' : '#ef4444';
                const icon = L.divIcon({
                    className: '',
                    html: `<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:2px solid ${sc}60;background:${sc}30;color:${sc};font-size:14px;animation:incidentPulse 1.5s infinite;">⚠</div>`,
                    iconSize: [28, 28], iconAnchor: [14, 14]
                });
                incidentMarkersRef.current[r.id] = L.marker([r.latitude, r.longitude], { icon })
                    .bindPopup(`<b style="color:${sc}">Incident #${r.id}</b><br>Location: <b>${r.location}</b><br>Status: ${r.status}<br>${r.description || ''}`);
                if (layers.incidents) incidentMarkersRef.current[r.id].addTo(map);
                if (!knownReportIdsRef.current.has(r.id)) {
                    knownReportIdsRef.current.add(r.id);
                    addFeed('incident', `New incident at ${r.location} (${r.status})`);
                }
            } else {
                if (layers.incidents && !map.hasLayer(incidentMarkersRef.current[r.id])) incidentMarkersRef.current[r.id].addTo(map);
                else if (!layers.incidents && map.hasLayer(incidentMarkersRef.current[r.id])) map.removeLayer(incidentMarkersRef.current[r.id]);
            }
        });

        // Update dispatches
        const dispatches = mapData.dispatches || [];
        const dIds = new Set();
        dispatches.forEach(d => {
            dIds.add(d.id);
            if (!dispatchLinesRef.current[d.id] && d.hospital_lat && d.hospital_lng && d.accident_lat && d.accident_lng) {
                dispatchLinesRef.current[d.id] = L.polyline(
                    [[d.hospital_lat, d.hospital_lng], [d.accident_lat, d.accident_lng]],
                    { color: '#3b82f6', weight: 3, dashArray: '8, 8', opacity: 0.7 }
                );
                const hIcon = L.divIcon({
                    className: '',
                    html: `<div style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:8px;border:2px solid rgba(59,130,246,0.8);background:rgba(59,130,246,0.2);color:#3b82f6;font-size:12px;">🏥</div>`,
                    iconSize: [26, 26], iconAnchor: [13, 13]
                });
                dispatchHospMarkersRef.current[d.id] = L.marker([d.hospital_lat, d.hospital_lng], { icon: hIcon })
                    .bindPopup(`<b style="color:#3b82f6">${d.hospital_name}</b><br>Status: ${d.status}<br>${d.distance_km ? d.distance_km.toFixed(1) + ' km' : ''}`);
                if (layers.dispatches) { dispatchLinesRef.current[d.id].addTo(map); dispatchHospMarkersRef.current[d.id].addTo(map); }
                if (!knownDispatchIdsRef.current.has(d.id)) {
                    knownDispatchIdsRef.current.add(d.id);
                    addFeed('dispatch', `Ambulance dispatched from ${d.hospital_name}`);
                }
            }
        });

        // Emergency check
        if (status.ambulance_mode && !prevAmbulanceRef.current) addFeed('emergency', 'EMERGENCY: Ambulance detected! Signal override active.');
        else if (!status.ambulance_mode && prevAmbulanceRef.current) addFeed('signal', 'Emergency mode deactivated.');
        prevAmbulanceRef.current = status.ambulance_mode;

        setHudStats({
            vehicles: mapData.summary?.total_vehicles || 0,
            incidents: mapData.summary?.active_incidents || 0,
            dispatches: mapData.summary?.active_dispatches || 0,
            greenLanes: greenCount,
            keralaCount: keralaLoadedRef.current ? keralaDataRef.current.length : '—'
        });
    }, [mapData, layers, addFeed]);

    // Layer toggle effects for junction labels
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;
        Object.values(junctionLabelsRef.current).forEach(t => {
            if (layers.junctionLabels && !map.hasLayer(t)) t.addTo(map);
            else if (!layers.junctionLabels && map.hasLayer(t)) map.removeLayer(t);
        });
    }, [layers.junctionLabels]);

    // Kerala signals loader
    const loadKeralaSignals = useCallback(async (map, L) => {
        if (keralaLoadedRef.current) {
            if (keralaClusterRef.current && !map.hasLayer(keralaClusterRef.current)) map.addLayer(keralaClusterRef.current);
            return;
        }
        setKeralaLoading(true);
        addFeed('signal', 'Querying OpenStreetMap for Kerala junction data...');
        const query = `[out:json][timeout:90];(node["highway"="traffic_signals"](8.17,74.85,12.79,77.42);node["crossing"="traffic_signals"](8.17,74.85,12.79,77.42);node["highway"="mini_roundabout"](8.17,74.85,12.79,77.42);node["junction"](8.17,74.85,12.79,77.42););out body;`;
        try {
            const res = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST', body: 'data=' + encodeURIComponent(query),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            const data = await res.json();
            if (!data.elements?.length) { addFeed('signal', 'No signals found.'); setKeralaLoading(false); return; }

            let major = 0, std = 0, minor = 0;
            const signals = data.elements.map(el => {
                const jt = classifyJunction(el);
                if (jt === 'MAJOR') major++; else if (jt === 'STANDARD') std++; else minor++;
                const mode = getCurrentMode();
                const p = TIMING_PROFILES[jt]?.[mode];
                const tc = p ? p.GREEN + p.YELLOW + p.RED : 70;
                let name = el.tags?.name || el.tags?.['name:en'] || '';
                if (!name) { const hw = el.tags?.highway || ''; name = `${hw === 'traffic_signals' ? 'Signal' : 'Junction'} #${el.id}`; }
                return { id: el.id, lat: el.lat, lng: el.lon, name, junctionType: jt, offset: el.id % tc };
            });
            keralaDataRef.current = signals;

            if (window.L.markerClusterGroup) {
                const cluster = window.L.markerClusterGroup({ maxClusterRadius: 50, disableClusteringAtZoom: 16 });
                signals.forEach(sig => {
                    const s = getSignalState(sig);
                    const sigClass = s.state === 'BLINK_YELLOW' ? 'background:#f59e0b;animation:blinkYellow 1s infinite;' :
                        s.state === 'GREEN' ? 'background:#10b981;' : s.state === 'YELLOW' ? 'background:#f59e0b;' : 'background:#ef4444;';
                    const icon = L.divIcon({
                        className: '',
                        html: `<div style="width:14px;height:14px;border-radius:50%;border:2px solid rgba(255,255,255,0.6);box-shadow:0 0 8px currentColor;${sigClass}"></div>`,
                        iconSize: [14, 14], iconAnchor: [7, 7]
                    });
                    const marker = L.marker([sig.lat, sig.lng], { icon })
                        .bindPopup(`<div style="text-align:center;font-family:Inter,sans-serif;color:#fff;min-width:160px;">
                            <b>${sig.name}</b><br><small>${sig.junctionType} Junction</small><br>
                            <span style="color:${s.color};font-weight:700;font-size:1.2em;">${s.state}</span>
                            ${s.remaining ? `<br>${s.remaining}s remaining` : ''}</div>`);
                    sig._marker = marker;
                    cluster.addLayer(marker);
                });
                keralaClusterRef.current = cluster;
                map.addLayer(cluster);
                keralaLoadedRef.current = true;
                setHudStats(prev => ({ ...prev, keralaCount: signals.length }));
                setKeralaInfo({ total: signals.length, major, std, minor, mode: getCurrentMode() });
                addFeed('signal', `Loaded ${signals.length} Kerala signals. [${major} Major | ${std} Standard | ${minor} Minor]`);
                map.flyTo([10.5, 76.3], 8, { animate: true, duration: 2 });

                // Start ticker
                signalTickRef.current = setInterval(() => {
                    if (!keralaClusterRef.current || !map.hasLayer(keralaClusterRef.current)) return;
                    keralaDataRef.current.forEach(sig => {
                        if (!sig._marker?._icon) return;
                        const s = getSignalState(sig);
                        const pin = sig._marker._icon.querySelector('div');
                        if (pin) {
                            pin.style.background = s.color;
                            pin.style.boxShadow = `0 0 8px ${s.color}`;
                        }
                        if (sig._marker.isPopupOpen()) {
                            sig._marker.setPopupContent(`<div style="text-align:center;font-family:Inter,sans-serif;color:#fff;min-width:160px;">
                                <b>${sig.name}</b><br><small>${sig.junctionType}</small><br>
                                <span style="color:${s.color};font-weight:700;font-size:1.2em;">${s.state}</span>
                                ${s.remaining ? `<br>${s.remaining}s remaining` : ''}</div>`);
                        }
                    });
                }, 1000);
            }
        } catch (err) {
            console.error('Kerala signals error:', err);
            addFeed('incident', 'Error loading Kerala signals.');
        }
        setKeralaLoading(false);
    }, [addFeed]);

    // Kerala toggle effect
    useEffect(() => {
        const map = mapInstanceRef.current;
        const L = window.L;
        if (!map || !L) return;
        if (layers.keralaSignals) {
            loadKeralaSignals(map, L);
        } else {
            if (keralaClusterRef.current && map.hasLayer(keralaClusterRef.current)) map.removeLayer(keralaClusterRef.current);
        }
    }, [layers.keralaSignals, loadKeralaSignals]);

    const flyToJunction = (id) => {
        const j = junctionsRef.current[id];
        const map = mapInstanceRef.current;
        if (j && map) {
            map.flyTo([j.lat, j.lng], 17, { animate: true, duration: 1.2 });
            setTimeout(() => junctionMarkersRef.current[id]?.openPopup(), 1200);
        }
    };

    const viewLabels = { colorful: 'Colorful', satellite: 'Satellite', terrain: 'Terrain', dark: 'Night Mode' };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 pb-12">
            <style>{`
                @keyframes locPulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(3.5); opacity: 0; } }
                @keyframes incidentPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 50% { box-shadow: 0 0 0 12px rgba(239,68,68,0); } }
                @keyframes blinkYellow { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
                .junction-label-tooltip { background:rgba(7,11,20,0.85)!important; color:#f8fafc!important; border:1px solid rgba(59,130,246,0.3)!important; border-radius:6px!important; padding:4px 10px!important; font-size:0.7rem!important; font-weight:600!important; }
                .leaflet-popup-content-wrapper { background:rgba(7,11,20,0.92)!important; color:#fff!important; border:1px solid rgba(59,130,246,0.3)!important; border-radius:12px!important; }
                .leaflet-popup-tip { background:rgba(7,11,20,0.92)!important; }
            `}</style>

            {/* Top HUD */}
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
                {/* Left Control Panel */}
                <div className="bg-[#0a0a0a]/80 border border-white/[0.06] rounded-2xl p-4 space-y-4 backdrop-blur-md">
                    {/* Junction Monitor */}
                    <div>
                        <h3 className="text-[11px] text-[#0071EB] uppercase tracking-[2px] font-bold mb-3 flex items-center gap-2"><Radio className="w-3.5 h-3.5" /> Junction Monitor</h3>
                        <div className="space-y-2">
                            {JUNCTION_NAMES.map((name, i) => {
                                const info = mapData?.lane_data?.[i.toString()] || {};
                                const state = mapData?.signal_status?.states?.[i] || '';
                                const color = state === 'GREEN' ? '#10b981' : state === 'YELLOW' ? '#f59e0b' : '#ef4444';
                                return (
                                    <div key={i} onClick={() => flyToJunction(i)}
                                        className="flex items-center gap-3 p-2.5 bg-white/[0.03] rounded-lg border border-white/[0.05] cursor-pointer hover:bg-[#0071EB]/[0.08] hover:border-[#0071EB]/20 transition-all">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-semibold text-white truncate">{name}</div>
                                            <div className="text-[10px] text-gray-500">{state} · {info.density || '—'}</div>
                                        </div>
                                        <div className="text-sm font-bold" style={{ color }}>{info.count || 0}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Layer Toggles */}
                    <div className="border-t border-white/[0.06] pt-3">
                        <h3 className="text-[11px] text-[#0071EB] uppercase tracking-[2px] font-bold mb-3 flex items-center gap-2"><Layers className="w-3.5 h-3.5" /> Map Layers</h3>
                        {[
                            { key: 'heatmap', label: 'Traffic Heatmap', icon: Thermometer },
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
                        {keralaInfo && <div className="text-[10px] text-gray-500 mt-1">✓ {keralaInfo.total} signals · Mode: {keralaInfo.mode}</div>}
                    </div>

                    {/* Map View Switcher */}
                    <div className="border-t border-white/[0.06] pt-3">
                        <h3 className="text-[11px] text-gray-500 uppercase tracking-[2px] font-bold mb-2 flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Map View</h3>
                        <div className="grid grid-cols-2 gap-1.5">
                            {[
                                { key: 'colorful', label: 'Colorful', icon: Globe },
                                { key: 'satellite', label: 'Satellite', icon: Satellite },
                                { key: 'terrain', label: 'Terrain', icon: Mountain },
                                { key: 'dark', label: 'Night', icon: Moon },
                            ].map(({ key, label, icon: Icon }) => (
                                <button key={key} onClick={() => setMapView(key)}
                                    className={`p-2 rounded-lg border text-[11px] font-semibold flex flex-col items-center gap-1 transition-all ${mapView === key
                                        ? 'bg-[#6366f1]/15 border-[#0071EB] text-[#0071EB]'
                                        : 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:bg-white/[0.06]'}`}>
                                    <Icon className="w-4 h-4" /> {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Track */}
                    <div className="border-t border-white/[0.06] pt-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-gray-300"><Crosshair className="w-3.5 h-3.5" /> GPS Track</div>
                            <div className="relative w-9 h-5 cursor-pointer" onClick={() => setMapTracking(!mapTracking)}>
                                <div className={`w-9 h-5 rounded-full border transition-all ${mapTracking ? 'bg-[#10b981]/20 border-[#10b981]' : 'bg-white/[0.08] border-white/[0.15]'}`} />
                                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${mapTracking ? 'left-4 bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'left-0.5 bg-gray-500'}`} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Map + Feed */}
                <div className="space-y-4">
                    <div className="relative bg-[#181818] border border-white/[0.06] rounded-2xl overflow-hidden" style={{ minHeight: '600px' }}>
                        <div ref={mapRef} className="w-full" style={{ height: '600px' }} />
                        {/* Legend */}
                        <div className="absolute bottom-4 left-4 z-[500] bg-black/70 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/[0.1]">
                            <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">Legend</div>
                            <div className="space-y-1.5">
                                {[
                                    { color: '#10b981', label: 'Low Traffic / Green' },
                                    { color: '#f59e0b', label: 'Medium / Yellow' },
                                    { color: '#ef4444', label: 'High / Red / Incident' },
                                    { color: '#3b82f6', label: 'Dispatch / Hospital', square: true },
                                    { color: '#8b5cf6', label: 'Kerala Signal (AI)', square: true },
                                ].map((l, i) => (
                                    <div key={i} className="flex items-center gap-2 text-[11px] text-gray-300">
                                        <div className={`w-3 h-3 ${l.square ? 'rounded' : 'rounded-full'} border border-white/50`} style={{ background: l.color }} /> {l.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Event Feed */}
                    <div className="bg-[#0a0a0a]/80 border border-white/[0.06] rounded-2xl p-4 backdrop-blur-md max-h-[280px] overflow-hidden">
                        <h3 className="text-[11px] text-[#0071EB] uppercase tracking-[2px] font-bold mb-3 flex items-center gap-2"><Radio className="w-3.5 h-3.5" /> Live Event Feed</h3>
                        <div className="space-y-1.5 overflow-y-auto max-h-[200px] tv-scrollbar">
                            {eventFeed.map((e, i) => {
                                const border = e.type === 'incident' ? '#ef4444' : e.type === 'dispatch' ? '#3b82f6' : e.type === 'emergency' ? '#f59e0b' : '#10b981';
                                return (
                                    <div key={i} className="p-2 rounded-lg text-xs" style={{ borderLeft: `3px solid ${border}`, background: `${border}08` }}>
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
