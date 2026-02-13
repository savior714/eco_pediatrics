import { useEffect, useState, useCallback } from 'react';

export interface VitalData {
    time: string;
    temperature: number;
    has_medication: boolean;
    medication_type?: string;
    recorded_at: string;
}

export function useVitals(token: string) {
    const [vitals, setVitals] = useState<VitalData[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [admissionId, setAdmissionId] = useState<string | null>(null);
    const [patientName, setPatientName] = useState<string>('');
    const [checkInAt, setCheckInAt] = useState<string | null>(null);
    const [roomNumber, setRoomNumber] = useState<string>('');
    const [meals, setMeals] = useState<{ id: number; request_type: string; status: string }[]>([]);
    const [examSchedules, setExamSchedules] = useState<{ id: number; scheduled_at: string; name: string; note?: string }[]>([]);

    const [ivRecords, setIvRecords] = useState<{ id: number; infusion_rate: number; photo_url: string; created_at: string }[]>([]);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const WS_URL = API_URL.replace(/^http/, 'ws');

    const fetchDashboard = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/v1/dashboard/${token}`);
            if (!res.ok) {
                if (res.status === 403) window.location.href = '/403';
                console.warn(`Dashboard fetch failed with status ${res.status}. Keeping existing state.`);
                return;
            }
            const data = await res.json();
            if (data.admission) {
                setAdmissionId(data.admission.id);
                setPatientName(data.admission.patient_name_masked);
                setCheckInAt(data.admission.check_in_at);
                setRoomNumber(data.admission.room_number);
            }
            if (data.meals && Array.isArray(data.meals)) setMeals(data.meals);
            if (data.exam_schedules && Array.isArray(data.exam_schedules)) setExamSchedules(data.exam_schedules);
            if (data.iv_records && Array.isArray(data.iv_records)) setIvRecords(data.iv_records);

            if (data.vitals && Array.isArray(data.vitals)) {
                const formattedVitals = data.vitals.map((v: any) => ({
                    time: new Date(v.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    temperature: v.temperature,
                    has_medication: v.has_medication,
                    medication_type: v.medication_type,
                    recorded_at: v.recorded_at
                })).reverse();
                setVitals(formattedVitals);
            }
        } catch (error) {
            console.error("Failed to fetch dashboard. Keeping existing state.", error);
        }
    }, [token]);

    useEffect(() => {
        if (!token) return;
        fetchDashboard();

        // WebSocket Connection
        const ws = new WebSocket(`${WS_URL}/ws/${token}`);

        ws.onopen = () => {
            console.log('Connected to Vitals WS');
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'NEW_VITAL') {
                const newVital = message.data;
                const formattedVital = {
                    time: new Date(newVital.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    temperature: newVital.temperature,
                    has_medication: newVital.has_medication,
                    medication_type: newVital.medication_type,
                    recorded_at: newVital.recorded_at
                };
                setVitals((prev) => [...prev, formattedVital]);
            } else if (message.type === 'NEW_IV') {
                setIvRecords(prev => [message.data, ...prev]);
            } else if (message.type === 'NEW_EXAM_SCHEDULE') {
                setExamSchedules(prev => [...prev, message.data].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()));
            } else if (message.type === 'DELETE_EXAM_SCHEDULE') {
                setExamSchedules(prev => prev.filter(ex => ex.id !== message.data.id));
            }
        };

        ws.onclose = () => {
            console.log('Disconnected from Vitals WS');
            setIsConnected(false);
        };

        return () => ws.close();
    }, [token, fetchDashboard]);

    return { vitals, isConnected, admissionId, patientName, checkInAt, roomNumber, meals, examSchedules, ivRecords, refetchDashboard: fetchDashboard };
}
