import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { reports, dispatch as dispatchApi } from '../api/client';
import { FileText, AlertTriangle, ShieldCheck, Clock, MapPin, Search, ChevronRight, Check } from 'lucide-react';

export default function ReportsPage() {
    const [reportList, setReportList] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    // Dispatch Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [dispatchData, setDispatchData] = useState({ hospital_name: '', hospital_lat: '', hospital_lng: '', distance_km: '' });
    const [isDispatching, setIsDispatching] = useState(false);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const res = await reports.list();
                setReportList(res.reports || []);
            } catch (err) {
                console.error("Failed to load reports");
            }
        };
        fetchReports();
    }, []);

    const filteredReports = reportList.filter(r => {
        const matchQuery = r.location?.toLowerCase().includes(searchQuery.toLowerCase()) || r.description?.toLowerCase().includes(searchQuery.toLowerCase()) || r.id.toString().includes(searchQuery);
        const matchStatus = statusFilter === 'All' || r.status === statusFilter;
        return matchQuery && matchStatus;
    });

    const openDispatchModal = (report) => {
        setSelectedIncident(report);
        setDispatchData({
            hospital_name: 'City General Hospital',
            hospital_lat: (report.latitude || 12.9716) + 0.01,
            hospital_lng: (report.longitude || 77.5946) + 0.01,
            distance_km: '2.4'
        }); // Mock defaults for quick dispatch
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
            // Refresh list
            const res = await reports.list();
            setReportList(res.reports || []);
        } catch (err) {
            alert("Dispatch failed: " + err.message);
        } finally {
            setIsDispatching(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-bl-[100px] pointer-events-none" />
                <div className="relative z-10">
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3 mb-1">
                        <FileText className="w-7 h-7 text-[#e50914]" /> Incident Reports Log
                    </h1>
                    <p className="text-gray-400 text-sm">Review, verify, and dispatch units for traffic accidents.</p>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search location or ID..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-[#141414] border border-white/10 text-white rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-[#e50914] text-sm transition-colors"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="bg-[#141414] border border-white/10 text-white rounded-xl px-4 py-2.5 outline-none focus:border-[#e50914] text-sm appearance-none cursor-pointer"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Reported">Reported</option>
                        <option value="Verified">Verified</option>
                        <option value="Resolved">Resolved</option>
                    </select>
                </div>
            </div>

            <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl shadow-2xl overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#141414]/80 text-[10px] uppercase tracking-widest text-gray-500 font-bold border-b border-white/5">
                                <th className="p-5 w-24">Report ID</th>
                                <th className="p-5 w-40">Time</th>
                                <th className="p-5">Location / Description</th>
                                <th className="p-5 w-32">Reporter</th>
                                <th className="p-5 w-32 text-center">Status</th>
                                <th className="p-5 w-32 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {filteredReports.length === 0 ? (
                                <tr><td colSpan="6" className="p-10 text-center text-gray-500 text-sm">No reports match your filters.</td></tr>
                            ) : filteredReports.map((r) => (
                                <tr key={r.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-5 text-sm font-mono text-gray-400">#{String(r.id).padStart(5, '0')}</td>
                                    <td className="p-5 text-xs text-gray-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {r.timestamp}</td>
                                    <td className="p-5">
                                        <div className="font-bold text-white text-sm mb-1">{r.location || 'Unknown'}</div>
                                        <div className="text-xs text-gray-500 line-clamp-1 group-hover:line-clamp-none transition-all">{r.description}</div>
                                    </td>
                                    <td className="p-5 text-sm text-gray-400">{r.user}</td>
                                    <td className="p-5 text-center">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-md text-[10px] font-bold uppercase tracking-widest border ${r.status === 'Resolved' ? 'text-green-500 border-green-500/30' :
                                                r.status === 'Verified' ? 'text-yellow-500 border-yellow-500/30' :
                                                    'text-red-500 border-red-500/30'
                                            }`}>
                                            {r.status === 'Resolved' ? <ShieldCheck className="w-3 h-3" /> : r.status === 'Verified' ? <Clock className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="p-5 text-right">
                                        <button
                                            onClick={() => openDispatchModal(r)}
                                            disabled={r.status === 'Resolved'}
                                            className="px-4 py-1.5 bg-[#e50914]/10 hover:bg-[#e50914]/20 text-[#e50914] border border-[#e50914]/20 rounded-md text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center gap-1"
                                        >
                                            Dispatch <ChevronRight className="w-3 h-3 -mr-1" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Dispatch Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                        >
                            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-[#e50914]" /> Emergency Dispatch
                            </h2>
                            <p className="text-sm text-gray-400 mb-6 pb-4 border-b border-white/10">Dispatch unit for Incident #{selectedIncident?.id} at {selectedIncident?.location}</p>

                            <form onSubmit={handleDispatch} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 mb-1 ml-1 uppercase tracking-wider">Hospital / Base Unit</label>
                                    <input
                                        type="text" required
                                        value={dispatchData.hospital_name}
                                        onChange={e => setDispatchData({ ...dispatchData, hospital_name: e.target.value })}
                                        className="w-full bg-[#141414] border border-white/10 text-white p-3 rounded-xl focus:border-[#e50914] outline-none text-sm transition-colors"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1 ml-1 uppercase tracking-wider">Unit Lat</label>
                                        <input
                                            type="text" required
                                            value={dispatchData.hospital_lat}
                                            onChange={e => setDispatchData({ ...dispatchData, hospital_lat: e.target.value })}
                                            className="w-full bg-[#141414] border border-white/10 text-white p-3 rounded-xl focus:border-[#e50914] outline-none text-sm transition-colors font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1 ml-1 uppercase tracking-wider">Unit Lng</label>
                                        <input
                                            type="text" required
                                            value={dispatchData.hospital_lng}
                                            onChange={e => setDispatchData({ ...dispatchData, hospital_lng: e.target.value })}
                                            className="w-full bg-[#141414] border border-white/10 text-white p-3 rounded-xl focus:border-[#e50914] outline-none text-sm transition-colors font-mono"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 mb-1 ml-1 uppercase tracking-wider">Distance (km)</label>
                                    <input
                                        type="number" step="0.1" required
                                        value={dispatchData.distance_km}
                                        onChange={e => setDispatchData({ ...dispatchData, distance_km: e.target.value })}
                                        className="w-full bg-[#141414] border border-white/10 text-white p-3 rounded-xl focus:border-[#e50914] outline-none text-sm transition-colors"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4 mt-6 border-t border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-xl transition-colors text-sm"
                                    >
                                        CANCEL
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isDispatching}
                                        className="flex-1 px-4 py-3 bg-[#e50914] hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(229,9,20,0.3)] hover:shadow-[0_0_20px_rgba(229,9,20,0.5)] disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                                    >
                                        {isDispatching ? <span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full" /> : <Check className="w-4 h-4" />}
                                        CONFIRM
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
            `}</style>
        </div>
    );
}
