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
    Label,
    TooltipProps
} from 'recharts';
import { Card } from './Card';
import { Thermometer } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { calculateHospitalDay } from '@/utils/dateUtils';

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
    className?: string;
}

export function TemperatureGraph({ data, checkInAt, className }: TemperatureGraphProps) {
    // 1. Calculate hospital days logic
    const { chartData, totalWidthPercent, gridTicks, labelTicks, yDomain } = useMemo(() => {
        if (!checkInAt || data.length === 0) {
            return {
                chartData: data,
                totalWidthPercent: 100,
                gridTicks: [],
                labelTicks: [],
                yDomain: [35.5, 41]
            };
        }

        const startDate = new Date(checkInAt);
        const startDayMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();

        // Filter and process data to add 'hospitalDay' and precise timestamp
        const processed = data
            .filter(d => new Date(d.recorded_at).getTime() >= startDayMidnight) // Strictly filter out pre-admission data
            .map(d => {
                const date = new Date(d.recorded_at);
                const ts = date.getTime();
                return {
                    ...d,
                    hospitalDay: calculateHospitalDay(checkInAt, date),
                    timestamp: ts
                };
            });

        // Calculate Y-axis domain based on data
        let minTemp = 35.5;
        let maxTemp = 41;
        if (data.length > 0) {
            const temps = data.map(d => d.temperature);
            const minData = Math.min(...temps);
            const maxData = Math.max(...temps);
            if (minData < 35.5) minTemp = Math.floor(minData * 10) / 10 - 0.5;
            if (maxData > 41) maxTemp = Math.ceil(maxData * 10) / 10 + 0.5;
        }

        // Determine range for the X-axis (strictly from admission midnight)
        const lastDataPoint = processed[processed.length - 1];
        const lastTs = lastDataPoint ? lastDataPoint.timestamp : Date.now();
        const diffMs = lastTs - startDayMidnight;
        const daysInRange = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
        const displayDays = Math.max(5, daysInRange);

        // Generate ticks for each hospital day boundaries (midnight)
        const gridTicks = [];
        for (let i = 0; i <= displayDays; i++) {
            gridTicks.push(startDayMidnight + (i * 24 * 60 * 60 * 1000));
        }

        // Generate ticks for labels (mid-day, 12:00 PM) for centering
        const labelTicks = [];
        for (let i = 0; i < displayDays; i++) {
            const tickMid = startDayMidnight + (i * 24 * 60 * 60 * 1000) + (12 * 60 * 60 * 1000);
            labelTicks.push(tickMid);
        }

        // Horizontal scroll width calculation
        const widthPercent = Math.max(100, displayDays * 20); // 20% width per day

        return {
            chartData: processed,
            totalWidthPercent: widthPercent,
            gridTicks,
            labelTicks,
            yDomain: [minTemp, maxTemp]
        };
    }, [data, checkInAt]);

    // Generate unique ID for the gradient to prevent conflicts when multiple charts are present
    // Note: useId returns a string containing colons (e.g. ":r1:"), which are invalid in CSS usageUrl without escaping.
    // We replace colons with dashes to ensure a valid ID.
    const rawId = React.useId();
    const gradientId = `tempColor-${rawId.replace(/:/g, '')}`;

    const latestTemp = data.length > 0 ? data[data.length - 1].temperature : null;

    // Calculate gradient offset based on the actual DATA RANGE, because the linearGradient
    // is applied to the Line path's bounding box, not the YAxis domain.
    const gradientOffset = useMemo(() => {
        if (chartData.length === 0) return 0;

        const temps = chartData.map((d: any) => d.temperature);
        const dataMax = Math.max(...temps);
        const dataMin = Math.min(...temps);

        // Case 1: Entire range is below 38 -> All Teal
        if (dataMax <= 38) return 0;

        // Case 2: Entire range is above 38 -> All Red
        if (dataMin >= 38) return 1;

        // Case 3: 38 is within range
        // Recharts gradient: 0% is Top (Max), 100% is Bottom (Min).
        // (dataMax - 38) gives the distance from top to the threshold
        // (dataMax - dataMin) gives the total height of the line path
        return (dataMax - 38) / (dataMax - dataMin);
        // yDomain is not used in calculation
    }, [chartData]); // yDomain is not used in calculation

    return (
        <Card className={cn("w-full relative overflow-hidden border-slate-200/80", className)}>
            <div className="flex justify-between items-center gap-3 pb-3 bg-white z-10 relative">
                <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center shrink-0 border border-orange-100/50">
                        <Thermometer size={18} />
                    </span>
                    <h3 className="text-base font-bold text-slate-800">체온 차트</h3>
                </div>
                <div className="text-right">
                    <span className={cn(
                        "text-3xl font-bold drop-shadow-sm",
                        latestTemp && latestTemp >= 38.0 ? "text-status-danger" : "text-slate-800"
                    )}>
                        {latestTemp ?? '--'}°C
                    </span>
                </div>
            </div>

            {/* Scrollable Chart Area */}
            <div className="overflow-x-auto w-full touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="h-[260px] sm:h-[320px]" style={{ width: `${totalWidthPercent}%`, minWidth: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={chartData}
                            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset={0} stopColor="#ef4444" />
                                    <stop offset={gradientOffset} stopColor="#ef4444" />
                                    <stop offset={gradientOffset} stopColor="#14b8a6" />
                                    <stop offset={1} stopColor="#14b8a6" />
                                </linearGradient>
                            </defs>

                            <XAxis
                                dataKey="timestamp"
                                type="number"
                                domain={[gridTicks[0], gridTicks[gridTicks.length - 1]]}
                                scale="time"
                                ticks={labelTicks}
                                tickFormatter={(unixTime) => {
                                    if (!checkInAt) return '';
                                    return `${calculateHospitalDay(checkInAt, new Date(unixTime))}일차`;
                                }}
                                stroke="#94a3b8"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tick={{ dy: 10 }}
                                padding={{ left: 0, right: 0 }}
                            />
                            <YAxis
                                domain={yDomain}
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
                                content={({ active, payload, label }: TooltipProps<number, string>) => {
                                    if (!active || !payload?.length || !payload[0]?.payload) return null;
                                    const p = payload[0].payload as any; // Cast payload to any or specific type if accessible
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
                            {gridTicks.map((tick, i) => (
                                <ReferenceLine key={i} x={tick} stroke="#e2e8f0" strokeDasharray="3 3" />
                            ))}

                            {/* Single Continuous Line with Gradient Stroke */}
                            <Line
                                type="monotone"
                                dataKey="temperature"
                                stroke={`url(#${gradientId})`}
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
