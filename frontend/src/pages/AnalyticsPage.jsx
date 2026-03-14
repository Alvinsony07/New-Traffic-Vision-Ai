import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { analytics } from '../api/client';
import { useToast } from '../context/ToastContext';
import { BarChart3, TrendingUp, PieChart, Clock, Truck, Zap, Brain, Car, Shield, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

// Chart.js dark theme defaults
ChartJS.defaults.color = '#808080';
ChartJS.defaults.font.family = "'Inter', sans-serif";
ChartJS.defaults.animation.duration = 800;
ChartJS.defaults.animation.easing = 'easeOutQuart';

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
        legend: { labels: { color: '#9ca3af', font: { size: 11, weight: 500 }, boxWidth: 12, padding: 16, usePointStyle: true, pointStyle: 'circle' } },
        tooltip: {
            backgroundColor: 'rgba(10, 10, 10, 0.95)',
            titleColor: '#f8fafc', bodyColor: '#d1d5db',
            borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
            cornerRadius: 10, padding: 12,
            titleFont: { weight: 700, size: 12 }, bodyFont: { size: 11 },
            displayColors: true, boxPadding: 4,
        },
    },
    scales: {
        x: { ticks: { color: '#6b7280', font: { size: 10, weight: 500 }, maxRotation: 0 }, grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false }, border: { display: false } },
        y: { ticks: { color: '#6b7280', font: { size: 10, weight: 500 }, padding: 8 }, grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false }, border: { display: false } },
    },
};

