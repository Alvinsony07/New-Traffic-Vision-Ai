import React, { createContext, useState, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-4 h-4 text-[#46D369]" />;
            case 'error': return <AlertTriangle className="w-4 h-4 text-[#E50914]" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-[#E87C03]" />;
            default: return <Info className="w-4 h-4 text-[#0071EB]" />;
        }
    };

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            className="bg-[#181818] border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.5)] rounded-xl p-3 pl-4 flex items-center gap-3 min-w-[250px] pointer-events-auto max-w-sm"
                        >
                            <div className="shrink-0">{getIcon(toast.type)}</div>
                            <p className="text-sm font-medium text-white flex-1 leading-snug">{toast.message}</p>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="p-1 hover:bg-white/[0.05] rounded-lg transition-colors shrink-0 text-gray-500 hover:text-white"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);
