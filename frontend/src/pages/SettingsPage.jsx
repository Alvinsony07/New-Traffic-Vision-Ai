import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { settingsApi, usersApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import {
    Settings, Save, Users, Shield, Trash2, Lock, Unlock, Eye, Volume2,
    Brain, Gauge, Database, AlertTriangle, RefreshCw, Clock, TrafficCone,
    ChevronDown, ChevronUp, Monitor
} from 'lucide-react';

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
        weather_condition: 'Clear',
    });
    const [users, setUsers] = useState([]);
    const [auditLog, setAuditLog] = useState([]);
    const [activeTab, setActiveTab] = useState('system');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [purging, setPurging] = useState(false);
    const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
    const { addToast } = useToast();

    // Load everything on mount (matching old project behavior)
    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [settingsRes, usersRes, auditRes] = await Promise.all([
                    settingsApi.get().catch(() => null),
                    usersApi.list().catch(() => ({ users: [] })),
                    settingsApi.auditTrail({ per_page: 20 }).catch(() => ({ entries: [] }))
                ]);
                // Merge API settings over defaults
                if (settingsRes) {
                    const loaded = settingsRes.settings || settingsRes;
                    setSettings(prev => ({ ...prev, ...loaded }));
                }
                setUsers(usersRes.users || []);
                setAuditLog(auditRes.entries || []);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchAll();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await settingsApi.update(settings);
            addToast('Settings saved successfully', 'success');
            // Reload audit trail to show the settings_changed entry
            try {
                const auditRes = await settingsApi.auditTrail({ per_page: 20 });
                setAuditLog(auditRes.entries || []);
            } catch {}
        } catch (err) { addToast('Failed to save: ' + err.message, 'error'); }
        finally { setSaving(false); }
    };

    const handlePurge = async () => {
        setPurging(true);
        try {
            const res = await settingsApi.purgeData();
            if (res.purged) {
                addToast(`Purged ${res.purged.lane_stats} records + ${res.purged.vehicle_logs} logs`, 'success');
            } else {
                addToast('All traffic data purged successfully', 'success');
            }
            setShowPurgeConfirm(false);
            // Refresh audit trail
            try {
                const auditRes = await settingsApi.auditTrail({ per_page: 20 });
                setAuditLog(auditRes.entries || []);
            } catch {}
        } catch (err) { addToast('Purge failed: ' + err.message, 'error'); }
        finally { setPurging(false); }
    };

    const handleDeleteUser = async (id) => {
        if (!confirm('Delete this user permanently?')) return;
        try {
            await usersApi.delete(id);
            setUsers(prev => prev.filter(u => u.id !== id));
            addToast('User deleted', 'success');
        } catch (err) { addToast(err.message, 'error'); }
    };

    const handleToggleLock = async (id) => {
        try {
            const res = await usersApi.toggleLock(id);
            setUsers(prev => prev.map(u => u.id === id ? { ...u, is_locked: res.is_locked } : u));
            addToast(res.is_locked ? 'User locked' : 'User unlocked', 'success');
        } catch (err) { addToast(err.message, 'error'); }
    };

    const handleChangeRole = async (id, role) => {
        try {
            await usersApi.changeRole(id, role);
            setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
            addToast('Role updated', 'success');
        } catch (err) { addToast(err.message, 'error'); }
    };

    const updateSetting = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

    const tabs = [
        { id: 'system', label: 'System', icon: Settings },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'audit', label: 'Audit Trail', icon: Clock },
        { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
    ];

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <div className="w-12 h-12 border-2 border-[#E50914]/20 border-t-[#E50914] rounded-full animate-spin" />
        </div>
    );

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 pb-12">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-black tracking-[0.04em] text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                        GLOBAL SETTINGS
                    </h2>
                    <p className="text-gray-500 text-sm">System configuration, user management, and audit trail.</p>
                </div>
                {activeTab === 'system' && (
                    <button onClick={handleSave} disabled={saving}
                        className="px-5 py-2.5 bg-[#46D369] hover:bg-[#3bb85a] text-white font-bold rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(70,211,105,0.3)] disabled:opacity-50">
                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-[#0a0a0a] rounded-xl p-1 mb-6 border border-white/[0.06] w-fit">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-white/[0.08] text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                        <tab.icon className="w-4 h-4" /> {tab.label}
                    </button>
                ))}
            </div>

            {/* System Settings Tab */}
            {activeTab === 'system' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Core AI Parameters — matching old project exactly */}
                    <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-white mb-5 pb-3 border-b border-white/[0.05] flex items-center gap-2">
                            <Brain className="w-4 h-4 text-[#10b981]" /> Core AI Parameters
                        </h3>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">YOLO Model Version</label>
                                <select value={settings.yolo_model || 'yolov8s'}
                                    onChange={e => updateSetting('yolo_model', e.target.value)}
                                    className="w-full bg-black/20 border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#0071EB] transition-colors">
                                    <option value="yolov8n">YOLOv8 Nano (Fastest)</option>
                                    <option value="yolov8s">YOLOv8 Small (Balanced)</option>
                                    <option value="yolov8m">YOLOv8 Medium (High Accuracy)</option>
                                    <option value="yolov8l">YOLOv8 Large (Max Precision)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Detection Confidence Threshold</label>
                                <div className="flex items-center gap-3">
                                    <input type="range" min="10" max="100" step="5"
                                        value={settings.confidence_threshold || 45}
                                        onChange={e => updateSetting('confidence_threshold', parseInt(e.target.value))}
                                        className="flex-1 accent-[#0071EB]" />
                                    <span className="text-white font-mono text-sm w-12 text-right">{settings.confidence_threshold || 45}%</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Ambulance Emergency Priority Confidence</label>
                                <div className="flex items-center gap-3">
                                    <input type="range" min="10" max="100" step="5"
                                        value={settings.ambulance_confidence || 65}
                                        onChange={e => updateSetting('ambulance_confidence', parseInt(e.target.value))}
                                        className="flex-1 accent-[#E50914]" />
                                    <span className="text-white font-mono text-sm w-12 text-right">{settings.ambulance_confidence || 65}%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Default Signal Timings — matching old project */}
                    <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-white mb-5 pb-3 border-b border-white/[0.05] flex items-center gap-2">
                            <Gauge className="w-4 h-4 text-[#f59e0b]" /> Default Signal Timings
                        </h3>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Low Density Green Time (seconds)</label>
                                <input type="number" min="5" max="120"
                                    value={settings.low_density_green || 15}
                                    onChange={e => updateSetting('low_density_green', parseInt(e.target.value))}
                                    className="w-full bg-black/20 border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#0071EB] transition-colors" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Medium Density Green Time (seconds)</label>
                                <input type="number" min="5" max="120"
                                    value={settings.medium_density_green || 30}
                                    onChange={e => updateSetting('medium_density_green', parseInt(e.target.value))}
                                    className="w-full bg-black/20 border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#0071EB] transition-colors" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">High Density Green Time (seconds)</label>
                                <input type="number" min="5" max="120"
                                    value={settings.high_density_green || 45}
                                    onChange={e => updateSetting('high_density_green', parseInt(e.target.value))}
                                    className="w-full bg-black/20 border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#0071EB] transition-colors" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Weather Condition (Adjusts Signal Timing)</label>
                                <select value={settings.weather_condition || 'Clear'}
                                    onChange={e => updateSetting('weather_condition', e.target.value)}
                                    className="w-full bg-black/20 border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#0071EB] transition-colors">
                                    <option value="Clear">☀️ Clear (1.0x timing)</option>
                                    <option value="Rain">🌧️ Rain (1.25x timing)</option>
                                    <option value="Fog">🌫️ Fog (1.35x timing)</option>
                                    <option value="Snow">❄️ Snow (1.5x timing)</option>
                                </select>
                                <p className="text-xs text-gray-600 mt-1">Adverse weather increases green time for safer traffic flow.</p>
                            </div>
                        </div>
                    </div>

                    {/* UI & Notifications — matching old project */}
                    <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-white mb-5 pb-3 border-b border-white/[0.05] flex items-center gap-2">
                            <Monitor className="w-4 h-4 text-[#9B59B6]" /> UI & Notifications
                        </h3>
                        <div className="space-y-1">
                            {[
                                { key: 'dark_mode', label: 'Dark Mode Enforcement', desc: 'Force dark theme across all system pages', icon: Eye },
                                { key: 'voice_alerts', label: 'Voice Alerts', desc: 'Synthesized voice alerts for emergencies', icon: Volume2 },
                                { key: 'auto_dispatch', label: 'Automated Dispatch', desc: 'Forward accident logs to ambulances automatically', icon: Shield },
                            ].map(s => (
                                <div key={s.key} className="flex items-center justify-between py-3 border-b border-white/[0.03] last:border-b-0">
                                    <div>
                                        <div className="text-sm text-white font-medium">{s.label}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">{s.desc}</div>
                                    </div>
                                    <div className="relative cursor-pointer" onClick={() => updateSetting(s.key, !settings[s.key])}>
                                        <div className={`w-11 h-6 rounded-full border transition-all ${settings[s.key] !== false ? 'bg-[#0071EB]/20 border-[#0071EB]/50' : 'bg-white/[0.1] border-white/[0.2]'}`} />
                                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${settings[s.key] !== false ? 'left-6 bg-[#0071EB] shadow-[0_0_8px_rgba(0,113,235,0.5)]' : 'left-1 bg-gray-500'}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Database & Integrations — matching old project */}
                    <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-white mb-5 pb-3 border-b border-white/[0.05] flex items-center gap-2">
                            <Database className="w-4 h-4 text-[#E50914]" /> Database & Integrations
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Data Retention Policy</label>
                                <select value={settings.data_retention || '30_days'}
                                    onChange={e => updateSetting('data_retention', e.target.value)}
                                    className="w-full bg-black/20 border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#0071EB] transition-colors">
                                    <option value="7_days">Keep 7 days</option>
                                    <option value="30_days">Keep 30 days</option>
                                    <option value="90_days">Keep 90 days</option>
                                    <option value="forever">Never Delete</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Database Status</label>
                                <div className="flex items-center gap-2 px-3 py-2.5 bg-[#10b981]/[0.08] border border-[#10b981]/20 rounded-lg">
                                    <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                                    <span className="text-sm text-[#10b981] font-semibold">PostgreSQL Active — Connected</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
                <div className="bg-[#181818] border border-white/[0.06] rounded-2xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-white/[0.03] border-b border-white/[0.06]">
                                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-5 py-3">User</th>
                                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-5 py-3">Role</th>
                                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-5 py-3">Status</th>
                                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-5 py-3">Joined</th>
                                <th className="text-right text-xs font-bold text-gray-400 uppercase tracking-widest px-5 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-12 text-gray-500 text-sm">No users found.</td></tr>
                            ) : users.map(u => (
                                <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-[#0071EB]/10 flex items-center justify-center text-[#0071EB] font-bold text-sm">
                                                {u.username[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white">{u.username}</div>
                                                <div className="text-xs text-gray-500">{u.full_name || ''}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <select value={u.role} onChange={e => handleChangeRole(u.id, e.target.value)}
                                            className="bg-[#2a2a2a] border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-white focus:outline-none">
                                            <option value="admin">Admin</option>
                                            <option value="user">User</option>
                                            <option value="ambulance_driver">Ambulance Driver</option>
                                        </select>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className={`text-[10px] font-black uppercase tracking-widest py-1 px-3 rounded-md ${u.is_locked ? 'bg-[#E50914]/10 text-[#E50914]' : 'bg-[#46D369]/10 text-[#46D369]'}`}>
                                            {u.is_locked ? 'Locked' : 'Active'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-sm text-gray-400 font-mono">{u.created_at?.split(' ')[0] || '—'}</td>
                                    <td className="px-5 py-3 text-right">
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => handleToggleLock(u.id)} title={u.is_locked ? 'Unlock' : 'Lock'}
                                                className="p-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg transition-all">
                                                {u.is_locked ? <Unlock className="w-3.5 h-3.5 text-[#46D369]" /> : <Lock className="w-3.5 h-3.5 text-[#E87C03]" />}
                                            </button>
                                            <button onClick={() => handleDeleteUser(u.id)} title="Delete"
                                                className="p-1.5 bg-[#E50914]/5 hover:bg-[#E50914]/15 border border-[#E50914]/20 rounded-lg transition-all">
                                                <Trash2 className="w-3.5 h-3.5 text-[#E50914]" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Audit Trail Tab — matching old project's audit table */}
            {activeTab === 'audit' && (
                <div className="bg-[#181818] border border-white/[0.06] rounded-2xl overflow-hidden">
                    <div className="overflow-y-auto tv-scrollbar" style={{ maxHeight: '600px' }}>
                        <table className="w-full">
                            <thead className="sticky top-0 bg-[#181818]">
                                <tr className="bg-white/[0.03] border-b border-white/[0.06]">
                                    <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-5 py-3">Timestamp</th>
                                    <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-5 py-3">Admin</th>
                                    <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-5 py-3">Action</th>
                                    <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-5 py-3">Details</th>
                                    <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-5 py-3">IP Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditLog.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-12 text-gray-500 text-sm">
                                        <Shield className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                                        No audit events recorded yet.
                                    </td></tr>
                                ) : auditLog.map((entry, i) => {
                                    const badgeColor = entry.action?.includes('override') ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
                                        entry.action?.includes('dispatch') ? 'bg-[#E50914]/10 text-[#E50914]' :
                                        entry.action?.includes('settings') ? 'bg-[#0071EB]/10 text-[#0071EB]' :
                                        entry.action?.includes('purge') ? 'bg-[#E50914]/10 text-[#E50914]' :
                                        'bg-[#10b981]/10 text-[#10b981]';
                                    return (
                                        <tr key={entry.id || i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                            <td className="px-5 py-3 text-xs text-gray-400 font-mono">
                                                <Clock className="w-3 h-3 inline-block mr-1 opacity-50" />{entry.timestamp}
                                            </td>
                                            <td className="px-5 py-3 text-sm text-white font-bold">{entry.user || 'System'}</td>
                                            <td className="px-5 py-3">
                                                <span className={`text-[10px] font-black uppercase tracking-widest py-1 px-2.5 rounded-md ${badgeColor}`}>
                                                    {(entry.action || '—').replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-xs text-gray-400 max-w-[250px] truncate">{entry.details || '—'}</td>
                                            <td className="px-5 py-3 text-xs text-gray-500 font-mono">{entry.ip || '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Danger Zone Tab */}
            {activeTab === 'danger' && (
                <div className="bg-[#181818] border border-[#E50914]/20 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-[#E50914] mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" /> Danger Zone
                    </h3>
                    <p className="text-gray-400 text-sm mb-6">These actions are irreversible. Proceed with caution.</p>

                    <div className="bg-[#E50914]/5 border border-[#E50914]/10 rounded-xl p-5">
                        <h4 className="text-white font-bold mb-1">Purge All Historical Data</h4>
                        <p className="text-gray-500 text-sm mb-4">This will permanently delete ALL historical traffic data including lane statistics and vehicle logs. This cannot be undone.</p>
                        {showPurgeConfirm ? (
                            <div className="space-y-3">
                                <p className="text-[#E50914] text-sm font-bold">⚠️ FINAL CONFIRMATION: Press "Yes, Purge Everything" to permanently delete all data.</p>
                                <div className="flex items-center gap-3">
                                    <button onClick={handlePurge} disabled={purging}
                                        className="px-4 py-2 bg-[#E50914] text-white font-bold rounded-lg text-xs uppercase tracking-widest hover:bg-[#B20710] transition-all disabled:opacity-50 flex items-center gap-2">
                                        {purging ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        Yes, Purge Everything
                                    </button>
                                    <button onClick={() => setShowPurgeConfirm(false)}
                                        className="px-4 py-2 bg-white/[0.05] text-white font-bold rounded-lg text-xs uppercase tracking-widest hover:bg-white/[0.08] transition-all">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => setShowPurgeConfirm(true)}
                                className="px-6 py-2.5 bg-[#E50914]/10 text-[#E50914] border border-[#E50914]/30 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#E50914]/20 transition-all flex items-center gap-2">
                                <Trash2 className="w-4 h-4" /> Purge Historical Data
                            </button>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
