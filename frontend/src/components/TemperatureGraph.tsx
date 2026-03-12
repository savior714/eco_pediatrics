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
    ReferenceLine,
    TooltipProps
} from 'recharts';
import { Card } from './Card';
import { Thermometer } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getKSTMidnight } from '@/utils/dateUtils';
import {
    processChartData,
    getTemperatureGradientOffset,
    formatDayLabel,
    formatTooltipDate
} from './temperatureChartUtils';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface VitalData {
    time: string;
    temperature: number;
    has_medication: boolean;
    medication_type?: string;
    recorded_at: string;
    isOptimistic?: boolean;
}

interface ChartDotProps {
    cx: number;
    cy: number;
    payload: VitalData & { hospitalDay?: number; timestamp?: number };
    index: number;
    yAxis?: { scale?: (val: number) => number };
}

interface TemperatureGraphProps {
    data: VitalData[];
    checkInAt?: string | null;
    className?: string;
}

function TemperatureGraphBase({ data, checkInAt, className }: TemperatureGraphProps) {
    // [SSOT] Calculate KST Midnight once for shared use
    const startDayMidnight = useMemo(() => {
        return checkInAt ? getKSTMidnight(checkInAt) : 0;
    }, [checkInAt]);

    const { chartData, totalWidthPercent, gridTicks, labelTicks, yDomain } = useMemo(
        () => processChartData(data, checkInAt, startDayMidnight),
        [data, checkInAt, startDayMidnight]
    );

    // Generate unique ID for the gradient to prevent conflicts when multiple charts are present
    // Note: useId returns a string containing colons (e.g. ":r1:"), which are invalid in CSS usageUrl without escaping.
    // We replace colons with dashes to ensure a valid ID.
    const rawId = React.useId();
    const gradientId = `tempColor-${rawId.replace(/:/g, '')}`;

    const latestTemp = data.length > 0 ? data[0].temperature : null;

    const gradientOffset = useMemo(
        () => getTemperatureGradientOffset(chartData),
        [chartData]
    );

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
                                tickFormatter={(unixTime) =>
                                    !checkInAt || !startDayMidnight
                                        ? ''
                                        : formatDayLabel(unixTime, startDayMidnight)
                                }
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
                                                {label != null && formatTooltipDate(label)}
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
                                dot={(props: ChartDotProps) => {
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
                                            strokeOpacity={payload.isOptimistic ? 0.4 : 1}
                                            fillOpacity={payload.isOptimistic ? 0.4 : 1}
                                        />
                                    );
                                }}
                                activeDot={(props: unknown) => {
                                    const { cx, cy, payload } = props as ChartDotProps;
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
                                dataKey={(d: VitalData) => d.has_medication ? 40.7 : null}
                                stroke="none"
                                isAnimationActive={false}
                                dot={(props: ChartDotProps) => {
                                    const { cx, cy, payload, index } = props;
                                    if (!payload.has_medication) return <path key={`med-empty-${index}`} d="" />;

                                    const value = payload.medication_type || 'M';
                                    const color = value === 'A' ? '#fb923c' : '#8b5cf6';

                                    // Prevent overlapping by alternating Y position
                                    const yOffset = (index % 2 === 0) ? 0 : 15;
                                    const adjustedCy = cy + yOffset;

                                    // Calculate Temperature point Y coordinate to limit the vertical line
                                    // Recharts passes yScale in props.yAxis.scale
                                    const yScale = props.yAxis?.scale;
                                    const tempCy = yScale ? yScale(payload.temperature) : cy;

                                    return (
                                        <g key={`med-${payload.recorded_at}`}>
                                            {/* Vertical Line - Ends at temp line point */}
                                            <line
                                                x1={cx} y1={adjustedCy + 10}
                                                x2={cx} y2={tempCy}
                                                stroke={color}
                                                strokeDasharray="2 2"
                                                strokeOpacity={0.3}
                                            />

                                            {/* Label Box */}
                                            <g transform={`translate(${cx - 8}, ${adjustedCy - 10})`}>
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

function arePropsEqual(prev: TemperatureGraphProps, next: TemperatureGraphProps): boolean {
    if (prev.checkInAt !== next.checkInAt) return false;
    if (prev.className !== next.className) return false;
    if (prev.data === next.data) return true;

    const prevData = prev.data;
    const nextData = next.data;
    if (prevData.length !== nextData.length) return false;

    // 역순 순회: 최신(배열 끝)부터 과거(앞)로 검사. 최신 추가/사후 수정이 빈번하므로 Early Return 유도.
    for (let i = prevData.length - 1; i >= 0; i--) {
        const p = prevData[i];
        const n = nextData[i];
        if (
            p.recorded_at !== n.recorded_at ||
            p.temperature !== n.temperature ||
            p.has_medication !== n.has_medication ||
            p.medication_type !== n.medication_type ||
            p.isOptimistic !== n.isOptimistic
        ) {
            return false;
        }
    }
    return true;
}

export const TemperatureGraph = React.memo(TemperatureGraphBase, arePropsEqual);
