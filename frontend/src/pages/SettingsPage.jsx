import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Brain,
    Monitor,
    CloudRain,
    Save,
    Shield,
    CheckCircle2,
    AlertTriangle,
    Clock,
    User,
    Activity,
    Server,
    Trash2
} from 'lucide-react';
import { settingsApi } from '../api/client';

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
    const [saveStatus, setSaveStatus] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [settingsRes, auditRes] = await Promise.all([
                    settingsApi.get(),
                    settingsApi.auditTrail({ per_page: 20 })
                ]);

                // Merge loaded settings with default structure to prevent undefined
                setSettings(prev => ({ ...prev, ...settingsRes }));
                setAuditLog(auditRes.entries || []);
            } catch (err) {
                console.error("Failed to load settings:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveStatus(null);
        try {
            // Convert numerical values back before saving
            const payload = {
                ...settings,
                confidence_threshold: parseInt(settings.confidence_threshold),
                ambulance_confidence: parseInt(settings.ambulance_confidence),
                low_density_green: parseInt(settings.low_density_green),
                medium_density_green: parseInt(settings.medium_density_green),
                high_density_green: parseInt(settings.high_density_green),
            };

            await settingsApi.update(payload);
            setSaveStatus({ type: 'success', msg: 'Settings saved successfully' });

            // Reload audit trail to show save event
            const auditRes = await settingsApi.auditTrail({ per_page: 20 });
            setAuditLog(auditRes.entries || []);

            setTimeout(() => setSaveStatus(null), 3000);
        } catch (err) {
            setSaveStatus({ type: 'error', msg: err.message || 'Failed to save settings' });
            setTimeout(() => setSaveStatus(null), 5000);
        } finally {
            setSaving(false);
        }
    };

    const handlePurge = async () => {
        if (window.confirm('⚠️ WARNING: This will permanently delete ALL historical traffic data.\n\nAre you absolutely sure?')) {
            if (window.confirm('FINAL CONFIRMATION: Press OK to permanently delete all data. This cannot be undone.')) {
                try {
                    const res = await settingsApi.purgeData();
                    alert(`Success: Purged ${res.purged.lane_stats} records and ${res.purged.vehicle_logs} logs.`);
                    // Refresh audit trail
                    const auditRes = await settingsApi.auditTrail({ per_page: 20 });
                    setAuditLog(auditRes.entries || []);
                } catch (err) {
                    alert('Error purging data: ' + err.message);
                }
            }
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#e50914]"></div>
            </div>
        );
    }

    return (
        <div className="p-8 pb-32 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
                        <Server className="text-[#e50914] w-8 h-8" />
                        System Settings
                    </h1>
                    <p className="text-gray-400">Configure core AI paramaters, hardware logic, and monitor audit trails.</p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-[#e50914] hover:bg-red-700 text-white font-medium rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                    {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {/* Notification Toast */}
            {saveStatus && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 font-medium ${saveStatus.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                >
                    {saveStatus.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    {saveStatus.msg}
                </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                {/* AI Core Settings */}
                <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Brain className="text-blue-500 w-5 h-5" />
                        Core AI Parameters
                    </h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">YOLO Model Version</label>
                            <select
                                value={settings.yolo_model}
                                onChange={(e) => handleChange('yolo_model', e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#e50914] focus:outline-none"
                            >
                                <option value="yolov8n">YOLOv8 Nano (Fastest)</option>
                                <option value="yolov8s">YOLOv8 Small (Balanced)</option>
                                <option value="yolov8m">YOLOv8 Medium (High Accuracy)</option>
                                <option value="yolov8l">YOLOv8 Large (Max Precision)</option>
                            </select>
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-medium text-gray-400">Detection Confidence</label>
                                <span className="text-white font-mono">{settings.confidence_threshold}%</span>
                            </div>
                            <input
                                type="range"
                                min="10" max="100"
                                value={settings.confidence_threshold}
                                onChange={(e) => handleChange('confidence_threshold', e.target.value)}
                                className="w-full accent-[#e50914]"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-medium text-gray-400">Ambulance Confidence Threshold</label>
                                <span className="text-white font-mono">{settings.ambulance_confidence}%</span>
                            </div>
                            <input
                                type="range"
                                min="10" max="100"
                                value={settings.ambulance_confidence}
                                onChange={(e) => handleChange('ambulance_confidence', e.target.value)}
                                className="w-full accent-[#e50914]"
                            />
                        </div>
                    </div>
                </div>

                {/* Signal Timings */}
                <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Activity className="text-green-500 w-5 h-5" />
                        Default Signal Timings
                    </h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Low Density Green (Seconds)</label>
                            <input
                                type="number"
                                min="5" max="120"
                                value={settings.low_density_green}
                                onChange={(e) => handleChange('low_density_green', e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#e50914] focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Medium Density Green (Seconds)</label>
                            <input
                                type="number"
                                min="5" max="120"
                                value={settings.medium_density_green}
                                onChange={(e) => handleChange('medium_density_green', e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#e50914] focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">High Density Green (Seconds)</label>
                            <input
                                type="number"
                                min="5" max="120"
                                value={settings.high_density_green}
                                onChange={(e) => handleChange('high_density_green', e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#e50914] focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Weather & Simulation */}
                <div className="bg-[#111] border border-blue-500/20 rounded-2xl p-6 shadow-[0_0_30px_rgba(59,130,246,0.05)]">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <CloudRain className="text-blue-400 w-5 h-5" />
                        Weather-Adaptive Simulation
                    </h2>
                    <p className="text-sm text-gray-400 mb-6">
                        Simulate adverse weather conditions. The AI backend will automatically increase base green-light times to safely accommodate slower traffic.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { id: 'Clear', label: 'Clear', desc: '1.0x Base Time' },
                            { id: 'Rain', label: 'Rain', desc: '1.25x Base Time' },
                            { id: 'Fog', label: 'Fog', desc: '1.35x Base Time' },
                            { id: 'Snow', label: 'Snow', desc: '1.50x Base Time' }
                        ].map((weather) => (
                            <button
                                key={weather.id}
                                onClick={() => handleChange('weather_condition', weather.id)}
                                className={`p-4 rounded-xl border text-left transition-all ${settings.weather_condition === weather.id
                                        ? 'bg-blue-500/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] text-white'
                                        : 'bg-black border-white/10 text-gray-400 hover:border-white/30'
                                    }`}
                            >
                                <div className="font-bold mb-1">{weather.label}</div>
                                <div className="text-xs opacity-70">{weather.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* System Preferences */}
                <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Monitor className="text-purple-500 w-5 h-5" />
                        UI & Integrations
                    </h2>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-white font-medium">Dark Mode Enforcement</div>
                                <div className="text-sm text-gray-500">Force dark theme globally</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.dark_mode}
                                    onChange={(e) => handleChange('dark_mode', e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#e50914]"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-white font-medium">Automated Rescue Dispatch</div>
                                <div className="text-sm text-gray-500">Auto-forward accident streams</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.auto_dispatch}
                                    onChange={(e) => handleChange('auto_dispatch', e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#e50914]"></div>
                            </label>
                        </div>

                        <div className="pt-4 border-t border-white/10">
                            <label className="block text-sm font-medium text-gray-400 mb-2">Data Retention Policy</label>
                            <select
                                value={settings.data_retention}
                                onChange={(e) => handleChange('data_retention', e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#e50914] focus:outline-none"
                            >
                                <option value="7_days">Keep 7 days</option>
                                <option value="30_days">Keep 30 days</option>
                                <option value="90_days">Keep 90 days</option>
                                <option value="forever">Never Delete</option>
                            </select>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={handlePurge}
                                className="w-full py-3 rounded-lg border border-red-500/30 text-red-500 font-medium hover:bg-red-500/10 transition-colors flex justify-center items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Purge Historical Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Audit Trail */}
            <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Shield className="text-amber-500 w-5 h-5" />
                        Admin Audit Trail
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-black/50 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Timestamp</th>
                                <th className="px-6 py-4 font-semibold">Admin</th>
                                <th className="px-6 py-4 font-semibold">Action</th>
                                <th className="px-6 py-4 font-semibold w-1/3">Details</th>
                                <th className="px-6 py-4 font-semibold">IP Address</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {auditLog.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                        No audit events recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                auditLog.map((log) => {
                                    const badgeColor = log.action.includes('override')
                                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                        : log.action.includes('settings')
                                            ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                            : log.action.includes('purge')
                                                ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                                : 'bg-green-500/10 text-green-500 border border-green-500/20';

                                    return (
                                        <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4 text-gray-400 whitespace-nowrap flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5" />
                                                {log.timestamp}
                                            </td>
                                            <td className="px-6 py-4 text-white font-medium flex items-center gap-2">
                                                <User className="w-3.5 h-3.5 text-gray-500" />
                                                {log.user}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${badgeColor}`}>
                                                    {log.action.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-400 max-w-sm truncate">
                                                {log.details || '—'}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                                {log.ip || '—'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
