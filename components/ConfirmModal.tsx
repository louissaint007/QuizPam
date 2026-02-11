
import React from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in slide-in-from-bottom-5 duration-300 overflow-hidden">
                {/* Accent Bar */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 via-blue-600 to-purple-600" />

                <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-2">
                        <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{title}</h3>
                        <p className="text-slate-400 font-bold text-sm leading-relaxed">{message}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <button
                            onClick={onClose}
                            className="py-4 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest border border-slate-700 transition-all"
                        >
                            Anile
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className="py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl shadow-[0_4px_0_rgb(185,28,28)] active:translate-y-1 active:shadow-none uppercase text-[10px] tracking-widest transition-all"
                        >
                            Efase
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
