import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { analytics } from '../api/client';
import { useToast } from '../context/ToastContext';
import { FileText, Download, ChevronLeft, ChevronRight, Filter, Search, Printer, RotateCcw } from 'lucide-react';

export default function ReportsPage() {
    const [data, setData] = useState({ records: [], total: 0, pages: 1, current_page: 1 });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ lane: '', density: '', date: '', page: 1 });
    const { addToast } = useToast();

    const fetchReports = async (params = {}) => {
        setLoading(true);
        try {
            const query = { ...filters, ...params };
            Object.keys(query).forEach(k => !query[k] && delete query[k]);
            const res = await analytics.reportsData(query);
            setData(res);
        } catch (err) { addToast('Failed to load reports', 'error'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchReports(); }, [filters.page]);

    const handleFilter = () => { setFilters(prev => ({ ...prev, page: 1 })); fetchReports({ page: 1 }); };

    const handleExportCsv = async () => {
        try {
            const blob = await analytics.exportCsv();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'traffic_stats.csv'; a.click();
            URL.revokeObjectURL(url);
            addToast('CSV exported successfully', 'success');
        } catch (err) { addToast('Export failed: ' + err.message, 'error'); }
    };

    const handleGeneratePdf = async () => {
        try {
            const blob = await analytics.generatePdf();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `traffic_report_${new Date().toISOString().slice(0, 10)}.html`; a.click();
            URL.revokeObjectURL(url);
            addToast('Report generated successfully', 'success');
        } catch (err) { addToast('PDF generation failed: ' + err.message, 'error'); }
    };

    const densityColor = (d) => d === 'High' ? 'text-[#E50914] bg-[#E50914]/10' : d === 'Medium' ? 'text-[#E87C03] bg-[#E87C03]/10' : 'text-[#46D369] bg-[#46D369]/10';

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 pb-12">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-[0.04em] text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                        TRAFFIC REPORTS
                    </h2>
                    <p className="text-gray-500 text-sm">Paginated traffic data records with filters and export options.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExportCsv} className="px-4 py-2 bg-[#46D369]/10 text-[#46D369] border border-[#46D369]/20 rounded-xl flex items-center gap-2 font-bold text-xs uppercase tracking-widest hover:bg-[#46D369]/20 transition-all">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                    <button onClick={handleGeneratePdf} className="px-4 py-2 bg-[#E50914]/10 text-[#E50914] border border-[#E50914]/20 rounded-xl flex items-center gap-2 font-bold text-xs uppercase tracking-widest hover:bg-[#E50914]/20 transition-all">
                        <Printer className="w-4 h-4" /> Generate Report
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-3">
                <Filter className="w-4 h-4 text-gray-500" />
                <select value={filters.lane} onChange={e => setFilters(prev => ({ ...prev, lane: e.target.value }))}
                    className="bg-[#2a2a2a] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#0071EB]">
                    <option value="">All Lanes</option>
                    {[1, 2, 3, 4].map(l => <option key={l} value={l}>Lane {l}</option>)}
                </select>
                <select value={filters.density} onChange={e => setFilters(prev => ({ ...prev, density: e.target.value }))}
                    className="bg-[#2a2a2a] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#0071EB]">
                    <option value="">All Densities</option>
                    {['Low', 'Medium', 'High'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <input type="date" value={filters.date} onChange={e => setFilters(prev => ({ ...prev, date: e.target.value }))}
                    className="bg-[#2a2a2a] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#0071EB]" />
                <button onClick={handleFilter}
                    className="px-4 py-2 bg-[#0071EB] hover:bg-[#005bbd] text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2">
                    <Search className="w-3.5 h-3.5" /> Apply
                </button>
                {(filters.lane || filters.density || filters.date) && (
                    <button onClick={() => { setFilters({ lane: '', density: '', date: '', page: 1 }); fetchReports({ lane: '', density: '', date: '', page: 1 }); }}
                        className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] text-gray-400 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/[0.08] hover:text-white transition-all flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" /> Clear
                    </button>
                )}
                <div className="ml-auto text-xs text-gray-500 font-bold">{data.total} records found</div>
            </div>

            {/* Table */}
            <div className="bg-[#181818] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-white/[0.03] border-b border-white/[0.06]">
                                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-5 py-3">ID</th>
                                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-5 py-3">Lane</th>
                                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-5 py-3">Vehicles</th>
                                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-5 py-3">Density</th>
                                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-5 py-3">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i} className="border-b border-white/[0.03]">
                                        {Array.from({ length: 5 }).map((_, j) => (
                                            <td key={j} className="px-5 py-3"><div className="h-4 bg-white/[0.05] rounded animate-shimmer w-20" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : data.records.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-12 text-gray-500 text-sm">No records found. Adjust your filters or wait for data.</td></tr>
                            ) : data.records.map((r, i) => (
                                <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                    <td className="px-5 py-3 text-sm text-gray-400 font-mono">#{r.id}</td>
                                    <td className="px-5 py-3">
                                        <span className="text-sm font-bold text-white">Lane {r.lane_id}</span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="text-sm font-bold text-white tabular-nums">{r.vehicle_count}</span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className={`text-[10px] font-black uppercase tracking-widest py-1 px-3 rounded-md ${densityColor(r.density)}`}>{r.density}</span>
                                    </td>
                                    <td className="px-5 py-3 text-sm text-gray-400 font-mono">{r.timestamp}</td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-5 py-3 bg-white/[0.01] border-t border-white/[0.06]">
                    <div className="text-xs text-gray-500">
                        Page {data.current_page} of {data.pages} • {data.total} total records
                    </div>
                    <div className="flex gap-2">
                        <button disabled={!data.has_prev} onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                            className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.08] transition-all flex items-center gap-1">
                            <ChevronLeft className="w-3.5 h-3.5" /> Prev
                        </button>
                        <button disabled={!data.has_next} onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                            className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.08] transition-all flex items-center gap-1">
                            Next <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
