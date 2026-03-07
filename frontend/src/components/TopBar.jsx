import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function TopBar() {
    const [time, setTime] = useState(new Date().toLocaleTimeString('en-US'));

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date().toLocaleTimeString('en-US')), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <motion.header
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="h-16 bg-black/50 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 z-40 fixed top-0 left-[16rem] right-[22rem]"
        >
            <div className="flex items-center gap-6 h-full">
                {/* System Status */}
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">System Status</div>
                        <div className="text-sm text-white font-medium">OPERATIONAL</div>
                    </div>
                </div>

                <div className="h-2/3 w-px bg-white/10"></div>

                {/* Next Switch */}
                <div className="flex items-center gap-3">
                    <i className="fas fa-clock text-gray-500"></i>
                    <div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Next Switch</div>
                        <div className="text-sm font-mono text-white font-medium">12s</div>
                    </div>
                </div>

                <div className="h-2/3 w-px bg-white/10"></div>

                {/* Emergency Mode */}
                <div className="flex items-center gap-3 opacity-50">
                    <i className="fas fa-ambulance text-red-500"></i>
                    <div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Emergency</div>
                        <div className="text-sm text-gray-400 font-medium">INACTIVE</div>
                    </div>
                </div>

                <div className="h-2/3 w-px bg-white/10"></div>

                {/* Live Clock */}
                <div className="flex items-center gap-3">
                    <i className="fas fa-satellite-dish text-[#e50914]"></i>
                    <div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Live Clock</div>
                        <div className="text-sm font-mono text-[#e50914] font-medium">{time}</div>
                    </div>
                </div>
            </div>

            <div>
                <button className="flex items-center gap-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-md transition-colors text-white">
                    <i className="fas fa-cog text-gray-400"></i>
                    Configure Sources
                </button>
            </div>
        </motion.header>
    );
}
