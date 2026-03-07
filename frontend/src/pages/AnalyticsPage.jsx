import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, RadialLinearScale
} from 'chart.js';
import { Line, Bar, Doughnut, PolarArea } from 'react-chartjs-2';
import { analytics } from '../api/client';
import { Activity, Car, FileText, AlertTriangle, TrendingUp, Clock, Download } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, RadialLinearScale);

// Chart.js global defaults
ChartJS.defaults.color = '#7b8baa';
ChartJS.defaults.font.family = "'Inter', sans-serif";
ChartJS.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';

export default function AnalyticsPage() {
    const [stats, setStats] = useState({
        total_reports: 0,
        pending_dispatches: 0,
        resolved_incidents: 0,
        avg_response_time: "0 mins",
        peak_hour: "N/A"
    });

    const [predictions, setPredictions] = useState({ labels: [], expected_traffic: [] });
    const [reportsData, setReportsData] = useState({ date_labels: [], counts: [] });

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const s = await analytics.stats();
                setStats(s);

                const p = await analytics.predictions();
                setPredictions(p);

                const r = await analytics.reportsData({ period: 'week' });
                setReportsData(r);
            } catch (err) {
                console.error("Error fetching analytics data", err);
            }
        };
        fetchAll();
        // optionally refresh every minute
        const t = setInterval(fetchAll, 60000);
        return () => clearInterval(t);
    }, []);

    const predictionChartData = {
        labels: predictions.labels?.length ? predictions.labels : ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00'],
        datasets: [{
            label: 'Expected Traffic Volume',
            data: predictions.expected_traffic?.length ? predictions.expected_traffic : [120, 150, 180, 140, 160, 200],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#0a0a0a',
            pointBorderColor: '#3b82f6',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
        }]
    };

    const incidentChartData = {
        labels: reportsData.date_labels?.length ? reportsData.date_labels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
            label: 'Incident Reports',
            data: reportsData.counts?.length ? reportsData.counts : [2, 5, 3, 8, 4, 7, 2],
            backgroundColor: 'rgba(229, 9, 20, 0.8)',
            borderColor: '#e50914',
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.5,
        }]
    };

    const severityChartData = {
        labels: ['Critical', 'Major', 'Minor', 'Unknown'],
        datasets: [{
            data: [stats.total_reports * 0.1, stats.total_reports * 0.3, stats.total_reports * 0.5, stats.total_reports * 0.1], // Simulated distribution for now
            backgroundColor: ['#e50914', '#f59e0b', '#3b82f6', '#6b7280'],
            borderWidth: 0,
            hoverOffset: 4
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: { usePointStyle: true, padding: 20, font: { size: 11, weight: '600' } }
            },
            tooltip: {
                backgroundColor: 'rgba(10, 10, 10, 0.9)',
                titleColor: '#fff',
                bodyColor: '#7b8baa',
                padding: 12,
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                cornerRadius: 8,
                displayColors: false,
            }
        },
        scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, border: { display: false } }
        }
    };

    const pieOptions = {
        ...chartOptions,
        scales: { x: { display: false }, y: { display: false } },
        cutout: '75%'
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

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-bl-[100px] pointer-events-none transition-transform group-hover:scale-110" />
                <div className="relative z-10">
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3 mb-1">
                        <TrendingUp className="w-7 h-7 text-[#3b82f6]" /> System Analytics
                    </h1>
                    <p className="text-gray-400 text-sm">Comprehensive performance metrics and predictive intelligence.</p>
                </div>
                <button
                    onClick={handleExport}
                    className="relative z-10 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all font-bold text-sm tracking-wide flex items-center gap-2"
                >
                    <Download className="w-4 h-4" /> Export CSV
                </button>
            </div>

            {/* Top Scorecards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-[#0a0a0a] border border-white/5 hover:border-white/10 rounded-2xl p-6 shadow-xl transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-red-500/10 rounded-xl">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Reports</span>
                    </div>
                    <div className="text-3xl font-black text-white">{stats.total_reports}</div>
                </div>

                <div className="bg-[#0a0a0a] border border-white/5 hover:border-white/10 rounded-2xl p-6 shadow-xl transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-[#f59e0b]/10 rounded-xl">
                            <Car className="w-5 h-5 text-[#f59e0b]" />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Tasks</span>
                    </div>
                    <div className="text-3xl font-black text-white">{stats.pending_dispatches}</div>
                </div>

                <div className="bg-[#0a0a0a] border border-white/5 hover:border-white/10 rounded-2xl p-6 shadow-xl transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-green-500/10 rounded-xl">
                            <Activity className="w-5 h-5 text-green-500" />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Resolved</span>
                    </div>
                    <div className="text-3xl font-black text-white">{stats.resolved_incidents}</div>
                </div>

                <div className="bg-[#0a0a0a] border border-white/5 hover:border-white/10 rounded-2xl p-6 shadow-xl transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-[#3b82f6]/10 rounded-xl">
                            <Clock className="w-5 h-5 text-[#3b82f6]" />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Avg Response</span>
                    </div>
                    <div className="text-3xl font-black text-white">{stats.avg_response_time}</div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 shadow-xl">
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#3b82f6]" /> Predictive Traffic Flow Model
                    </h2>
                    <div className="h-72">
                        <Line data={predictionChartData} options={chartOptions} />
                    </div>
                </div>

                <div className="lg:col-span-1 bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 shadow-xl">
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" /> Incident Severity Distribution
                    </h2>
                    <div className="h-64 relative">
                        <Doughnut data={severityChartData} options={pieOptions} />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-4">
                            <div className="text-center">
                                <div className="text-3xl font-black text-white">{stats.total_reports}</div>
                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Total</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#f59e0b]" /> Reported Incident Volumes Over Time
                    </h2>
                    <select className="bg-[#141414] border border-white/10 text-xs font-bold text-white rounded-lg px-3 py-1.5 outline-none">
                        <option value="week">Past 7 Days</option>
                        <option value="month">Past 30 Days</option>
                        <option value="year">Past Year</option>
                    </select>
                </div>
                <div className="h-80">
                    <Bar data={incidentChartData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }} />
                </div>
            </div>
        </div>
    );
}
