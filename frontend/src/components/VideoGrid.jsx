import { motion } from 'framer-motion';

export default function VideoGrid() {
    const lanes = [0, 1, 2, 3];

    return (
        <div className="grid grid-cols-2 gap-6 z-10 px-6 pt-6">
            {/* Summary Scorecards */}
            <div className="col-span-2 grid grid-cols-4 gap-4 mb-2">
                <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#110000] text-[#e50914] flex items-center justify-center text-xl shadow-[0_0_15px_rgba(229,9,20,0.5)]"><i className="fas fa-car-side"></i></div>
                    <div><div className="text-2xl font-black text-white">432</div><div className="text-[10px] uppercase tracking-widest text-[#e50914]">Total Vehicles</div></div>
                </div>
                <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-900/20 text-red-500 flex items-center justify-center text-xl"><i className="fas fa-triangle-exclamation"></i></div>
                    <div><div className="text-2xl font-black text-white">0</div><div className="text-[10px] uppercase tracking-widest text-red-500">Active Incidents</div></div>
                </div>
                <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-900/20 text-green-500 flex items-center justify-center text-xl"><i className="fas fa-brain"></i></div>
                    <div><div className="text-2xl font-black text-white">HIGH</div><div className="text-[10px] uppercase tracking-widest text-green-500">Detection Confidence</div></div>
                </div>
                <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-900/20 text-blue-500 flex items-center justify-center text-xl"><i className="fas fa-server"></i></div>
                    <div><div className="text-2xl font-black text-white">100%</div><div className="text-[10px] uppercase tracking-widest text-blue-500">System Uptime</div></div>
                </div>
            </div>

            {lanes.map((i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden relative group hover:border-white/30 transition-colors"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center px-4 py-3 border-b border-white/10 bg-black/60">
                        <span className="font-bold tracking-widest uppercase text-xs text-gray-300">Lane 0{i + 1}</span>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${i === 0 ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
                            <span className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]'}`}></span>
                            {i === 0 ? 'GREEN' : 'RED'}
                        </div>
                    </div>

                    {/* Video Placeholder */}
                    <div className="h-48 bg-gradient-to-b from-[#111] to-[#0a0a0a] relative flex items-center justify-center overflow-hidden">
                        <i className="fas fa-video-slash text-white/5 text-6xl absolute z-0"></i>
                        {/* Fake Scan Line */}
                        <motion.div
                            animate={{ y: ['-100%', '300%'] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                            className="absolute left-0 right-0 h-10 bg-gradient-to-b from-transparent via-[#e50914]/20 to-transparent pointer-events-none z-10"
                        ></motion.div>
                    </div>

                    {/* Stats */}
                    <div className="bg-black/80 px-4 py-3 flex justify-between items-center text-gray-300 border-t border-white/10">
                        <div className="flex gap-4">
                            <span className="flex items-center gap-2"><i className="fas fa-car text-gray-500"></i> {i * 12 + 5}</span>
                            <span className="flex items-center gap-2"><i className="fas fa-truck text-gray-500"></i> {i + 1}</span>
                            <span className="flex items-center gap-2"><i className="fas fa-motorcycle text-gray-500"></i> {i * 3}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] uppercase tracking-widest text-[#e50914] font-bold">TOTAL</span>
                            <div className="font-mono text-white text-lg font-bold">{i * 16 + 6}</div>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
