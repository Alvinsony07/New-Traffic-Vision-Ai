import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { analytics } from '../api/client';
import { useToast } from '../context/ToastContext';
import {
    BarChart3, TrendingUp, PieChart, Clock, Truck, Zap, Brain, Car, Shield,
    Search, ChevronLeft, ChevronRight, AlertTriangle, Activity, Eye,
    Gauge, Lightbulb, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
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
    const [trafficAI, setTrafficAI] = useState(null);
    const [anprStats, setAnprStats] = useState(null);
    const { addToast } = useToast();

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [s, p] = await Promise.all([analytics.stats(), analytics.predictions().catch(() => null)]);
                setStatsData(s);
                setPredictions(p);
            } catch (err) { addToast('Failed to load analytics', 'error'); }
            finally { setLoading(false); }
        };
        fetchAll();
    }, [addToast]);

    // Fetch ANPR logs
    const fetchPlates = useCallback(async () => {
        try {
            const data = await analytics.plateLogs({ page: platePage, per_page: 15, search: plateSearch });
            setPlateLogs(data);
        } catch {}
    }, [platePage, plateSearch]);

    useEffect(() => { if (activeTab === 'anpr') fetchPlates(); }, [activeTab, fetchPlates]);

    // Fetch Traffic Intelligence
    useEffect(() => {
        if (activeTab === 'intelligence') {
            analytics.trafficIntelligence().then(setTrafficAI).catch(() => {});
            analytics.anprStats().then(setAnprStats).catch(() => {});
        }
    }, [activeTab]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center"><div className="w-10 h-10 border-2 border-[#0071EB] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500 text-sm">Loading analytics...</p></div>
        </div>
    );

    // ── Summary Cards Data ──
    const summary = statsData || {};
    const lineData = summary.line_data || {};
    const barData = summary.bar_data || {};
    const pieData = summary.pie_data || {};
    const recentRows = summary.recent_records || [];

    const totalVehicles = recentRows.reduce((sum, r) => sum + (r.vehicle_count || 0), 0);
    const avgCount = recentRows.length ? (totalVehicles / recentRows.length).toFixed(1) : '0';
    const highDensity = recentRows.filter(r => (r.density || '').toLowerCase() === 'high').length;
    const lowDensity = recentRows.filter(r => (r.density || '').toLowerCase() === 'low').length;

    // Chart configs
    const lineChartData = {
        labels: lineData.labels || [],
        datasets: [{
            label: 'Vehicles',
            data: lineData.values || [],
            borderColor: '#0071EB',
            backgroundColor: 'rgba(0,113,235,0.08)',
            borderWidth: 2, fill: true, pointRadius: 0, tension: 0.4,
        }],
    };

    const barChartData = {
        labels: barData.labels || [],
        datasets: [{
            label: 'Avg Vehicles',
            data: barData.values || [],
            backgroundColor: ['rgba(0,113,235,0.6)', 'rgba(99,102,241,0.6)', 'rgba(16,185,129,0.6)', 'rgba(245,158,11,0.6)'],
            borderRadius: 8, borderSkipped: false, barPercentage: 0.6,
        }],
    };

    const doughnutData = {
        labels: pieData.labels || [],
        datasets: [{
            data: pieData.values || [],
            backgroundColor: ['#0071EB', '#6366f1', '#10b981', '#f59e0b', '#ef4444'],
            borderWidth: 0, hoverOffset: 8,
        }],
    };

    const predictionData = predictions ? {
        labels: predictions.labels || predictions.hours || [],
        datasets: [{
            label: 'Predicted',
            data: predictions.values || predictions.predicted || [],
            borderColor: '#8b5cf6', borderDash: [6, 4], borderWidth: 2,
            backgroundColor: 'rgba(139,92,246,0.06)', fill: true, pointRadius: 2, tension: 0.4,
        }],
    } : null;

    const tabs = [
        { key: 'overview', label: 'Overview', icon: BarChart3 },
        { key: 'intelligence', label: 'Traffic AI', icon: Brain },
        { key: 'anpr', label: 'Number Plates (ANPR)', icon: Shield },
    ];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2"><BarChart3 className="w-5 h-5 text-[#0071EB]" /> Analytics Dashboard</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Real-time traffic analysis, AI predictions, and ANPR intelligence</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-1">
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${activeTab === t.key ? 'bg-[#0071EB]/15 text-[#0071EB] border border-[#0071EB]/30' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>
                        <t.icon className="w-3.5 h-3.5" /> {t.label}
                    </button>
                ))}
            </div>

            {/* ═══ OVERVIEW TAB ═══ */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {[
                            { label: 'Total Detected', val: totalVehicles, icon: Car, color: '#0071EB' },
                            { label: 'Avg Per Reading', val: avgCount, icon: Gauge, color: '#6366f1' },
                            { label: 'High Density', val: highDensity, icon: AlertTriangle, color: '#ef4444' },
                            { label: 'Low Density', val: lowDensity, icon: Activity, color: '#10b981' },
                            { label: 'Data Points', val: recentRows.length, icon: BarChart3, color: '#f59e0b' },
                            { label: 'Active Lanes', val: [...new Set(recentRows.map(r => r.lane_id))].length, icon: Truck, color: '#8b5cf6' },
                        ].map((c, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2"><c.icon className="w-3.5 h-3.5" style={{ color: c.color }} />
                                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{c.label}</span></div>
                                <div className="text-2xl font-bold text-white">{c.val}</div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {[
                            { title: 'Vehicle Count Trend', icon: TrendingUp, chart: <Line data={lineChartData} options={chartOptions} /> },
                            { title: 'Avg Per Lane', icon: BarChart3, chart: <Bar data={barChartData} options={{...chartOptions, plugins: {...chartOptions.plugins, legend: {display: false}}}} /> },
                            { title: 'Vehicle Distribution', icon: PieChart, chart: doughnutData.labels.length ? <Doughnut data={doughnutData} options={{...chartOptions, scales: {}, cutout: '65%'}} /> : <p className="text-gray-500 text-xs text-center py-8">No distribution data</p> },
                            { title: 'AI Predictions', icon: Brain, chart: predictionData ? <Line data={predictionData} options={chartOptions} /> : <p className="text-gray-500 text-xs text-center py-8">Predictions loading...</p> },
                        ].map((c, i) => (
                            <div key={i} className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-4">
                                <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2"><c.icon className="w-3.5 h-3.5 text-[#0071EB]" /> {c.title}</h3>
                                <div style={{ height: '280px' }}>{c.chart}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ TRAFFIC AI TAB ═══ */}
            {activeTab === 'intelligence' && (
                <div className="space-y-6">
                    {/* Congestion Risk Banner */}
                    {trafficAI && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className={`p-4 rounded-xl border flex items-center justify-between ${
                                trafficAI.congestion_risk === 'CRITICAL' ? 'bg-red-500/10 border-red-500/30' :
                                trafficAI.congestion_risk === 'HIGH' ? 'bg-orange-500/10 border-orange-500/30' :
                                trafficAI.congestion_risk === 'MODERATE' ? 'bg-yellow-500/10 border-yellow-500/30' :
                                'bg-green-500/10 border-green-500/30'
                            }`}>
                            <div className="flex items-center gap-3">
                                <Gauge className={`w-6 h-6 ${
                                    trafficAI.congestion_risk === 'CRITICAL' ? 'text-red-500' :
                                    trafficAI.congestion_risk === 'HIGH' ? 'text-orange-500' :
                                    trafficAI.congestion_risk === 'MODERATE' ? 'text-yellow-500' : 'text-green-500'
                                }`} />
                                <div>
                                    <div className="text-white font-bold text-sm">Congestion Risk: {trafficAI.congestion_risk}</div>
                                    <div className="text-gray-400 text-xs">Avg load: {trafficAI.avg_vehicle_load} vehicles · {trafficAI.data_points_analyzed} data points analyzed</div>
                                </div>
                            </div>
                            {trafficAI.active_incidents > 0 && (
                                <div className="text-red-400 text-xs font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {trafficAI.active_incidents} Active Incidents</div>
                            )}
                        </motion.div>
                    )}

                    {/* Lane Analysis Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {(trafficAI?.lane_analysis || []).map((lane, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                                className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-white">Lane {lane.lane_id}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        lane.risk === 'HIGH' ? 'bg-red-500/15 text-red-400' :
                                        lane.risk === 'MEDIUM' ? 'bg-yellow-500/15 text-yellow-400' :
                                        'bg-green-500/15 text-green-400'
                                    }`}>{lane.risk}</span>
                                </div>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between text-gray-400"><span>Avg Vehicles</span><span className="text-white font-bold">{lane.avg_vehicles}</span></div>
                                    <div className="flex justify-between text-gray-400"><span>Peak</span><span className="text-white font-bold">{lane.peak_vehicles}</span></div>
                                    <div className="flex justify-between text-gray-400"><span>Congestion %</span>
                                        <span className={`font-bold ${lane.congestion_percentage > 50 ? 'text-red-400' : lane.congestion_percentage > 25 ? 'text-yellow-400' : 'text-green-400'}`}>
                                            {lane.congestion_percentage}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-gray-400"><span>Trend</span>
                                        <span className="flex items-center gap-1 font-semibold text-white">
                                            {lane.trend === 'increasing' ? <><ArrowUpRight className="w-3 h-3 text-red-400" /> Rising</> :
                                             lane.trend === 'decreasing' ? <><ArrowDownRight className="w-3 h-3 text-green-400" /> Falling</> :
                                             <><Minus className="w-3 h-3 text-gray-400" /> Stable</>}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Anomalies & Recommendations */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Anomalies */}
                        <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-4">
                            <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-red-400" /> Anomaly Detection</h3>
                            {(trafficAI?.anomalies || []).length === 0 ? (
                                <p className="text-gray-500 text-xs py-4 text-center">✅ No anomalies detected</p>
                            ) : (
                                <div className="space-y-2">
                                    {trafficAI.anomalies.map((a, i) => (
                                        <div key={i} className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg text-xs">
                                            <div className="text-red-400 font-bold mb-1">⚠ {a.type.replace('_', ' ').toUpperCase()}</div>
                                            <div className="text-gray-400">{a.description}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* AI Recommendations */}
                        <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-4">
                            <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2"><Lightbulb className="w-3.5 h-3.5 text-yellow-400" /> AI Recommendations</h3>
                            {(trafficAI?.recommendations || []).length === 0 ? (
                                <p className="text-gray-500 text-xs py-4 text-center">✅ No recommendations — system is optimal</p>
                            ) : (
                                <div className="space-y-2">
                                    {trafficAI.recommendations.map((r, i) => (
                                        <div key={i} className={`p-3 rounded-lg border text-xs ${
                                            r.priority === 'critical' ? 'bg-red-500/5 border-red-500/10' : 'bg-yellow-500/5 border-yellow-500/10'
                                        }`}>
                                            <div className={`font-bold mb-1 ${r.priority === 'critical' ? 'text-red-400' : 'text-yellow-400'}`}>
                                                {r.type === 'signal_timing' ? '🚦' : '⚡'} {r.type.replace('_', ' ').toUpperCase()}
                                            </div>
                                            <div className="text-gray-400">{r.message}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ANPR Summary in Intelligence Tab */}
                    {anprStats && (
                        <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-4">
                            <h3 className="text-xs font-bold text-white mb-4 flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-[#0071EB]" /> ANPR Intelligence Summary</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { label: 'Total Detections', val: anprStats.total_detections, color: '#0071EB' },
                                    { label: 'Today', val: anprStats.today_detections, color: '#10b981' },
                                    { label: 'Unique Plates', val: anprStats.unique_plates, color: '#8b5cf6' },
                                    { label: 'Avg Confidence', val: `${(anprStats.avg_confidence * 100).toFixed(0)}%`, color: '#f59e0b' },
                                ].map((c, i) => (
                                    <div key={i} className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{c.label}</div>
                                        <div className="text-xl font-bold text-white mt-1" style={{ color: c.color }}>{c.val}</div>
                                    </div>
                                ))}
                            </div>
                            {anprStats.top_frequent?.length > 0 && (
                                <div className="mt-4">
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Most Frequent Plates</div>
                                    <div className="flex flex-wrap gap-2">
                                        {anprStats.top_frequent.map((p, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-[#0071EB]/10 border border-[#0071EB]/20 rounded-lg text-xs text-[#0071EB] font-mono font-bold">
                                                {p.plate} <span className="text-gray-500 font-sans">×{p.count}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Hourly Pattern Chart */}
                    {trafficAI?.daily_pattern?.length > 0 && (
                        <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-4">
                            <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-[#0071EB]" /> 24-Hour Traffic Pattern</h3>
                            <div style={{ height: '260px' }}>
                                <Bar data={{
                                    labels: trafficAI.daily_pattern.map(d => `${d.hour}:00`),
                                    datasets: [{
                                        label: 'Avg Vehicles',
                                        data: trafficAI.daily_pattern.map(d => d.avg_vehicles),
                                        backgroundColor: trafficAI.daily_pattern.map(d =>
                                            d.avg_vehicles > 18 ? 'rgba(239,68,68,0.5)' :
                                            d.avg_vehicles > 10 ? 'rgba(245,158,11,0.5)' : 'rgba(16,185,129,0.5)'
                                        ),
                                        borderRadius: 6, borderSkipped: false, barPercentage: 0.7,
                                    }]
                                }} options={{...chartOptions, plugins: {...chartOptions.plugins, legend: {display: false}}}} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ ANPR TAB ═══ */}
            {activeTab === 'anpr' && (
                <div className="space-y-4">
                    {/* Search */}
                    <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                                <input type="text" value={plateSearch} onChange={e => { setPlateSearch(e.target.value); setPlatePage(1); }}
                                    placeholder="Search plate number (e.g. KL 07 AB 1234)..."
                                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#0071EB] transition-colors" />
                            </div>
                            <button onClick={fetchPlates} className="px-4 py-2.5 bg-[#0071EB]/10 border border-[#0071EB]/30 rounded-lg text-xs text-[#0071EB] font-semibold hover:bg-[#0071EB]/20 transition-colors flex items-center gap-1.5">
                                <Search className="w-3.5 h-3.5" /> Search
                            </button>
                        </div>
                    </div>

                    {/* ANPR Table */}
                    <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-white/[0.06]">
                            <h3 className="text-xs font-bold text-white flex items-center gap-2">
                                <Shield className="w-3.5 h-3.5 text-[#0071EB]" /> Number Plate Detections
                                {plateLogs && <span className="text-gray-500 font-normal ml-2">({plateLogs.total} total)</span>}
                            </h3>
                        </div>

                        {plateLogs?.logs?.length > 0 ? (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead><tr className="border-b border-white/[0.06]">
                                            {['Plate Number', 'Lane', 'Camera', 'Confidence', 'Timestamp'].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-[10px] text-gray-500 uppercase tracking-widest font-bold">{h}</th>
                                            ))}
                                        </tr></thead>
                                        <tbody>
                                            {plateLogs.logs.map((log, i) => (
                                                <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-4 py-3 text-xs font-mono font-bold text-[#0071EB]">{log.plate_number}</td>
                                                    <td className="px-4 py-3 text-xs text-gray-300">Lane {log.lane_id}</td>
                                                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[150px] truncate">{log.camera_source}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            log.confidence >= 0.8 ? 'bg-green-500/15 text-green-400' :
                                                            log.confidence >= 0.5 ? 'bg-yellow-500/15 text-yellow-400' :
                                                            'bg-red-500/15 text-red-400'
                                                        }`}>{(log.confidence * 100).toFixed(0)}%</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-500">{log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}</td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                <div className="p-4 border-t border-white/[0.06] flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Page {plateLogs.page} · {plateLogs.total} results</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => setPlatePage(p => Math.max(1, p - 1))} disabled={platePage <= 1}
                                            className="p-1.5 border border-white/[0.1] rounded-lg text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => setPlatePage(p => p + 1)} disabled={plateLogs.logs.length < 15}
                                            className="p-1.5 border border-white/[0.1] rounded-lg text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="p-12 text-center">
                                <Eye className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-500 text-sm font-medium">No plate detections yet</p>
                                <p className="text-gray-600 text-xs mt-1">Plates will appear here once detected from camera feeds</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
