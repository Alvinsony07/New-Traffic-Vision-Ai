import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain, Monitor, CloudRain, Save, Shield, CheckCircle2, AlertTriangle, Clock, User, Activity, Server, Trash2, Loader2, Sun, CloudSnow, CloudFog
} from 'lucide-react';
import { settingsApi } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function SettingsPage() {
    const [settings, setSettings] = useState({
        yolo_model: 'yolov8s',
        confidence_threshold: 45,
        ambulance_confidence: 65,
        low_density_green: 15,
        medium_density_green: 30,
        high_density_green: 45,
        dark_mode: true,
        voice_alerts: true,
        auto_dispatch: true,
        data_retention: '30_days',
        weather_condition: 'Clear'
    });

    const [auditLog, setAuditLog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [settingsRes, auditRes] = await Promise.all([
                    settingsApi.get(),
                    settingsApi.auditTrail({ per_page: 20 })
                ]);
                setSettings(prev => ({ ...prev, ...settingsRes }));
                setAuditLog(auditRes.entries || []);
            } catch (err) { console.error("Failed to load settings:", err); }
            finally { setLoading(false); }
        };
        fetchData();
    }, []);

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                ...settings,
                confidence_threshold: parseInt(settings.confidence_threshold),
                ambulance_confidence: parseInt(settings.ambulance_confidence),
                low_density_green: parseInt(settings.low_density_green),
                medium_density_green: parseInt(settings.medium_density_green),
                high_density_green: parseInt(settings.high_density_green),
            };
            await settingsApi.update(payload);
            addToast('Changes saved successfully', 'success');
            const auditRes = await settingsApi.auditTrail({ per_page: 20 });
            setAuditLog(auditRes.entries || []);
        } catch (err) {
            addToast(err.message || 'Save failed', 'error');
        } finally { setSaving(false); }
    };

    const handlePurge = async () => {
        if (window.confirm('⚠️ This will permanently delete ALL historical traffic data.\n\nAre you sure?')) {
            if (window.confirm('FINAL CONFIRMATION: This action cannot be undone.')) {
                try {
                    const res = await settingsApi.purgeData();
                    alert(`Purged ${res.purged.lane_stats} records and ${res.purged.vehicle_logs} logs.`);
                    const auditRes = await settingsApi.auditTrail({ per_page: 20 });
                    setAuditLog(auditRes.entries || []);
                } catch (err) { alert('Error purging data: ' + err.message); }
            }
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 rounded-full border-2 border-[#E50914]/20 border-t-[#E50914] animate-spin" />
                    <p className="text-[10px] text-gray-600 uppercase tracking-[0.3em] font-bold">Loading Settings</p>
                </div>
            </div>
        );
    }

    const weatherOptions = [
        { id: 'Clear', label: 'Clear Sky', desc: '1.0× Base Timer', icon: Sun, color: '#E87C03' },
        { id: 'Rain', label: 'Rainfall', desc: '1.25× Base Timer', icon: CloudRain, color: '#0071EB' },
        { id: 'Fog', label: 'Dense Fog', desc: '1.35× Base Timer', icon: CloudFog, color: '#9B59B6' },
        { id: 'Snow', label: 'Snowfall', desc: '1.50× Base Timer', icon: CloudSnow, color: '#46D369' },
    ];

    return (
        <div className="p-6 lg:p-8 pb-32 max-w-7xl mx-auto">


            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-white/[0.06] pb-6">
                <div>
                    <h1 className="text-3xl font-black tracking-[0.04em] text-white mb-1 flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
                        <Server className="text-[#E50914] w-7 h-7" />
                        SYSTEM SETTINGS
                    </h1>
                    <p className="text-gray-500 text-sm font-medium">Configure AI parameters, signal logic, weather simulation, and audit trails.</p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="mt-4 md:mt-0 px-6 py-2.5 bg-[#E50914] hover:bg-[#B20710] text-white font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(229,9,20,0.3)] text-sm tracking-wide"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                {/* AI Core */}
                <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-6 shadow-lg">
                    <h2 className="text-sm font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-widest">
                        <Brain className="text-[#0071EB] w-5 h-5" /> Core AI Parameters
                    </h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">YOLO Model</label>
                            <select
                                value={settings.yolo_model}
                                onChange={e => handleChange('yolo_model', e.target.value)}
                                className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:border-[#E50914]/50 outline-none text-sm"
                            >
                                <option value="yolov8n">YOLOv8 Nano (Fastest)</option>
                                <option value="yolov8s">YOLOv8 Small (Balanced)</option>
                                <option value="yolov8m">YOLOv8 Medium (High Accuracy)</option>
                                <option value="yolov8l">YOLOv8 Large (Max Precision)</option>
                            </select>
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Detection Confidence</label>
                                <span className="text-white font-mono text-sm font-bold">{settings.confidence_threshold}%</span>
                            </div>
                            <input type="range" min="10" max="100" value={settings.confidence_threshold}
                                onChange={e => handleChange('confidence_threshold', e.target.value)} className="w-full" />
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ambulance Confidence</label>
                                <span className="text-white font-mono text-sm font-bold">{settings.ambulance_confidence}%</span>
                            </div>
                            <input type="range" min="10" max="100" value={settings.ambulance_confidence}
                                onChange={e => handleChange('ambulance_confidence', e.target.value)} className="w-full" />
                        </div>
                    </div>
                </div>

                {/* Signal Timings */}
                <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-6 shadow-lg">
                    <h2 className="text-sm font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-widest">
                        <Activity className="text-[#46D369] w-5 h-5" /> Signal Timings
                    </h2>

                    <div className="space-y-5">
                        {[
                            { key: 'low_density_green', label: 'Low Density', color: '#46D369' },
                            { key: 'medium_density_green', label: 'Medium Density', color: '#E87C03' },
                            { key: 'high_density_green', label: 'High Density', color: '#E50914' },
                        ].map(({ key, label, color }) => (
                            <div key={key} className="flex items-center gap-4">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number" min="5" max="120"
                                            value={settings[key]}
                                            onChange={e => handleChange(key, e.target.value)}
                                            className="flex-1 bg-[#0a0a0a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white focus:border-[#E50914]/50 outline-none text-sm font-mono"
                                        />
                                        <span className="text-[10px] text-gray-600 uppercase tracking-wider font-bold shrink-0">sec</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Weather */}
                <div className="bg-[#181818] border border-[#0071EB]/15 rounded-2xl p-6 shadow-lg shadow-[#0071EB]/[0.02]">
                    <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-2 uppercase tracking-widest">
                        <CloudRain className="text-[#0071EB] w-5 h-5" /> Weather Simulation
                    </h2>
                    <p className="text-xs text-gray-500 mb-5">Simulate weather conditions. AI adjusts green-light times for traffic safety.</p>

                    <div className="grid grid-cols-2 gap-3">
                        {weatherOptions.map(w => {
                            const isSelected = settings.weather_condition === w.id;
                            return (
                                <button
                                    key={w.id}
                                    onClick={() => handleChange('weather_condition', w.id)}
                                    className={`p-4 rounded-xl border text-left transition-all ${isSelected
                                        ? 'border-current shadow-lg'
                                        : 'bg-[#0a0a0a] border-white/[0.06] text-gray-400 hover:border-white/[0.15]'}`}
                                    style={isSelected ? { backgroundColor: `${w.color}12`, borderColor: `${w.color}60`, color: w.color } : {}}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <w.icon className="w-4 h-4" />
                                        <span className="font-bold text-sm">{w.label}</span>
                                    </div>
                                    <div className="text-[10px] opacity-60 font-mono">{w.desc}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* UI & Integrations */}
                <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-6 shadow-lg">
                    <h2 className="text-sm font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-widest">
                        <Monitor className="text-[#9B59B6] w-5 h-5" /> System Preferences
                    </h2>

                    <div className="space-y-5">
                        {[
                            { key: 'dark_mode', label: 'Dark Mode', desc: 'Force dark theme globally' },
                            { key: 'auto_dispatch', label: 'Auto-Dispatch', desc: 'Auto-forward accident reports to drivers' },
                        ].map(({ key, label, desc }) => (
                            <div key={key} className="flex items-center justify-between">
                                <div>
                                    <div className="text-white font-semibold text-sm">{label}</div>
                                    <div className="text-xs text-gray-600">{desc}</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={settings[key]}
                                        onChange={e => handleChange(key, e.target.checked)} />
                                    <div className="w-10 h-5 bg-white/[0.08] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-500 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#E50914]/30 peer-checked:after:bg-[#E50914]"></div>
                                </label>
                            </div>
                        ))}

                        <div className="pt-4 border-t border-white/[0.06]">
                            <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">Data Retention</label>
                            <select
                                value={settings.data_retention}
                                onChange={e => handleChange('data_retention', e.target.value)}
                                className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:border-[#E50914]/50 outline-none text-sm"
                            >
                                <option value="7_days">7 Days</option>
                                <option value="30_days">30 Days</option>
                                <option value="90_days">90 Days</option>
                                <option value="forever">Never Delete</option>
                            </select>
                        </div>

                        <button onClick={handlePurge}
                            className="w-full py-3 rounded-xl border border-[#E50914]/25 text-[#E50914] font-bold hover:bg-[#E50914]/10 transition-all flex justify-center items-center gap-2 text-sm">
                            <Trash2 className="w-4 h-4" /> Purge Historical Data
                        </button>
                    </div>
                </div>
            </div>

            {/* Audit Trail */}
            <div className="bg-[#181818] border border-white/[0.06] rounded-2xl overflow-hidden shadow-lg">
                <div className="p-5 border-b border-white/[0.04] bg-white/[0.01]">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest">
                        <Shield className="text-[#E87C03] w-5 h-5" /> Admin Audit Trail
                    </h2>
                </div>

                <div className="overflow-x-auto tv-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-[#0d0d0d] text-[9px] uppercase text-gray-600 tracking-widest">
                            <tr>
                                <th className="px-5 py-3 font-bold">Timestamp</th>
                                <th className="px-5 py-3 font-bold">Admin</th>
                                <th className="px-5 py-3 font-bold">Action</th>
                                <th className="px-5 py-3 font-bold w-1/3">Details</th>
                                <th className="px-5 py-3 font-bold">IP Address</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03] text-sm">
                            {auditLog.length === 0 ? (
                                <tr><td colSpan="5" className="px-5 py-10 text-center text-gray-600 text-sm">No audit events recorded.</td></tr>
                            ) : auditLog.map(log => {
                                const badgeColor = log.action.includes('override')
                                    ? 'bg-[#E87C03]/10 text-[#E87C03] border-[#E87C03]/20'
                                    : log.action.includes('settings')
                                        ? 'bg-[#0071EB]/10 text-[#0071EB] border-[#0071EB]/20'
                                        : log.action.includes('purge')
                                            ? 'bg-[#E50914]/10 text-[#E50914] border-[#E50914]/20'
                                            : 'bg-[#46D369]/10 text-[#46D369] border-[#46D369]/20';
                                return (
                                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">{log.timestamp}</td>
                                        <td className="px-5 py-3 text-white font-medium text-sm">{log.user}</td>
                                        <td className="px-5 py-3">
                                            <span className={`px-3 py-1 text-[9px] font-bold rounded-md uppercase tracking-wider border ${badgeColor}`}>
                                                {log.action.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-gray-500 max-w-sm truncate text-xs">{log.details || '—'}</td>
                                        <td className="px-5 py-3 text-gray-600 font-mono text-[11px]">{log.ip || '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
