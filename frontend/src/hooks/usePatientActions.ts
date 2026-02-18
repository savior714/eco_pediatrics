import { useState } from 'react';
import { api } from '@/lib/api';
import { Bed, MealRequest } from '@/types/domain';

interface UsePatientActionsProps {
    bed: Bed;
    onClose: () => void;
    fetchDashboardData: () => Promise<void>;
    meals: MealRequest[];
}

export function usePatientActions({ bed, onClose, fetchDashboardData, meals }: UsePatientActionsProps) {
    const [addExamModalOpen, setAddExamModalOpen] = useState(false);
    const [deletingExamId, setDeletingExamId] = useState<number | null>(null);
    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [vitalModalOpen, setVitalModalOpen] = useState(false);
    const [editMealConfig, setEditMealConfig] = useState<{ label: string; date: string; meal_time: string; pediatric: string; guardian: string; mealId: number } | null>(null);
    const [isSeeding, setIsSeeding] = useState(false);

    const handleDischarge = async () => {
        if (!bed?.id) return;
        if (!window.confirm(`${bed.name} 환자를 퇴원 처리할까요?`)) return;
        try {
            await api.post(`/api/v1/admissions/${bed.id}/discharge`, {});
            alert('퇴원 완료');
            onClose();
            window.location.reload();
        } catch (e) {
            alert('퇴원 실패');
        }
    };

    const handleSeedData = async () => {
        if (!bed?.id || isSeeding) return;
        if (!window.confirm(`[Dev] ${bed.name} 환자에게 가상 데이터를 생성할까요?\n(기존 체온/수액/검사 기록이 초기화됩니다.)`)) return;

        setIsSeeding(true);
        try {
            await api.post(`/api/v1/dev/seed-patient/${bed.id}`, {});
            await fetchDashboardData();
            alert('데이터 생성 및 동기화 완료');
        } catch (e) {
            alert('데이터 생성 실패');
        } finally {
            setIsSeeding(false);
        }
    };

    const handleTransfer = async (targetRoom: string) => {
        if (!bed?.id) return;
        try {
            await api.post(`/api/v1/admissions/${bed.id}/transfer`, { target_room: targetRoom });
            alert('전실 완료');
            setTransferModalOpen(false);
            onClose();
            window.location.reload();
        } catch (e) {
            alert('전실 실패: 이미 사용 중인 병실이거나 오류가 발생했습니다.');
        }
    };

    const apiAddExam = async (examData: { name: string; date: string; timeOfDay: 'am' | 'pm' }) => {
        if (!bed?.id) return;
        const [y, m, d] = examData.date.split('-').map(Number);
        const hour = examData.timeOfDay === 'am' ? 9 : 14;
        const scheduledAt = new Date(y, m - 1, d, hour, 0).toISOString();
        await api.post('/api/v1/exam-schedules', {
            admission_id: bed.id,
            scheduled_at: scheduledAt,
            name: examData.name.trim(),
            note: ''
        });
    };

    const apiDeleteExam = async (scheduleId: number) => {
        setDeletingExamId(scheduleId);
        try {
            await api.delete(`/api/v1/exam-schedules/${scheduleId}`);
        } finally {
            setDeletingExamId(null);
        }
    };

    const apiMealUpdate = async (pediatric: string, guardian: string) => {
        if (!bed?.id || !editMealConfig) return;
        await api.post('/api/v1/meals/requests', {
            admission_id: bed.id,
            request_type: 'STATION_UPDATE',
            meal_date: editMealConfig.date,
            meal_time: editMealConfig.meal_time,
            pediatric_meal_type: pediatric,
            guardian_meal_type: guardian,
            room_note: meals.find(m => m.meal_date === editMealConfig.date && m.meal_time === editMealConfig.meal_time)?.room_note || ''
        });
    };

    return {
        state: {
            addExamModalOpen,
            deletingExamId,
            transferModalOpen,
            vitalModalOpen,
            editMealConfig,
            isSeeding
        },
        actions: {
            setAddExamModalOpen,
            setTransferModalOpen,
            setVitalModalOpen,
            setEditMealConfig,
            handleDischarge,
            handleSeedData,
            handleTransfer,
            apiAddExam,
            apiDeleteExam,
            apiMealUpdate
        }
    };
}
