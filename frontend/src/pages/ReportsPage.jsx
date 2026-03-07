import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { reports, dispatch as dispatchApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import { FileText, AlertTriangle, ShieldCheck, Clock, Search, ChevronRight, Check, Loader2, MapPin, Hash, User } from 'lucide-react';

export default function ReportsPage() {
    const [reportList, setReportList] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [loading, setLoading] = useState(true);

    // Dispatch Modal
    const [showModal, setShowModal] = useState(false);
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [dispatchData, setDispatchData] = useState({ hospital_name: '', hospital_lat: '', hospital_lng: '', distance_km: '' });
    const [isDispatching, setIsDispatching] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const res = await reports.list();
                setReportList(res.reports || []);
            } catch (err) { console.error("Failed to load reports"); }
            finally { setLoading(false); }
        };
        fetchReports();
    }, []);

    const filteredReports = reportList.filter(r => {
        const matchQuery = r.location?.toLowerCase().includes(searchQuery.toLowerCase()) || r.description?.toLowerCase().includes(searchQuery.toLowerCase()) || r.id.toString().includes(searchQuery);
        const matchStatus = statusFilter === 'All' || r.status === statusFilter;
        return matchQuery && matchStatus;
    });

    const stats = {
        total: reportList.length,
        reported: reportList.filter(r => r.status === 'Reported').length,
        verified: reportList.filter(r => r.status === 'Verified').length,
        resolved: reportList.filter(r => r.status === 'Resolved').length,
    };

    const openDispatchModal = (report) => {
        setSelectedIncident(report);
        setDispatchData({
            hospital_name: 'City General Hospital',
            hospital_lat: (report.latitude || 12.9716) + 0.01,
            hospital_lng: (report.longitude || 77.5946) + 0.01,
            distance_km: '2.4'
        });
        setShowModal(true);
    };

    const handleDispatch = async (e) => {
        e.preventDefault();
        setIsDispatching(true);
        try {
            await dispatchApi.create({
                report_id: selectedIncident.id,
                hospital_name: dispatchData.hospital_name,
                hospital_lat: parseFloat(dispatchData.hospital_lat) || 0,
                hospital_lng: parseFloat(dispatchData.hospital_lng) || 0,
                accident_lat: selectedIncident.latitude || 0,
                accident_lng: selectedIncident.longitude || 0,
                distance_km: parseFloat(dispatchData.distance_km) || 0
            });
            setShowModal(false);
            const res = await reports.list();
            setReportList(res.reports || []);
        } catch (err) {
            addToast("Dispatch failed: " + err.message, "error");
        } finally {
            setIsDispatching(false);
        }
    };

    const statusConfig = {
        Reported: { icon: AlertTriangle, bg: 'bg-[#E50914]/10', text: 'text-[#E50914]', border: 'border-[#E50914]/25' },
        Verified: { icon: Clock, bg: 'bg-[#E87C03]/10', text: 'text-[#E87C03]', border: 'border-[#E87C03]/25' },
        Resolved: { icon: ShieldCheck, bg: 'bg-[#46D369]/10', text: 'text-[#46D369]', border: 'border-[#46D369]/25' },
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 rounded-full border-2 border-[#E50914]/20 border-t-[#E50914] animate-spin" />
                    <p className="text-xs text-gray-600 uppercase tracking-[0.3em] font-bold">Loading Reports</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#181818] border border-white/[0.06] rounded-2xl p-6 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#E50914]/[0.03] rounded-bl-[100px] pointer-events-none" />
                <div className="relative z-10">
                    <h1 className="text-3xl font-black tracking-[0.04em] text-white flex items-center gap-3 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                        <FileText className="w-7 h-7 text-[#E50914]" /> INCIDENT REPORTS
                    </h1>
                    <p className="text-gray-500 text-sm font-medium">Review, verify, and dispatch rescue units for traffic incidents.</p>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-56">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-white/[0.08] text-white rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-[#E50914]/50 text-sm transition-all"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="bg-[#0a0a0a] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 outline-none focus:border-[#E50914]/50 text-sm appearance-none cursor-pointer"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Reported">Reported</option>
                        <option value="Verified">Verified</option>
                        <option value="Resolved">Resolved</option>
                    </select>
                </div>
            </div>

            {/* Status Summary */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: 'Total', value: stats.total, color: 'text-white', bg: 'bg-white/[0.03]' },
                    { label: 'Reported', value: stats.reported, color: 'text-[#E50914]', bg: 'bg-[#E50914]/5' },
                    { label: 'Verified', value: stats.verified, color: 'text-[#E87C03]', bg: 'bg-[#E87C03]/5' },
                    { label: 'Resolved', value: stats.resolved, color: 'text-[#46D369]', bg: 'bg-[#46D369]/5' },
                ].map((s, i) => (
                    <div key={i} className={`${s.bg} border border-white/[0.04] rounded-xl p-3 text-center`}>
                        <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-[#181818] border border-white/[0.06] rounded-2xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto tv-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0d0d0d] text-xs uppercase tracking-widest text-gray-600 font-bold border-b border-white/[0.04]">
                                <th className="p-4 w-20"><Hash className="w-3 h-3 inline" /> ID</th>
                                <th className="p-4 w-36"><Clock className="w-3 h-3 inline" /> Time</th>
                                <th className="p-4">Location / Description</th>
                                <th className="p-4 w-28"><User className="w-3 h-3 inline" /> Reporter</th>
                                <th className="p-4 w-28 text-center">Status</th>
                                <th className="p-4 w-28 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {filteredReports.length === 0 ? (
                                <tr><td colSpan="6" className="p-12 text-center text-gray-600 text-sm">No reports match your filters.</td></tr>
                            ) : filteredReports.map((r) => {
                                const sc = statusConfig[r.status] || statusConfig.Reported;
                                const StatusIcon = sc.icon;
                                return (
                                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-4 text-sm font-mono text-gray-500">#{String(r.id).padStart(5, '0')}</td>
                                        <td className="p-4 text-xs text-gray-500 flex items-center gap-1.5"><Clock className="w-3 h-3" /> {r.timestamp}</td>
                                        <td className="p-4">
                                            <div className="font-semibold text-white text-sm mb-0.5 flex items-center gap-1.5">
                                                <MapPin className="w-3 h-3 text-[#E50914] shrink-0" />{r.location || 'Unknown'}
                                            </div>
                                            <div className="text-xs text-gray-500 line-clamp-1 group-hover:line-clamp-none transition-all">{r.description}</div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-400 font-medium">{r.user}</td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-black uppercase tracking-widest border ${sc.bg} ${sc.text} ${sc.border}`}>
                                                <StatusIcon className="w-3 h-3" />
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => openDispatchModal(r)}
                                                disabled={r.status === 'Resolved'}
                                                className="px-4 py-1.5 bg-[#E50914]/10 hover:bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/20 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-20 disabled:cursor-not-allowed inline-flex items-center gap-1"
                                            >
                                                Dispatch <ChevronRight className="w-3 h-3" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Dispatch Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-[#181818] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-hidden"
                        >
                            {/* Modal accent */}
                            <div className="h-[2px] bg-gradient-to-r from-transparent via-[#E50914] to-transparent" />

                            <div className="p-6">
                                <h2 className="text-xl font-black text-white mb-1 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                                    <AlertTriangle className="w-5 h-5 text-[#E50914]" /> EMERGENCY DISPATCH
                                </h2>
                                <p className="text-sm text-gray-500 mb-6 pb-4 border-b border-white/[0.06]">
                                    Incident #{selectedIncident?.id} • {selectedIncident?.location}
                                </p>

                                <form onSubmit={handleDispatch} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Hospital / Base Unit</label>
                                        <input
                                            type="text" required
                                            value={dispatchData.hospital_name}
                                            onChange={e => setDispatchData({ ...dispatchData, hospital_name: e.target.value })}
                                            className="w-full bg-[#0a0a0a] border border-white/[0.08] text-white p-3 rounded-xl focus:border-[#E50914]/50 outline-none text-sm transition-all"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Lat</label>
                                            <input type="text" required value={dispatchData.hospital_lat}
                                                onChange={e => setDispatchData({ ...dispatchData, hospital_lat: e.target.value })}
                                                className="w-full bg-[#0a0a0a] border border-white/[0.08] text-white p-3 rounded-xl focus:border-[#E50914]/50 outline-none text-sm font-mono" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Lng</label>
                                            <input type="text" required value={dispatchData.hospital_lng}
                                                onChange={e => setDispatchData({ ...dispatchData, hospital_lng: e.target.value })}
                                                className="w-full bg-[#0a0a0a] border border-white/[0.08] text-white p-3 rounded-xl focus:border-[#E50914]/50 outline-none text-sm font-mono" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Distance (km)</label>
                                        <input type="number" step="0.1" required value={dispatchData.distance_km}
                                            onChange={e => setDispatchData({ ...dispatchData, distance_km: e.target.value })}
                                            className="w-full bg-[#0a0a0a] border border-white/[0.08] text-white p-3 rounded-xl focus:border-[#E50914]/50 outline-none text-sm" />
                                    </div>

                                    <div className="flex gap-3 pt-4 mt-4 border-t border-white/[0.06]">
                                        <button type="button" onClick={() => setShowModal(false)}
                                            className="flex-1 px-4 py-3 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 font-bold rounded-xl transition-all text-sm border border-white/[0.06]">
                                            CANCEL
                                        </button>
                                        <button type="submit" disabled={isDispatching}
                                            className="flex-1 px-4 py-3 bg-[#E50914] hover:bg-[#B20710] text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(229,9,20,0.3)] disabled:opacity-50 text-sm flex items-center justify-center gap-2">
                                            {isDispatching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            CONFIRM DISPATCH
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
