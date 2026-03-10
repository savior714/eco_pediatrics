import React, { useState, useCallback } from 'react';
import { Bed, Notification } from '@/types/domain';
import { api } from '@/lib/api';
import { toaster } from '@/components/ui/Toast';
import { useStation } from './useStation';
import { useStationContext } from '@/contexts/StationContext';

export function useStationActions() {
    const stationData = useStation();
    const { beds, setBeds, notifications, removeNotification, fetchAdmissions } = stationData;

    // selectedRoom / qrBed / admitRoom → StationContext에서 관리
    const { selectedRoom, setSelectedRoom, selectedBed, qrBed, setQrBed, admitRoom, setAdmitRoom } = useStationContext();

    const [activeTab, setActiveTab] = useState<'patients' | 'meals'>('patients');

    const handleAdmit = useCallback(async (name: string, birthday: string, gender: string, attendingPhysician: string) => {
        if (!admitRoom) return;

        let formattedBirthday = birthday.trim();
        if (/^\d{8}$/.test(formattedBirthday)) {
            formattedBirthday = `${formattedBirthday.substring(0, 4)}-${formattedBirthday.substring(4, 6)}-${formattedBirthday.substring(6, 8)}`;
        }

        try {
            const birthDate = new Date(formattedBirthday);
            const today = new Date();

            if (birthDate > today) {
                toaster.create({ type: 'error', title: '입력 오류', description: '생년월일은 오늘 이후 날짜일 수 없습니다.' });
                return;
            }
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }

            if (age >= 19) {
                toaster.create({ type: 'error', title: '입력 오류', description: '만 19세 이상 성인은 입원이 불가능합니다.' });
                return;
            }

            await api.post('/api/v1/admissions', {
                patient_name: name,
                room_number: admitRoom,
                dob: formattedBirthday,
                gender: gender,
                attending_physician: attendingPhysician
            });

            toaster.create({ type: 'success', title: '입원 완료', description: '입원 수속이 완료되었습니다.' });
            setAdmitRoom(null);
            fetchAdmissions();
        } catch (e: unknown) {
            console.error(e);
            const msg = e instanceof Error ? e.message : '알 수 없는 오류';
            toaster.create({ type: 'error', title: '입원 처리 실패', description: msg });
        }
    }, [admitRoom, fetchAdmissions, setAdmitRoom]);

    const handleNotificationClick = useCallback((notif: Notification) => {
        const bed = beds.find(b => b.room === notif.room);
        if (bed) {
            setSelectedRoom(notif.room);
        } else {
            if (window.confirm(`${notif.room}호 변동사항을 확인하시겠습니까? (환자 정보 없음)`)) {
                removeNotification(notif.id);
            }
        }
    }, [beds, removeNotification, setSelectedRoom]);

    const handleDischargeAll = useCallback(async () => {
        if (!confirm('경고: DEV 모드 전용입니다.\n모든 환자를 퇴원 처리하시겠습니까?')) return;
        try {
            await api.post('/api/v1/dev/discharge-all', {});
            await fetchAdmissions();
            toaster.create({ type: 'success', title: '퇴원 완료', description: '모든 환자가 퇴원 처리되었습니다.' });
        } catch (e) {
            console.error('Discharge Error:', e);
            toaster.create({ type: 'error', title: '퇴원 실패', description: '퇴원 처리 중 오류가 발생했습니다.' });
        }
    }, [fetchAdmissions]);

    const handleSeedSingle = useCallback(async () => {
        try {
            const res = await api.post<{ error?: string; message?: string }>('/api/v1/dev/seed-single', {});
            if (res.error) {
                toaster.create({ type: 'error', title: '생성 실패', description: res.error });
            } else {
                await fetchAdmissions();
                toaster.create({ type: 'success', title: '더미 생성', description: res.message ?? '더미 환자가 생성되었습니다.' });
            }
        } catch (e: unknown) {
            console.error('Seed Error:', e);
            const msg = e instanceof Error ? e.message : '알 수 없는 오류';
            toaster.create({ type: 'error', title: '더미 생성 실패', description: `더미 생성 중 오류가 발생했습니다: ${msg}` });
        }
    }, [fetchAdmissions]);

    const handleCardClick = useCallback((room: string) => {
        setSelectedRoom(room);
    }, [setSelectedRoom]);

    const handleQrClick = useCallback((e: React.MouseEvent, bed: Bed) => {
        e.stopPropagation();
        if (bed.token) setQrBed(bed);
        else toaster.create({ type: 'error', title: '오류', description: '해당 환자의 토큰이 없습니다.' });
    }, [setQrBed]);

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
