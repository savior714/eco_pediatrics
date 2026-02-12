'use client';

import React, { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceDot,
    ReferenceArea,
    ReferenceLine
} from 'recharts';
import { Card } from './Card';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface VitalData {
    time: string;
    temperature: number;
    has_medication: boolean;
    recorded_at: string;
}

interface TemperatureGraphProps {
    data: VitalData[];
    checkInAt?: string | null;
}

export function TemperatureGraph({ data, checkInAt }: TemperatureGraphProps) {
    // 1. Calculate hospital days logic
    const { chartData, totalWidthPercent, ticks } = useMemo(() => {
        if (!checkInAt || data.length === 0) return { chartData: data, totalWidthPercent: 100, ticks: [] };

        const startDate = new Date(checkInAt);
        // Normalize start date to midnight for day calculation
        const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

        // Process data to add 'hospitalDay' and relative time
        const processed = data.map(d => {
            const date = new Date(d.recorded_at);
            const diffTime = Math.abs(date.getTime() - startDay.getTime());
            const dayNum = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // Day 1, 2, 3...
            return {
                ...d,
                hospitalDay: dayNum,
                timestamp: date.getTime()
            };
        });

        // Determine range
        const maxDay = Math.max(5, ...processed.map(d => d.hospitalDay), 5); // Minimum 5 days
        const widthPercent = Math.max(100, maxDay * 20); // Each day 20% width

        // Generate X-Axis ticks for each day (start of each day)
        const dayTicks = [];
        for (let i = 0; i < maxDay; i++) {
            const tickDate = new Date(startDay);
            tickDate.setDate(startDay.getDate() + i);
            dayTicks.push(tickDate.getTime());
        }

        return { chartData: processed, totalWidthPercent: widthPercent, ticks: dayTicks };
    }, [data, checkInAt]);

    const latestTemp = data.length > 0 ? data[data.length - 1].temperature : null;

    return (
        <Card className="w-full relative shadow-lg border-teal-100 overflow-hidden">
            {/* Header - Fixed */}
            <div className="flex justify-between items-start mb-2 px-1 p-4 pb-0 bg-white z-10 relative">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">체온 차트</h3>
                    <p className="text-xs text-slate-400">입원 기간 전체</p>
                </div>
                <div className="text-right">
                    <span className={cn(
                        "text-3xl font-bold drop-shadow-sm",
                        latestTemp && latestTemp >= 38.0 ? "text-status-danger" : "text-slate-800"
                    )}>
                        {latestTemp ?? '--'}°C
                    </span>
                    <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
                        <span className="text-xs text-slate-500 font-medium">실시간</span>
                    </div>
                </div>
            </div>

            {/* Scrollable Chart Area */}
            <div className="overflow-x-auto w-full pb-2 touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div style={{ width: `${totalWidthPercent}%`, minWidth: '100%', height: '320px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={chartData}
                            margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#f1f5f9" />
                            {/* Normal Range Band */}
                            <ReferenceArea y1={36.5} y2={37.5} fill="#bbf7d0" fillOpacity={0.3} />

                            <XAxis
                                dataKey="timestamp"
                                type="number"
                                domain={['dataMin', 'dataMax']} // Or strictly start to end day
                                scale="time"
                                ticks={ticks}
                                tickFormatter={(unixTime) => {
                                    if (!checkInAt) return '';
                                    const date = new Date(unixTime);
                                    const start = new Date(checkInAt);
                                    const diff = Math.floor((date.getTime() - new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                    return `${diff}일차`;
                                }}
                                stroke="#94a3b8"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tick={{ dy: 10 }}
                            />
                            <YAxis
                                domain={[35, 40]}
                                stroke="#94a3b8"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                width={30}
                            />
                            <Tooltip
                                labelFormatter={(label) => new Date(label).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                contentStyle={{
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    padding: '8px 12px'
                                }}
                                itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                            />

                            {/* Day Separators (Vertical Lines for visually distinguishing columns) */}
                            {ticks.map((tick, i) => (
                                <ReferenceLine key={i} x={tick} stroke="#e2e8f0" strokeDasharray="3 3" />
                            ))}

                            <Line
                                type="monotone"
                                dataKey="temperature"
                                stroke="#14b8a6"
                                strokeWidth={3}
                                dot={{ r: 4, fill: '#fff', stroke: '#14b8a6', strokeWidth: 2 }}
                                activeDot={{ r: 6, fill: '#14b8a6', stroke: '#fff', strokeWidth: 2 }}
                                connectNulls
                            />

                            {chartData && chartData.map((entry: any, index: number) => (
                                entry.has_medication && (
                                    <ReferenceDot
                                        key={index}
                                        x={entry.timestamp}
                                        y={entry.temperature}
                                        r={5}
                                        fill="#ef4444"
                                        stroke="#fee2e2"
                                        strokeWidth={2}
                                    />
                                )
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
            {/* Scroll Hint Overlay (Fade out on interact? For now simple visual cue) */}
            {totalWidthPercent > 100 && (
                <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 bg-white/80 px-2 py-1 rounded-full pointer-events-none">
                    ← 좌우로 스크롤 →
                </div>
            )}
        </Card>
    );
}
