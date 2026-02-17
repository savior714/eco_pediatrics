import React, { useMemo, useEffect } from 'react';
import { Thermometer } from 'lucide-react';
import { TemperatureGraph } from './TemperatureGraph';
import { Bed, Notification, VitalData, LastUploadedIv } from '@/types/domain';
import { api } from '@/lib/api';
import { TransferModal } from './TransferModal';
import { VitalModal } from './VitalModal';
import { EditMealModal } from './EditMealModal';
import { AddExamModal } from './AddExamModal';
import { useVitals } from '@/hooks/useVitals';
import { usePatientActions } from '@/hooks/usePatientActions';
import { PatientDetailHeader } from './patient-detail/PatientDetailHeader';
import { VitalStatusGrid } from './patient-detail/VitalStatusGrid';
import { PatientDetailSidebar } from './patient-detail/PatientDetailSidebar';

interface PatientDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    bed: Bed;
    notifications: Notification[];
    onCompleteRequest?: (id: string, type: string, admissionId: string) => void;
    lastUploadedIv?: LastUploadedIv | null;
    onIVUploadSuccess?: (rate?: number) => void;
    onVitalUpdate?: (temp: number) => void;
    lastUpdated?: number;
    vitals?: VitalData[];
    checkInAt?: string | null;
}

export function PatientDetailModal({
    isOpen, onClose, bed, notifications, onCompleteRequest,
    onIVUploadSuccess, onVitalUpdate, vitals: propVitals,
    checkInAt: propCheckInAt, lastUploadedIv, lastUpdated
}: PatientDetailModalProps) {

    const {
        vitals: fetchedVitals,
        checkInAt: fetchedCheckIn,
        meals: fetchedMeals,
        documentRequests: fetchedDocRequests,
        examSchedules,
        fetchDashboardData,
        addOptimisticVital
    } = useVitals(bed?.token, isOpen);

    const { state, actions } = usePatientActions({
        bed,
        onClose,
        fetchDashboardData,
        meals: fetchedMeals
    });

    useEffect(() => {
        if (isOpen && bed?.token) {
            fetchDashboardData();
        }
    }, [isOpen, bed?.token, fetchDashboardData, lastUpdated]);

    const roomNotifications = useMemo(() => {
        if (!bed) return [];
        return notifications.filter(n => String(n.room) === String(bed.room));
    }, [notifications, bed]);

    const { chartVitals, chartCheckIn } = useMemo(() => {
        if (!bed) return { chartVitals: [], chartCheckIn: null };
        if (propVitals && propVitals.length > 0) {
            return { chartVitals: propVitals, chartCheckIn: propCheckInAt ?? null };
        }
        return { chartVitals: fetchedVitals, chartCheckIn: fetchedCheckIn || propCheckInAt || null };
    }, [bed, propVitals, propCheckInAt, fetchedVitals, fetchedCheckIn]);

    const latestVital = fetchedVitals.length > 0 ? fetchedVitals[0] : null;
    const displayTemp = latestVital ? latestVital.temperature : bed.temp;
    const displayVitalTime = latestVital ? latestVital.recorded_at : (bed.last_vital_at ?? null);

    if (!isOpen || !bed) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div
                className="bg-white rounded-[2rem] w-[75%] max-w-none max-h-[85vh] shadow-2xl overflow-hidden flex flex-col transition-all duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <PatientDetailHeader
                    bed={bed}
                    onClose={onClose}
                    onDischarge={actions.handleDischarge}
                    onTransfer={() => actions.setTransferModalOpen(true)}
                    onSeedData={actions.handleSeedData}
                />

                <div className="px-8 bg-slate-50 border-b border-slate-100 pb-6 shrink-0">
                    <VitalStatusGrid
                        bed={bed}
                        displayTemp={displayTemp}
                        displayVitalTime={displayVitalTime}
                        meals={fetchedMeals}
                        lastUploadedIv={lastUploadedIv}
                        onVitalModalOpen={() => actions.setVitalModalOpen(true)}
                        onEditMeal={actions.setEditMealConfig}
                        onIVUploadSuccess={onIVUploadSuccess}
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-7 space-y-6">
                            <section className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                    <Thermometer size={16} className="text-rose-500" />
                                    체온 기록 (24h)
                                </h3>
                                <TemperatureGraph
                                    data={chartVitals}
                                    checkInAt={chartCheckIn}
                                    className="h-auto min-h-[340px] border-[1.5px] border-slate-200 shadow-sm"
                                />
                            </section>
                        </div>

                        <PatientDetailSidebar
                            examSchedules={examSchedules}
                            documentRequests={fetchedDocRequests}
                            roomNotifications={roomNotifications}
                            deletingExamId={state.deletingExamId}
                            onAddExam={() => actions.setAddExamModalOpen(true)}
                            onDeleteExam={actions.handleDeleteExam}
                            onCompleteRequest={(id, type) => onCompleteRequest?.(id, type, bed.id)}
                        />
                    </div>
                </div>
            </div>

            <TransferModal
                isOpen={state.transferModalOpen}
                onClose={() => actions.setTransferModalOpen(false)}
                onTransfer={actions.handleTransfer}
                currentRoom={bed.room}
            />

            <VitalModal
                isOpen={state.vitalModalOpen}
                onClose={() => actions.setVitalModalOpen(false)}
                admissionId={bed.id}
                onSuccess={(temp, recordedAt) => {
                    addOptimisticVital(temp, recordedAt);
                    fetchDashboardData();
                    onVitalUpdate?.(temp);
                }}
            />

            {state.editMealConfig && (
                <EditMealModal
                    isOpen={!!state.editMealConfig}
                    onClose={() => actions.setEditMealConfig(null)}
                    {...state.editMealConfig}
                    mealTime={state.editMealConfig.meal_time}
                    currentPediatric={state.editMealConfig.pediatric}
                    currentGuardian={state.editMealConfig.guardian}
                    onSave={actions.handleMealEditSave}
                />
            )}

            <AddExamModal
                isOpen={state.addExamModalOpen}
                onClose={() => actions.setAddExamModalOpen(false)}
                onSave={actions.handleAddExam}
            />
        </div>
    );
}
