// [SSOT] Robust KST Parser using Intl API
// Converts any Date/String to a Date object where the LOCAL time matches KST.
// Checks timezone agnostic "Day difference" calculation.
export function getKSTDate(d: Date | string): Date {
    const date = new Date(d);
    // Format to "MM/DD/YYYY, HH:mm:ss" in Asia/Seoul
    // Then parse back. The browser will treat the parsed string as Local time.
    // Result: A Date object where .getHours() returns KST hours.
    const kstString = date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' });
    return new Date(kstString);
}

export function getKSTMidnight(d: Date | string): number {
    const kst = getKSTDate(d);
    // Strip time components from the KST-shifted date
    return new Date(kst.getFullYear(), kst.getMonth(), kst.getDate()).getTime();
}

export function calculateHospitalDay(checkInAt: string | null | undefined, targetDate: Date = new Date()): number {
    if (!checkInAt) return 0;

    const startMidnight = getKSTMidnight(checkInAt);
    const targetMidnight = getKSTMidnight(targetDate);

    const diffMs = targetMidnight - startMidnight;
    if (diffMs < 0) return 1;

    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

export function calculateAge(dob: string | null | undefined): string {
    if (!dob) return '';
    const birthDate = getKSTDate(dob);
    const today = getKSTDate(new Date());

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
        years--;
        months += 12;
    }

    const totalMonths = years * 12 + months;

    if (totalMonths < 36) {
        return `${totalMonths}개월`;
    }
    return `${years}세`;
}

export function formatPatientDemographics(dob: string | null | undefined, gender: string | null | undefined): string {
    const ageStr = calculateAge(dob);
    if (!gender) return ageStr;
    const genderStr = gender === 'M' ? '남' : gender === 'F' ? '여' : gender;
    return ageStr ? `${ageStr}/${genderStr}` : genderStr;
}

// [SSOT] Consistent UI Formatters (KST)
export function formatKSTDate(iso: string): string {
    if (!iso) return '';
    const d = getKSTDate(iso);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const week = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    return `${m.toString().padStart(2, '0')}.${day.toString().padStart(2, '0')} (${week})`;
}

export function formatKSTTime(iso: string): string {
    if (!iso) return '';
    const d = getKSTDate(iso);
    const h = d.getHours();
    const m = d.getMinutes();
    const padM = m ? `:${m.toString().padStart(2, '0')}` : ':00';
    if (h < 12) return `오전 ${h === 0 ? 12 : h}${padM}`;
    return `오후 ${h === 12 ? 12 : h - 12}${padM}`;
}

/** 현재 시각 기준 "앞으로의 3끼" 라벨 및 메타데이터. 6~13시 / 14~18시 / 19~5시 구간. */
export function getNextThreeMealSlots(now: Date = new Date()): { label: string; date: string; meal_time: 'BREAKFAST' | 'LUNCH' | 'DINNER' }[] {
    const kstNow = getKSTDate(now);

    const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const todayDate = kstNow;
    const today = formatDate(todayDate);

    const tomorrowDate = new Date(kstNow);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = formatDate(tomorrowDate);

    const h = kstNow.getHours();

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
