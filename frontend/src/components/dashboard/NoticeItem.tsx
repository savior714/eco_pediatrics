import React from 'react';

interface NoticeItemProps {
    text: string;
    date: string;
}

export function NoticeItem({ text, date }: NoticeItemProps) {
    return (
        <div className="flex items-start justify-between gap-3 p-3 bg-slate-50 rounded-xl active:bg-slate-100 transition-colors min-h-[44px]">
            <p className="text-sm text-slate-700 font-medium line-clamp-2">{text}</p>
            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap shrink-0">{date}</span>
        </div>
    );
}