export default function AnalyticsPage() {
    const [statsData, setStatsData] = useState(null);
    const [predictions, setPredictions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [plateLogs, setPlateLogs] = useState(null);
    const [plateSearch, setPlateSearch] = useState('');
    const [platePage, setPlatePage] = useState(1);
    const [activeTab, setActiveTab] = useState('overview');
    const { addToast } = useToast();

    // Fetch analytics data
    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [stats, preds] = await Promise.all([analytics.stats(), analytics.predictions()]);
                setStatsData(stats);
                setPredictions(preds);
            } catch (err) { console.error(err); addToast('Failed to load analytics', 'error'); }
            finally { setLoading(false); }
        };
        fetchAll();
        const interval = setInterval(fetchAll, 30000);
        return () => clearInterval(interval);
    }, []);

    // Fetch plate logs
    const fetchPlates = useCallback(async () => {
        try {
            const params = { page: platePage, per_page: 15 };
            if (plateSearch) params.search = plateSearch;
            const data = await analytics.plateLogs(params);
            setPlateLogs(data);
        } catch (err) { console.error(err); }
    }, [platePage, plateSearch]);

    useEffect(() => {
        if (activeTab === 'plates') fetchPlates();
    }, [activeTab, fetchPlates]);

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <div className="w-12 h-12 border-2 border-[#E50914]/20 border-t-[#E50914] rounded-full animate-spin" />
        </div>
    );

    // Chart data
    const trendChart = {
        labels: (statsData?.trend || []).map(t => t.time),
        datasets: [{
            label: 'Vehicles', data: (statsData?.trend || []).map(t => t.count),
            borderColor: '#0071EB', backgroundColor: 'rgba(0,113,235,0.08)',
            fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2,
        }],
    };

    const dist = statsData?.distribution || {};
    const distChart = {
        labels: Object.keys(dist),
        datasets: [{ data: Object.values(dist), backgroundColor: ['#E50914', '#0071EB', '#46D369', '#E87C03', '#9B59B6', '#F5C518'], borderWidth: 0 }],
    };

    const peak = statsData?.peak_hours || {};
    const peakChart = {
        labels: Object.keys(peak).map(h => `${h}:00`),
        datasets: [{
            label: 'Vehicles', data: Object.values(peak),
            backgroundColor: Object.keys(peak).map(h => peak[h] > 100 ? '#ef4444' : peak[h] > 50 ? '#f59e0b' : '#0071EB'),
            borderRadius: 6,
        }],
    };

    const lane = statsData?.lane_performance || {};
    const laneChart = {
        labels: Object.keys(lane).map(l => `Lane ${l}`),
        datasets: [{ label: 'Avg Vehicles', data: Object.values(lane), backgroundColor: ['#0071EB', '#46D369', '#E87C03', '#9B59B6'], borderRadius: 6 }],
    };

    const totalVehicles = (statsData?.trend || []).reduce((a, t) => a + (t.count || 0), 0);
    const avgVehicles = statsData?.trend?.length ? Math.round(totalVehicles / statsData.trend.length) : 0;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 pb-12">
            <div className="mb-6">
                <h2 className="text-3xl font-black tracking-[0.04em] text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                    ADVANCED ANALYTICS
                </h2>
                <p className="text-gray-500 text-sm">Traffic patterns, predictions, vehicle detection, and ANPR data.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {[
                    { key: 'overview', label: 'Overview', icon: BarChart3 },
                    { key: 'plates', label: 'Number Plates (ANPR)', icon: Shield },
                ].map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setActiveTab(key)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all border ${activeTab === key
                            ? 'bg-[#0071EB]/15 border-[#0071EB] text-[#0071EB]'
                            : 'bg-[#181818] border-white/[0.06] text-gray-400 hover:bg-white/[0.05]'}`}>
                        <Icon className="w-4 h-4" /> {label}
                    </button>
                ))}
            </div>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
                        {[
                            { label: 'Total Detected', value: totalVehicles.toLocaleString(), icon: Car, color: '#0071EB' },
                            { label: 'Avg Per Reading', value: avgVehicles, icon: TrendingUp, color: '#46D369' },
                            { label: 'Vehicle Types', value: Object.keys(dist).length, icon: PieChart, color: '#E87C03' },
                            { label: 'Data Points', value: statsData?.trend?.length || 0, icon: BarChart3, color: '#9B59B6' },
                            { label: 'Emergency Events', value: statsData?.ambulance_events || 0, icon: Truck, color: '#E50914' },
                            { label: 'Peak Prediction', value: predictions?.peak_prediction?.label || '--', icon: Clock, color: '#F5C518' },
                        ].map((s, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                className="bg-[#181818] border border-white/[0.06] rounded-2xl p-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.color + '15' }}>
                                    <s.icon className="w-5 h-5" style={{ color: s.color }} />
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{s.label}</div>
                                    <div className="text-white font-bold text-lg leading-none">{s.value}</div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                        <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-5">
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-[#0071EB]" /> Traffic Volume Trend
                            </h3>
                            <div style={{ height: '300px' }}><Line data={trendChart} options={chartOptions} /></div>
                        </div>

                        <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-5">
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                <PieChart className="w-4 h-4 text-[#46D369]" /> Vehicle Type Distribution
                            </h3>
                            <div style={{ height: '300px' }} className="flex items-center justify-center">
                                <Doughnut data={distChart} options={{ ...chartOptions, scales: undefined, cutout: '55%' }} />
                            </div>
                        </div>

                        <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-5">
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-[#E87C03]" /> Peak Traffic Hours
                                <span className="text-[10px] text-gray-500 ml-auto font-normal">Color: 🔴 &gt;100 · 🟡 &gt;50 · 🔵 Normal</span>
                            </h3>
                            <div style={{ height: '300px' }}>
                                <Bar data={peakChart} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }} />
                            </div>
                        </div>

                        <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-5">
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-[#9B59B6]" /> Lane Performance
                            </h3>
                            <div style={{ height: '300px' }}>
                                <Bar data={laneChart} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }} />
                            </div>
                        </div>
                    </div>

                    {/* AI Predictions */}
                    {predictions && (
                        <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-5">
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-[#F5C518]" /> AI Congestion Predictions — Next 6 Hours
                                <span className="text-[10px] bg-white/[0.06] px-2 py-0.5 rounded text-gray-400 font-normal ml-auto">
                                    {predictions.model} • {predictions.generated_at}
                                </span>
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                {predictions.predictions.map((p, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                                        className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] text-center hover:bg-white/[0.05] transition-colors">
                                        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">{p.label}</div>
                                        <div className="text-2xl font-black text-white mb-1">{p.avg_vehicles}</div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block"
                                            style={{ color: p.color, background: p.color + '20' }}>
                                            {p.level}
                                        </div>
                                        <div className="mt-2">
                                            <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all" style={{ width: `${p.confidence}%`, background: p.color }} />
                                            </div>
                                            <div className="text-[10px] text-gray-600 mt-1">{p.confidence}% confidence</div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ANPR (NUMBER PLATES) TAB */}
            {activeTab === 'plates' && (
                <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Shield className="w-4 h-4 text-[#0071EB]" /> Number Plate Detection Logs (ANPR)
                        </h3>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input type="text" value={plateSearch}
                                    onChange={e => { setPlateSearch(e.target.value); setPlatePage(1); }}
                                    onKeyDown={e => e.key === 'Enter' && fetchPlates()}
                                    placeholder="Search plate..."
                                    className="pl-9 pr-3 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#0071EB] transition-colors w-48" />
                            </div>
                            <button onClick={fetchPlates} className="px-3 py-2 bg-[#0071EB]/20 border border-[#0071EB]/30 rounded-lg text-[#0071EB] text-xs hover:bg-[#0071EB]/30 transition-colors">
                                Refresh
                            </button>
                        </div>
                    </div>

                    {plateLogs?.logs?.length > 0 ? (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/[0.08]">
                                            <th className="py-3 px-4 text-[10px] text-gray-500 uppercase tracking-widest font-bold">Plate Number</th>
                                            <th className="py-3 px-4 text-[10px] text-gray-500 uppercase tracking-widest font-bold">Lane</th>
                                            <th className="py-3 px-4 text-[10px] text-gray-500 uppercase tracking-widest font-bold">Camera</th>
                                            <th className="py-3 px-4 text-[10px] text-gray-500 uppercase tracking-widest font-bold">Confidence</th>
                                            <th className="py-3 px-4 text-[10px] text-gray-500 uppercase tracking-widest font-bold">Timestamp</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {plateLogs.logs.map((log, i) => (
                                            <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                                className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                                                <td className="py-3 px-4 text-sm text-white font-mono font-bold">{log.plate_number}</td>
                                                <td className="py-3 px-4 text-sm text-gray-300">Lane {log.lane_id || '—'}</td>
                                                <td className="py-3 px-4 text-sm text-gray-400">{log.camera_source || 'Default'}</td>
                                                <td className="py-3 px-4">
                                                    {log.confidence ? (
                                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${log.confidence > 0.8 ? 'bg-[#10b981]/20 text-[#10b981]' : log.confidence > 0.5 ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>
                                                            {(log.confidence * 100).toFixed(0)}%
                                                        </span>
                                                    ) : <span className="text-gray-500 text-xs">—</span>}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-400">{log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}</td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
                                <div className="text-xs text-gray-500">
                                    Showing {((platePage - 1) * 15) + 1}–{Math.min(platePage * 15, plateLogs.total)} of {plateLogs.total}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setPlatePage(p => Math.max(1, p - 1))} disabled={platePage <= 1}
                                        className="px-3 py-1.5 rounded-lg border border-white/[0.1] text-xs text-gray-300 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="px-3 py-1.5 text-xs text-gray-400">Page {platePage}</span>
                                    <button onClick={() => setPlatePage(p => p + 1)} disabled={platePage * 15 >= plateLogs.total}
                                        className="px-3 py-1.5 rounded-lg border border-white/[0.1] text-xs text-gray-300 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-16">
                            <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <h4 className="text-white font-semibold mb-1">No Plate Detections Yet</h4>
                            <p className="text-gray-500 text-sm max-w-md mx-auto">
                                Number plate detection logs will appear here when the ANPR system captures plates from camera feeds.
                                Configure camera sources to start detection.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}
