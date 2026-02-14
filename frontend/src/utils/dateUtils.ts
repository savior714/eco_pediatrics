export function calculateHospitalDay(checkInAt: string | null | undefined, targetDate: Date = new Date()): number {
    if (!checkInAt) return 0;

    const startDate = new Date(checkInAt);
    // Normalize start date to midnight of the check-in day
    const startDayMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();

    // Normalize target date to current time (or target time)
    const current = targetDate.getTime();

    // Calculate day difference from the start day midnight
    // If admitted today (e.g., 8 PM) and it's now (9 PM), diff is positive but less than 24h.
    // However, we want 1st day to be Day 1.
    // Logic: (Current Time - Start Midnight) / 24h
    // Example: Admitted 8 PM (Start Midnight 00:00). Current 9 PM. Diff 21h. 21/24 = 0.875. Floor + 1 = 1.
    // Example: Admitted 8 PM. Next day 1 AM. Diff 25h. 25/24 = 1.04. Floor + 1 = 2.

    const diffMs = current - startDayMidnight;
    if (diffMs < 0) return 1; // Should not happen if checkInAt is valid, but fallback to Day 1

    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/** 현재 시각 기준 "앞으로의 3끼" 라벨 및 메타데이터. 6~13시 / 14~18시 / 19~5시 구간. */
export function getNextThreeMealSlots(now: Date = new Date()): { label: string; date: string; meal_time: 'BREAKFAST' | 'LUNCH' | 'DINNER' }[] {
    const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const today = formatDate(now);
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = formatDate(tomorrowDate);

    const h = now.getHours();

    if (h < 6) return [
        { label: '오늘 아침', date: today, meal_time: 'BREAKFAST' },
        { label: '오늘 점심', date: today, meal_time: 'LUNCH' },
        { label: '오늘 저녁', date: today, meal_time: 'DINNER' }
    ];
    if (h >= 6 && h < 14) return [
        { label: '오늘 점심', date: today, meal_time: 'LUNCH' },
        { label: '오늘 저녁', date: today, meal_time: 'DINNER' },
        { label: '내일 아침', date: tomorrow, meal_time: 'BREAKFAST' }
    ];
    if (h >= 14 && h < 19) return [
        { label: '오늘 저녁', date: today, meal_time: 'DINNER' },
        { label: '내일 아침', date: tomorrow, meal_time: 'BREAKFAST' },
        { label: '내일 점심', date: tomorrow, meal_time: 'LUNCH' }
    ];
    return [
        { label: '내일 아침', date: tomorrow, meal_time: 'BREAKFAST' },
        { label: '내일 점심', date: tomorrow, meal_time: 'LUNCH' },
        { label: '내일 저녁', date: tomorrow, meal_time: 'DINNER' }
    ];
}
