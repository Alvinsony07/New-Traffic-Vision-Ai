import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { analytics } from '../api/client';
import { useToast } from '../context/ToastContext';
import { BarChart3, TrendingUp, PieChart, Clock, Truck, Zap, Brain } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

// Optimized dark-theme Chart.js defaults
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
            titleColor: '#f8fafc',
            bodyColor: '#d1d5db',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            cornerRadius: 10,
            padding: 12,
            titleFont: { weight: 700, size: 12 },
            bodyFont: { size: 11 },
            displayColors: true,
            boxPadding: 4,
        },
    },
    scales: {
        x: {
            ticks: { color: '#6b7280', font: { size: 10, weight: 500 }, maxRotation: 0 },
            grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
            border: { display: false },
        },
        y: {
            ticks: { color: '#6b7280', font: { size: 10, weight: 500 }, padding: 8 },
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            border: { display: false },
        },
    },
};

export default function AnalyticsPage() {
    const [statsData, setStatsData] = useState(null);
    const [predictions, setPredictions] = useState(null);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

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

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <div className="w-12 h-12 border-2 border-[#E50914]/20 border-t-[#E50914] rounded-full animate-spin" />
        </div>
    );

    // Trend chart
    const trendChart = {
        labels: (statsData?.trend || []).map(t => t.time),
        datasets: [{
            label: 'Vehicles',
            data: (statsData?.trend || []).map(t => t.count),
            borderColor: '#0071EB',
            backgroundColor: 'rgba(0,113,235,0.1)',
            fill: true, tension: 0.4, pointRadius: 2,
        }],
    };

    // Distribution chart
    const dist = statsData?.distribution || {};
    const distChart = {
        labels: Object.keys(dist),
        datasets: [{
            data: Object.values(dist),
            backgroundColor: ['#E50914', '#0071EB', '#46D369', '#E87C03', '#9B59B6', '#F5C518'],
            borderWidth: 0,
        }],
    };

    // Peak hours chart
    const peak = statsData?.peak_hours || {};
    const peakChart = {
        labels: Object.keys(peak).map(h => `${h}:00`),
        datasets: [{
            label: 'Total Vehicles',
            data: Object.values(peak),
            backgroundColor: Object.keys(peak).map(h => {
                const v = peak[h]; return v > 100 ? '#E50914' : v > 50 ? '#E87C03' : '#0071EB';
            }),
            borderRadius: 4,
        }],
    };

    // Lane performance chart
    const lane = statsData?.lane_performance || {};
    const laneChart = {
        labels: Object.keys(lane).map(l => `Lane ${l}`),
        datasets: [{
            label: 'Avg Vehicles',
            data: Object.values(lane),
            backgroundColor: ['#0071EB', '#46D369', '#E87C03', '#9B59B6'],
            borderRadius: 4,
        }],
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 pb-12">
            <div className="mb-6">
                <h2 className="text-3xl font-black tracking-[0.04em] text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                    ADVANCED ANALYTICS
                </h2>
                <p className="text-gray-500 text-sm">Traffic patterns, predictions, and performance metrics.</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                {[
                    { label: 'Data Points', value: statsData?.trend?.length || 0, icon: BarChart3, color: '#0071EB' },
                    { label: 'Vehicle Types', value: Object.keys(dist).length, icon: PieChart, color: '#46D369' },
                    { label: 'Peak Hour', value: predictions?.peak_prediction?.label || '--', icon: Clock, color: '#E87C03' },
                    { label: 'Emergency Events', value: statsData?.ambulance_events || 0, icon: Truck, color: '#E50914' },
                    { label: 'AI Model', value: predictions?.model?.split(' ')[0] || 'Historical', icon: Brain, color: '#9B59B6' },
                ].map((s, i) => (
                    <div key={i} className="bg-[#181818] border border-white/[0.06] rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.color + '15' }}>
                            <s.icon className="w-5 h-5" style={{ color: s.color }} />
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">{s.label}</div>
                            <div className="text-white font-bold text-lg leading-none">{s.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                {/* Traffic Volume Trend */}
                <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#0071EB]" /> Traffic Volume Trend
                    </h3>
                    <div style={{ height: '280px' }}>
                        <Line data={trendChart} options={chartOptions} />
                    </div>
                </div>

                {/* Vehicle Distribution */}
                <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-[#46D369]" /> Vehicle Distribution
                    </h3>
                    <div style={{ height: '280px' }} className="flex items-center justify-center">
                        <Doughnut data={distChart} options={{ ...chartOptions, scales: undefined, cutout: '55%' }} />
                    </div>
                </div>

                {/* Peak Traffic Hours */}
                <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#E87C03]" /> Peak Traffic Hours
                    </h3>
                    <div style={{ height: '280px' }}>
                        <Bar data={peakChart} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }} />
                    </div>
                </div>

                {/* Lane Performance */}
                <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-[#9B59B6]" /> Lane Load Performance
                    </h3>
                    <div style={{ height: '280px' }}>
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
                            {predictions.model} • Generated {predictions.generated_at}
                        </span>
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {predictions.predictions.map((p, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] text-center hover:bg-white/[0.05] transition-colors">
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">{p.label}</div>
                                <div className="text-2xl font-black text-white mb-1">{p.avg_vehicles}</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block"
                                    style={{ color: p.color, background: p.color + '20' }}>
                                    {p.level}
                                </div>
                                <div className="mt-2">
                                    <div className="w-full bg-white/[0.06] h-1 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all" style={{ width: `${p.confidence}%`, background: p.color }} />
                                    </div>
                                    <div className="text-[10px] text-gray-600 mt-1">{p.confidence}% confidence</div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
