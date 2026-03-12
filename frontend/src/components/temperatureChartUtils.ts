/**
 * 체온 차트용 도메인/포맷 유틸 — TemperatureGraph.tsx와 분리 (CRITICAL_LOGIC §2.1)
 */
import { getKSTDate, calculateHospitalDay } from '@/utils/dateUtils';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ProcessedChartResult<T extends { recorded_at: string; temperature: number }> {
    chartData: (T & { hospitalDay: number; timestamp: number })[];
    totalWidthPercent: number;
    gridTicks: number[];
    labelTicks: number[];
    yDomain: [number, number];
}

/**
 * 바이탈 배열을 입원일 기준 타임스탬프·스케일·틱으로 가공한다.
 * checkInAt/startDayMidnight가 없거나 데이터가 없으면 기본값 반환.
 */
export function processChartData<T extends { recorded_at: string; temperature: number }>(
    data: T[],
    checkInAt: string | null | undefined,
    startDayMidnight: number
): ProcessedChartResult<T> {
    if (!checkInAt || data.length === 0 || !startDayMidnight) {
        return {
            chartData: data as (T & { hospitalDay: number; timestamp: number })[],
            totalWidthPercent: 100,
            gridTicks: [],
            labelTicks: [],
            yDomain: [35.5, 41]
        };
    }

    const processTimestamp = (iso: string) => getKSTDate(iso).getTime();

    const processed = data
        .map(d => {
            const ts = processTimestamp(d.recorded_at);
            return {
                ...d,
                hospitalDay: calculateHospitalDay(checkInAt, new Date(d.recorded_at)),
                timestamp: ts
            };
        })
        .filter(d => d.timestamp >= startDayMidnight)
        .sort((a, b) => a.timestamp - b.timestamp) as (T & { hospitalDay: number; timestamp: number })[];

    let minTemp = 35.5;
    let maxTemp = 41;
    if (data.length > 0) {
        const temps = data.map(d => d.temperature);
        const minData = Math.min(...temps);
        const maxData = Math.max(...temps);
        if (minData < 35.5) minTemp = Math.floor(minData * 10) / 10 - 0.5;
        if (maxData > 41) maxTemp = Math.ceil(maxData * 10) / 10 + 0.5;
    }

    const lastDataPoint = processed[processed.length - 1];
    const lastTs = lastDataPoint ? lastDataPoint.timestamp : getKSTDate(new Date()).getTime();
    const diffMs = lastTs - startDayMidnight;
    const daysInRange = Math.ceil(diffMs / MS_PER_DAY);
    const displayDays = Math.max(5, daysInRange);

    const gridTicks: number[] = [];
    for (let i = 0; i <= displayDays; i++) {
        gridTicks.push(startDayMidnight + i * MS_PER_DAY);
    }

    const labelTicks: number[] = [];
    for (let i = 0; i < displayDays; i++) {
        labelTicks.push(startDayMidnight + i * MS_PER_DAY + 12 * 60 * 60 * 1000);
    }

    const totalWidthPercent = Math.max(100, displayDays * 20);

    return {
        chartData: processed,
        totalWidthPercent,
        gridTicks,
        labelTicks,
        yDomain: [minTemp, maxTemp]
    };
}

/**
 * 38°C 기준 그라데이트 오프셋 (0~1). Recharts linearGradient용.
 */
export function getTemperatureGradientOffset(
    chartData: { temperature: number }[]
): number {
    if (chartData.length === 0) return 0;
    const temps = chartData.map(d => d.temperature);
    const dataMax = Math.max(...temps);
    const dataMin = Math.min(...temps);
    if (dataMax <= 38) return 0;
    if (dataMin >= 38) return 1;
    return (dataMax - 38) / (dataMax - dataMin);
}

/**
 * X축 라벨: unixTime → "n일차"
 */
export function formatDayLabel(unixTime: number, startDayMidnight: number): string {
    const diffMs = unixTime - startDayMidnight;
    const day = Math.floor(diffMs / MS_PER_DAY) + 1;
    return `${day}일차`;
}

/**
 * 툴팁 날짜 포맷 (ko-KR)
 */
export function formatTooltipDate(ts: number): string {
    return new Date(ts).toLocaleString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
