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
    ReferenceLine,
    Label
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
    medication_type?: string;
    recorded_at: string;
}

interface TemperatureGraphProps {
    data: VitalData[];
    checkInAt?: string | null;
}

export function TemperatureGraph({ data, checkInAt }: TemperatureGraphProps) {
    // ... lines 37-160
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

    // 38도 기준 선 색상 변경을 위해 Gradient 사용, 데이터 분리 로직 제거

    const latestTemp = data.length > 0 ? data[data.length - 1].temperature : null;

    return (
        <Card className="w-full relative overflow-hidden border-slate-200/80">
            <div className="flex justify-between items-start gap-3 pb-3 bg-white z-10 relative">
                <div>
                    <h3 className="text-base font-bold text-slate-800">체온 차트</h3>
                    <p className="text-xs text-slate-500 mt-0.5">입원 기간 전체</p>
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
                <div className="h-[260px] sm:h-[320px]" style={{ width: `${totalWidthPercent}%`, minWidth: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={chartData}
                            margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#f1f5f9" />

                            <defs>
                                <linearGradient id="tempColor" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ef4444" />
                                    <stop offset={`${(41 - 38) / (41 - 35.5) * 100}%`} stopColor="#ef4444" />
                                    <stop offset={`${(41 - 38) / (41 - 35.5) * 100}%`} stopColor="#14b8a6" />
                                    <stop offset="100%" stopColor="#14b8a6" />
                                </linearGradient>
                            </defs>

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
                                domain={[35.5, 41]}
                                stroke="#94a3b8"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                width={30}
                                ticks={[36, 37, 38, 39, 40, 41]}
                            />
                            {/* Fever Threshold Line */}
                            <ReferenceLine y={38} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: '38°', fill: '#ef4444', fontSize: 10 }} />
                            <Tooltip
                                content={({ active, payload, label }: any) => {
                                    if (!active || !payload?.length || !payload[0]?.payload) return null;
                                    const p = payload[0].payload;
                                    return (
                                        <div className="rounded-xl border-none shadow-lg bg-white/95 px-3 py-2">
                                            <p className="text-xs text-slate-500 mb-0.5">
                                                {label != null && new Date(label).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <p className="text-slate-800 font-semibold">체온 {p.temperature?.toFixed(1)}°C</p>
                                        </div>
                                    );
                                }}
                            />

                            {/* Day Separators (Vertical Lines for visually distinguishing columns) */}
                            {ticks.map((tick, i) => (
                                <ReferenceLine key={i} x={tick} stroke="#e2e8f0" strokeDasharray="3 3" />
                            ))}

                            {/* Single Continuous Line with Gradient Stroke */}
                            <Line
                                type="monotone"
                                dataKey="temperature"
                                stroke="url(#tempColor)"
                                strokeWidth={3}
                                dot={(props: any) => {
                                    const { cx, cy, payload } = props;
                                    const isFever = payload.temperature >= 38.0;
                                    return (
                                        <circle
                                            key={`dot-${payload.recorded_at}`}
                                            cx={cx}
                                            cy={cy}
                                            r={4}
                                            fill="#fff"
                                            stroke={isFever ? '#ef4444' : '#14b8a6'}
                                            strokeWidth={2}
                                        />
                                    );
                                }}
                                activeDot={(props: any) => {
                                    const { cx, cy, payload } = props;
                                    const isFever = payload.temperature >= 38.0;
                                    return (
                                        <circle
                                            cx={cx}
                                            cy={cy}
                                            r={6}
                                            fill={isFever ? '#ef4444' : '#14b8a6'}
                                            stroke="#fff"
                                            strokeWidth={2}
                                        />
                                    );
                                }}
                                connectNulls
                                isAnimationActive={false}
                            />

                            {/* Medication Labels */}
                            <Line
                                data={chartData}
                                dataKey={(d: any) => d.has_medication ? 40.7 : null}
                                stroke="none"
                                isAnimationActive={false}
                                dot={(props: any) => {
                                    const { cx, cy, payload } = props;
                                    if (!payload.has_medication) return <path d="" />;

                                    const value = payload.medication_type || 'M';
                                    const color = value === 'A' ? '#fb923c' : '#8b5cf6';

                                    return (
                                        <g key={`med-${payload.recorded_at}`}>
                                            {/* Connector Dot on the actual Line */}
                                            {/* (We could add a small dot here if needed, but keeping it clean) */}

                                            {/* Vertical Line */}
                                            <line
                                                x1={cx} y1={cy + 10}
                                                x2={cx} y2={cy + 250} // Approximate height to reach the temp line
                                                stroke={color}
                                                strokeDasharray="2 2"
                                                strokeOpacity={0.3}
                                            />

                                            {/* Label Box */}
                                            <g transform={`translate(${cx - 8}, ${cy - 10})`}>
                                                <rect
                                                    width="16"
                                                    height="16"
                                                    rx="4"
                                                    fill={color}
                                                    stroke="white"
                                                    strokeWidth="1"
                                                />
                                                <text
                                                    x="8"
                                                    y="12"
                                                    textAnchor="middle"
                                                    fill="white"
                                                    fontSize="10"
                                                    fontWeight="bold"
                                                >
                                                    {value}
                                                </text>
                                            </g>
                                        </g>
                                    );
                                }}
                            />
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
