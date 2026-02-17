import React from 'react';

interface ExamScheduleItemProps {
    date: string;
    time: string;
    name: string;
    note: string;
}

export function ExamScheduleItem({ date, time, name, note }: ExamScheduleItemProps) {
    return (
        <div className="flex gap-3 p-3 bg-violet-50/60 rounded-xl border border-violet-100 min-h-[44px]">
            <div className="shrink-0 text-center min-w-[4rem]">
                <p className="text-xs font-bold text-violet-600">{date}</p>
                <p className="text-[10px] text-slate-500">{time}</p>
            </div>
            <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800 text-sm">{name}</p>
                {note ? <p className="text-xs text-slate-500 mt-0.5">{note}</p> : null}
            </div>
        </div>
    );
}
