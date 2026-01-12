import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = 'max-w-md'
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="absolute inset-0" onClick={onClose}></div>
            <div className={`relative bg-white dark:bg-corporate-900 rounded-xl shadow-2xl w-full ${maxWidth} overflow-hidden border border-corporate-200 dark:border-corporate-800 animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300`}>
                <div className="px-6 py-4 border-b border-corporate-100 dark:border-corporate-800 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-corporate-900 dark:text-white">
                        {title}
                    </h2>
                    <button onClick={onClose} className="text-corporate-400 hover:text-corporate-600 dark:hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};
