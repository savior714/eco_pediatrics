'use client';

import React from 'react';
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
} from 'recharts';
import { Card } from './Card';

interface VitalData {
    time: string;
    temperature: number;
    has_medication: boolean;
}

interface TemperatureGraphProps {
    data: VitalData[];
}

export function TemperatureGraph({ data }: TemperatureGraphProps) {
    return (
        <Card className="w-full h-80 relative overflow-hidden shadow-lg border-teal-100">
            <div className="flex justify-between items-start mb-2 px-1">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">체온 차트</h3>
                    <p className="text-xs text-slate-400">최근 24시간</p>
                </div>
                <div className="text-right">
                    <span className="text-3xl font-bold text-status-danger drop-shadow-sm">
                        {data.length > 0 ? data[data.length - 1].temperature : '--'}°C
                    </span>
                    <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
                        <span className="text-xs text-slate-500 font-medium">실시간</span>
                    </div>
                </div>
            </div>

            <ResponsiveContainer width="100%" height="75%">
                <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <ReferenceArea y1={36.5} y2={37.5} fill="#bbf7d0" fillOpacity={0.3} />
                    <XAxis
                        dataKey="time"
                        stroke="#94a3b8"
                        fontSize={11}
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
                    />
                    <Tooltip
                        contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            backgroundColor: 'white',
                            padding: '8px 12px'
                        }}
                        itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="temperature"
                        stroke="#14b8a6"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#fff', stroke: '#14b8a6', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#14b8a6', stroke: '#fff', strokeWidth: 2 }}
                    />
                    {data.map((entry, index) => (
                        entry.has_medication && (
                            <ReferenceDot
                                key={index}
                                x={entry.time}
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
        </Card>
    );
}
