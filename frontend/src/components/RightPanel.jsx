import { motion } from 'framer-motion';

export default function RightPanel() {
    return (
        <motion.aside
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-[22rem] bg-black/60 backdrop-blur-xl border-l border-white/10 h-screen fixed right-0 top-0 z-50 p-6 flex flex-col gap-6"
        >
            {/* Incidents */}
            <div>
                <h3 className="text-[#e50914] flex items-center gap-2 mb-3 text-sm font-bold tracking-widest uppercase">
                    <i className="fas fa-exclamation-triangle"></i> Incident Reports
                </h3>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 min-h-[100px] flex items-center justify-center text-center">
                    <p className="text-gray-400 text-sm">No active accident reports.</p>
                </div>
            </div>

            {/* Dispatch History */}
            <div>
                <h3 className="text-purple-400 flex items-center gap-2 mb-3 text-sm font-bold tracking-widest uppercase">
                    <i className="fas fa-truck-medical"></i> Dispatch History
                </h3>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 min-h-[100px] flex items-center justify-center text-center">
                    <p className="text-gray-400 text-sm">No dispatches yet.</p>
                </div>
            </div>

            {/* Event Log */}
            <div className="flex-1 flex flex-col">
                <h3 className="text-blue-400 flex items-center gap-2 mb-3 text-sm font-bold tracking-widest uppercase">
                    <i className="fas fa-history"></i> Event Log
                </h3>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex-1 overflow-auto space-y-3">
                    <div className="flex justify-between items-start text-xs border-l-2 border-blue-500 pl-3">
                        <span className="text-blue-400 font-mono">10:15:22</span>
                        <span className="text-gray-300 ml-2">System Initialized</span>
                    </div>
                    <div className="flex justify-between items-start text-xs border-l-2 border-green-500 pl-3">
                        <span className="text-green-400 font-mono">10:15:24</span>
                        <span className="text-gray-300 ml-2">Video Engine Online</span>
                    </div>
                </div>
            </div>
        </motion.aside>
    );
}
