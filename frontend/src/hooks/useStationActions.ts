import React, { useState, useCallback } from 'react';
import { Bed, Notification } from '@/types/domain';
import { api } from '@/lib/api';
import { toaster } from '@/components/ui/Toast';
import { useStation } from './useStation';
import { useStationContext } from '@/contexts/StationContext';

/**
 * 스테이션 화면의 모든 사용자 인터랙션 액션을 관리하는 커스텀 훅.
 * 입원 수속·알림 클릭·전체 퇴원(Dev)·더미 생성(Dev)·카드 클릭·QR 클릭 핸들러를 제공한다.
 */
export function useStationActions() {
    const stationData = useStation();
    const { beds, setBeds, notifications, removeNotification, fetchAdmissions } = stationData;

    // selectedRoom / qrBed / admitRoom → StationContext에서 관리
    const { selectedRoom, setSelectedRoom, selectedBed, qrBed, setQrBed, admitRoom, setAdmitRoom } = useStationContext();

    const [activeTab, setActiveTab] = useState<'patients' | 'meals'>('patients');

    /**
     * 신규 환자 입원 수속을 처리한다.
     * 생년월일 형식 정규화, 미래 날짜·성인(만 19세 이상) 유효성 검증 후 API 호출한다.
     */
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

    /** 알림 클릭 시 해당 병실 환자 상세 모달을 열거나, 환자 정보가 없으면 알림 삭제 확인을 요청한다. */
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

    /** [Dev 전용] 모든 환자를 일괄 퇴원 처리하고 스테이션을 갱신한다. */
    const handleDischargeAll = useCallback(async () => {
        if (!confirm('경고: DEV 모드 전용입니다.\n모든 환자를 퇴원 처리하시겠습니까?')) return;
        try {
            await api.post('/api/v1/dev/discharge-all', {});
            await fetchAdmissions();
            toaster.create({ type: 'success', title: '퇴원 완료', description: '모든 환자가 퇴원 처리되었습니다.' });
        } catch (e) {
            console.error('전체 퇴원 오류:', e);
            toaster.create({ type: 'error', title: '퇴원 실패', description: '퇴원 처리 중 오류가 발생했습니다.' });
        }
    }, [fetchAdmissions]);

    /** [Dev 전용] 더미 환자 1명을 생성하고 스테이션을 갱신한다. */
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
            console.error('더미 생성 오류:', e);
            const msg = e instanceof Error ? e.message : '알 수 없는 오류';
            toaster.create({ type: 'error', title: '더미 생성 실패', description: `더미 생성 중 오류가 발생했습니다: ${msg}` });
        }
    }, [fetchAdmissions]);

    /** 병상 카드 클릭 시 해당 병실의 환자 상세 모달을 연다. */
    const handleCardClick = useCallback((room: string) => {
        setSelectedRoom(room);
    }, [setSelectedRoom]);

    /** QR 버튼 클릭 시 해당 병상의 QR 코드 모달을 연다. 토큰 미발급 시 오류 토스트를 표시한다. */
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
