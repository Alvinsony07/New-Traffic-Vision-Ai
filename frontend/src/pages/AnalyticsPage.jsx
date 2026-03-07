import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, RadialLinearScale, Filler
} from 'chart.js';
import { Line, Bar, Doughnut, PolarArea } from 'react-chartjs-2';
import { analytics } from '../api/client';
import { Activity, Car, TrendingUp, Clock, Download, Layers, BarChart3, PieChart, Zap } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, RadialLinearScale, Filler);

// Chart.js global theme
ChartJS.defaults.color = '#808080';
ChartJS.defaults.font.family = "'Inter', sans-serif";
ChartJS.defaults.font.weight = '500';
ChartJS.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.04)';

// Animated stat counter
function AnimatedStat({ value, label, icon: Icon, color }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        const target = Number(value) || 0;
        const duration = 800;
        const start = 0;
        const step = target / (duration / 16);
        let current = start;
        const timer = setInterval(() => {
            current += step;
            if (current >= target) { current = target; clearInterval(timer); }
            setDisplay(Math.round(current));
        }, 16);
        return () => clearInterval(timer);
    }, [value]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#181818] border border-white/[0.06] hover:border-white/[0.1] rounded-2xl p-5 shadow-lg transition-all group"
        >
            <div className="flex justify-between items-start mb-3">
                <div className={`p-2.5 rounded-xl bg-opacity-10`} style={{ backgroundColor: `${color}15` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div className="text-xs font-bold text-gray-600 uppercase tracking-widest text-right max-w-[80px]">{label}</div>
            </div>
            <div className="text-3xl font-black text-white tabular-nums">{display}</div>
        </motion.div>
    );
}

