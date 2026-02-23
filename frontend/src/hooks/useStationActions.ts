import React, { useState, useMemo, useCallback } from 'react';
import { Bed, Notification } from '@/types/domain';
import { api } from '@/lib/api';
import { useStation } from './useStation';

export function useStationActions() {
    const stationData = useStation();
    const { beds, setBeds, notifications, removeNotification, fetchAdmissions } = stationData;

    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [qrBed, setQrBed] = useState<Bed | null>(null);
    const [admitRoom, setAdmitRoom] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'patients' | 'meals'>('patients');

    const selectedBed = useMemo(() => {
        if (!selectedRoom) return null;
        return beds.find(b => String(b.room) === selectedRoom) || null;
    }, [beds, selectedRoom]);

    const handleAdmit = useCallback(async (name: string, birthday: string, gender: string) => {
        if (!admitRoom) return;

        let formattedBirthday = birthday.trim();
        if (/^\d{8}$/.test(formattedBirthday)) {
            formattedBirthday = `${formattedBirthday.substring(0, 4)}-${formattedBirthday.substring(4, 6)}-${formattedBirthday.substring(6, 8)}`;
        }

        try {
            const birthDate = new Date(formattedBirthday);
            const today = new Date();

            // Defensive Check: Future date validation
            if (birthDate > today) {
                alert('생년월일은 오늘 이후 날짜일 수 없습니다.');
                return;
            }
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }

            if (age >= 19) {
                alert('만 19세 이상 성인은 입원이 불가능합니다.');
                return;
            }

            await api.post('/api/v1/admissions', {
                patient_name: name,
                room_number: admitRoom,
                dob: formattedBirthday,
                gender: gender
            });

            alert('입원 수속이 완료되었습니다.');
            setAdmitRoom(null);
            fetchAdmissions(); // Replace reload with state refresh
        } catch (e: any) {
            console.error(e);
            alert(`입원 처리 실패: ${e.message || '알 수 없는 오류'}`);
        }
    }, [admitRoom, fetchAdmissions]);

    const handleNotificationClick = useCallback((notif: Notification) => {
        const bed = beds.find(b => b.room === notif.room);
        if (bed) {
            setSelectedRoom(notif.room);
        } else {
            if (window.confirm(`${notif.room}호 변동사항을 확인하시겠습니까? (환자 정보 없음)`)) {
                removeNotification(notif.id);
            }
        }
    }, [beds, removeNotification]);

    const handleDischargeAll = useCallback(async () => {
        if (!confirm('경고: DEV 모드 전용입니다.\n모든 환자를 퇴원 처리하시겠습니까?')) return;
        try {
            // 1. 백엔드 처리 대기
            await api.post('/api/v1/dev/discharge-all', {});

            // 2. 브로드캐스트가 동작하지만, 즉각적인 피드백을 위해 수동 갱신 병행
            await fetchAdmissions();

            alert('모든 환자가 퇴원 처리되었습니다.');
        } catch (e) {
            console.error('Discharge Error:', e);
            alert('퇴원 처리 중 오류가 발생했습니다.');
        }
    }, [fetchAdmissions]);

    const handleSeedSingle = useCallback(async () => {
        try {
            const res = await api.post('/api/v1/dev/seed-single', {}) as any;
            if (res.error) {
                alert(`생성 실패: ${res.error}`);
            } else {
                await fetchAdmissions();
                alert(res.message || '더미 환자가 생성되었습니다.');
            }
        } catch (e: any) {
            console.error('Seed Error:', e);
            alert(`더미 생성 중 오류가 발생했습니다: ${e.message}`);
        }
    }, [fetchAdmissions]);

    const handleCardClick = useCallback((room: string) => {
        setSelectedRoom(room);
    }, []);

    const handleQrClick = useCallback((e: React.MouseEvent, bed: Bed) => {
        e.stopPropagation();
        if (bed.token) setQrBed(bed);
        else alert('토큰 없음');
    }, []);

    return {
        stationData,
        state: {
            selectedRoom,
            qrBed,
            admitRoom,
            activeTab,
            selectedBed
        },
        actions: {
            setSelectedRoom,
            setQrBed,
            setAdmitRoom,
            setActiveTab,
            handleAdmit,
            handleNotificationClick,
            handleDischargeAll,
            handleSeedSingle,
            handleCardClick,
            handleQrClick,
            setBeds
        }
    };
}
