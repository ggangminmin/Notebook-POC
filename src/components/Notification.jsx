import React, { useEffect, useState } from 'react';
import { Check, Info, AlertTriangle, X, Settings, Sparkles } from 'lucide-react';

/**
 * Premium Notification Component
 * Looks similar to the AI Behavior Settings popup header.
 */
const Notification = ({
    message,
    subMessage,
    type = 'success',
    isVisible,
    onClose,
    duration = 3000,
    language = 'ko'
}) => {
    const [shouldRender, setShouldRender] = useState(isVisible);

    useEffect(() => {
        if (isVisible) {
            setShouldRender(true);
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        } else {
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 300); // Wait for animation
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    if (!shouldRender) return null;

    const config = {
        success: {
            icon: <Check className="w-5 h-5 text-white" />,
            bgColor: 'bg-[#9B4DEE]',
            shadowColor: 'shadow-purple-100',
            borderColor: 'border-purple-100',
            iconBoxColor: 'bg-[#9B4DEE]',
            textColor: 'text-[#9B4DEE]'
        },
        info: {
            icon: <Info className="w-5 h-5 text-white" />,
            bgColor: 'bg-blue-500',
            shadowColor: 'shadow-blue-100',
            borderColor: 'border-blue-100',
            iconBoxColor: 'bg-blue-500',
            textColor: 'text-blue-500'
        },
        error: {
            icon: <AlertTriangle className="w-5 h-5 text-white" />,
            bgColor: 'bg-red-500',
            shadowColor: 'shadow-red-100',
            borderColor: 'border-red-100',
            iconBoxColor: 'bg-red-500',
            textColor: 'text-red-500'
        }
    };

    const theme = config[type] || config.success;

    return (
        <div
            className={`fixed top-10 left-1/2 -translate-x-1/2 z-[300] transition-all duration-300 transform ${isVisible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95'
                }`}
        >
            <div className={`bg-white rounded-2xl shadow-2xl border ${theme.borderColor} p-4 flex items-center space-x-4 min-w-[320px] max-w-md`}>
                {/* Icon Box - Mirroring SystemPromptPanel's header icon style */}
                <div className={`w-12 h-12 ${theme.iconBoxColor} rounded-2xl flex items-center justify-center shadow-lg ${theme.shadowColor}`}>
                    {type === 'success' && message.includes('지침') ? <Settings className="w-6 h-6 text-white" /> : theme.icon}
                </div>

                <div className="flex-1">
                    <h4 className="text-[15px] font-bold text-slate-800 tracking-tight">
                        {message}
                    </h4>
                    {subMessage ? (
                        <p className={`text-[12px] ${theme.textColor} font-medium mt-0.5`}>
                            {subMessage}
                        </p>
                    ) : (
                        <p className={`text-[11px] ${theme.textColor} font-medium mt-0.5 flex items-center`}>
                            <Sparkles className="w-3 h-3 mr-1.5" />
                            {language === 'ko' ? '시스템에 즉시 반영되었습니다.' : 'Applied to system immediately.'}
                        </p>
                    )}
                </div>

                <button
                    onClick={onClose}
                    className="p-1 hover:bg-slate-50 rounded-full text-slate-300 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default Notification;
