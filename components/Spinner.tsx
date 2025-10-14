import React from 'react';

const Spinner: React.FC<{ text?: string, size?: 'small' | 'medium' }> = ({ text, size = 'medium' }) => {
    const sizeClasses = size === 'small' ? 'h-5 w-5 border-2' : 'h-12 w-12 border-b-2';
    const textClasses = size === 'small' ? 'text-sm' : 'text-base';
    
    return (
        <div className="flex flex-col items-center justify-center space-y-2">
            <div className={`animate-spin rounded-full border-sky-400 ${sizeClasses}`} />
            {text && <p className={`text-sky-300 ${textClasses}`}>{text}</p>}
        </div>
    );
};

export default Spinner;