export default function AnalyticsPage() {
    const [stats, setStats] = useState(null);
    const [predictions, setPredictions] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [s, p] = await Promise.all([
                    analytics.stats(),
                    analytics.predictions(),
                ]);
                setStats(s);
                setPredictions(p);
            } catch (err) {
                console.error("Error fetching analytics:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
        const t = setInterval(fetchAll, 60000);
        return () => clearInterval(t);
    }, []);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 rounded-full border-2 border-[#E50914]/20 border-t-[#E50914] animate-spin" />
                    <p className="text-xs text-gray-600 uppercase tracking-[0.3em] font-bold">Loading Analytics</p>
                </div>
            </div>
        );
    }

    // Extract data from backend response
    const trend = stats?.trend || [];
    const distribution = stats?.distribution || {};
    const peakHours = stats?.peak_hours || {};
    const lanePerf = stats?.lane_performance || {};
    const ambulanceEvents = stats?.ambulance_events || 0;

    const predList = predictions?.predictions || [];

    // Traffic Volume Trend Chart
    const trendChartData = {
        labels: trend.map(t => t.time),
        datasets: [{
            label: 'Vehicle Count',
            data: trend.map(t => t.count),
            borderColor: '#E50914',
            backgroundColor: 'rgba(229, 9, 20, 0.08)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#141414',
            pointBorderColor: '#E50914',
            pointBorderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6
        }]
    };

    // Vehicle Type Distribution
    const distLabels = Object.keys(distribution);
    const distValues = Object.values(distribution);
    const distColors = ['#E50914', '#0071EB', '#46D369', '#E87C03', '#9B59B6'];

    const distributionChartData = {
        labels: distLabels.length > 0 ? distLabels : ['car', 'truck', 'bus', 'motorcycle', 'bicycle'],
        datasets: [{
            data: distValues.length > 0 ? distValues : [0, 0, 0, 0, 0],
            backgroundColor: distColors,
            borderWidth: 0,
            hoverOffset: 6
        }]
    };

    // Peak Hours Bar Chart
    const topHours = Object.entries(peakHours)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12);

    const peakChartData = {
        labels: topHours.map(([h]) => `${String(h).padStart(2, '0')}:00`),
        datasets: [{
            label: 'Traffic Volume',
            data: topHours.map(([, v]) => v),
            backgroundColor: topHours.map(([, v]) => {
                const max = Math.max(...topHours.map(([, val]) => val));
                const ratio = max > 0 ? v / max : 0;
                if (ratio > 0.7) return 'rgba(229, 9, 20, 0.8)';
                if (ratio > 0.4) return 'rgba(232, 124, 3, 0.7)';
                return 'rgba(70, 211, 105, 0.6)';
            }),
            borderRadius: 6,
            barPercentage: 0.6,
        }]
    };

    // Prediction Chart
    const predictionChartData = {
        labels: predList.map(p => p.label),
        datasets: [{
            label: 'Expected Vehicles',
            data: predList.map(p => p.avg_vehicles),
            borderColor: '#0071EB',
            backgroundColor: 'rgba(0, 113, 235, 0.08)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: predList.map(p => p.color),
            pointBorderColor: predList.map(p => p.color),
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 8
        }]
    };

    // Lane performance
    const laneChartData = {
        labels: Object.keys(lanePerf).map(k => `Lane ${k}`),
        datasets: [{
            label: 'Avg Vehicles',
            data: Object.values(lanePerf),
            backgroundColor: ['rgba(229,9,20,0.2)', 'rgba(0,113,235,0.2)', 'rgba(70,211,105,0.2)', 'rgba(232,124,3,0.2)'],
            borderColor: ['#E50914', '#0071EB', '#46D369', '#E87C03'],
            borderWidth: 2,
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: { usePointStyle: true, padding: 15, font: { size: 11, weight: '600' } }
            },
            tooltip: {
                backgroundColor: 'rgba(20, 20, 20, 0.95)',
                titleColor: '#fff',
                bodyColor: '#B3B3B3',
                padding: 14,
                borderColor: 'rgba(255,255,255,0.08)',
                borderWidth: 1,
                cornerRadius: 10,
                displayColors: true,
                titleFont: { weight: '700' }
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
            y: { beginAtZero: true, border: { display: false }, ticks: { font: { size: 10 } } }
        }
    };

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: { usePointStyle: true, padding: 12, font: { size: 10, weight: '600' } }
            },
            tooltip: {
                backgroundColor: 'rgba(20, 20, 20, 0.95)',
                padding: 12,
                cornerRadius: 8,
            }
        },
        cutout: '72%'
    };

    const handleExport = async () => {
        try {
            const blob = await analytics.exportCsv();
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'traffic_analytics_export.csv');
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            alert('Failed to export data');
        }
    };

    const totalVehiclesTracked = trend.reduce((sum, t) => sum + t.count, 0);

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#181818] border border-white/[0.06] rounded-2xl p-6 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-72 h-72 bg-[#0071EB]/[0.03] rounded-bl-[120px] pointer-events-none" />
                <div className="relative z-10">
                    <h1 className="text-3xl font-black tracking-[0.04em] text-white flex items-center gap-3 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                        <TrendingUp className="w-7 h-7 text-[#0071EB]" /> SYSTEM ANALYTICS
                    </h1>
                    <p className="text-gray-500 text-sm font-medium">Comprehensive traffic metrics, predictions, and performance intelligence.</p>
                </div>
                <button
                    onClick={handleExport}
                    className="relative z-10 px-5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white rounded-xl transition-all font-bold text-xs tracking-wider flex items-center gap-2 hover:border-white/[0.15]"
                >
                    <Download className="w-4 h-4" /> EXPORT CSV
                </button>
            </div>

            {/* Scorecards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <AnimatedStat value={totalVehiclesTracked} label="Total Tracked" icon={Car} color="#E50914" />
                <AnimatedStat value={distLabels.length} label="Vehicle Types" icon={Layers} color="#0071EB" />
                <AnimatedStat value={ambulanceEvents} label="Emergencies" icon={Activity} color="#46D369" />
                <AnimatedStat value={predList.length > 0 ? Math.round(predictions?.peak_prediction?.avg_vehicles || 0) : 0} label="Peak Predicted" icon={Zap} color="#E87C03" />
            </div>

            {/* Charts Row 1: Trend + Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#181818] border border-white/[0.06] rounded-2xl p-6 shadow-lg">
                    <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-5 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-[#E50914]" /> Traffic Volume Trend
                    </h2>
                    <div className="h-72">
                        {trend.length > 0 ? (
                            <Line data={trendChartData} options={chartOptions} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-600 text-sm">No trend data yet — start processing video feeds</div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-1 bg-[#181818] border border-white/[0.06] rounded-2xl p-6 shadow-lg">
                    <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-5 flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-[#0071EB]" /> Vehicle Distribution
                    </h2>
                    <div className="h-64 relative">
                        <Doughnut data={distributionChartData} options={pieOptions} />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <div className="text-2xl font-black text-white">{distValues.reduce((a, b) => a + b, 0)}</div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Total</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row 2: Predictions + Peak Hours */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-6 shadow-lg">
                    <div className="flex justify-between items-center mb-5">
                        <h2 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-[#0071EB]" /> Traffic Predictions
                        </h2>
                        {predictions?.model && (
                            <span className="text-xs bg-[#0071EB]/10 text-[#0071EB] px-2 py-1 rounded font-bold tracking-wider border border-[#0071EB]/20">
                                {predictions.model}
                            </span>
                        )}
                    </div>
                    <div className="h-64">
                        {predList.length > 0 ? (
                            <Line data={predictionChartData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-600 text-sm">Predictions require historical data</div>
                        )}
                    </div>
                    {/* Prediction Cards */}
                    {predList.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-4">
                            {predList.slice(0, 3).map((p, i) => (
                                <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 text-center">
                                    <div className="text-xs text-gray-500 font-bold">{p.label}</div>
                                    <div className="text-lg font-black text-white">{p.avg_vehicles}</div>
                                    <div className={`text-xs font-bold uppercase tracking-wider mt-1`} style={{ color: p.color }}>{p.level}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-6 shadow-lg">
                    <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-5 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#E87C03]" /> Peak Hour Analysis
                    </h2>
                    <div className="h-64">
                        {topHours.length > 0 ? (
                            <Bar data={peakChartData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-600 text-sm">No hourly data available yet</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Lane Performance */}
            {Object.keys(lanePerf).length > 0 && (
                <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-6 shadow-lg">
                    <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-5 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#46D369]" /> Lane Performance Comparison
                    </h2>
                    <div className="h-64">
                        <PolarArea data={laneChartData} options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { position: 'right', labels: { usePointStyle: true, padding: 12, font: { size: 11 } } } },
                            scales: { r: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { display: false } } }
                        }} />
                    </div>
                </div>
            )}
        </div>
    );
}
