import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Bed, Notification, LastUploadedIv, AdmissionSummary, WsMessage } from '@/types/domain';
import { ROOM_NUMBERS, MEAL_MAP, DOC_MAP } from '@/constants/mappings';

interface UseStationReturn {
    beds: Bed[];
    setBeds: React.Dispatch<React.SetStateAction<Bed[]>>;
    notifications: Notification[];
    setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
    lastUploadedIv: LastUploadedIv | null;
    lastUpdated: number;
    isConnected: boolean;
    removeNotification: (id: string) => void;
}

export function useStation(): UseStationReturn {
    const [beds, setBeds] = useState<Bed[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [lastUploadedIv, setLastUploadedIv] = useState<LastUploadedIv | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
    const [isConnected, setIsConnected] = useState(false);

    // Initial Load
    useEffect(() => {
        // 1. Initialize empty beds
        setBeds(ROOM_NUMBERS.map((room, i) => ({
            id: '',
            room: room,
            name: `환자${i + 1}`,
            temp: 36.5,
            drops: 20,
            status: 'normal',
            token: ''
        })));

        // 2. Fetch real admissions
        api.get<AdmissionSummary[]>('/api/v1/admissions')
            .then(admissions => {
                if (!Array.isArray(admissions)) return;
                setBeds(prev => prev.map(bed => {
                    const adm = admissions.find((a) => String(a.room_number).trim() === String(bed.room).trim());
                    if (adm) {
                        const infusionRate = adm.latest_iv ? adm.latest_iv.infusion_rate : 20;
                        const temp = adm.latest_temp ?? 36.5;

                        return {
                            ...bed,
                            id: adm.id,
                            name: adm.display_name,
                            token: adm.access_token,
                            drops: infusionRate,
                            temp: temp,
                            had_fever_in_6h: adm.had_fever_in_6h,
                            status: (temp >= 38.0 || adm.had_fever_in_6h) ? 'fever' : 'normal'
                        };
                    }
                    return bed;
                }));
            })
            .catch(console.error);
    }, []);

    // WebSocket
    useEffect(() => {
        const API_URL = api.getBaseUrl();
        const WS_URL = API_URL.replace(/^http/, 'ws');
        const ws = new WebSocket(`${WS_URL}/ws/STATION`);

        ws.onopen = () => {
            setIsConnected(true);
        };

        ws.onclose = () => {
            setIsConnected(false);
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data) as WsMessage;
                const id = Math.random().toString(36).substr(2, 9);
                setLastUpdated(Date.now());

                switch (message.type) {
                    case 'NEW_MEAL_REQUEST':
                        setNotifications(prev => [{
                            id,
                            room: message.data.room,
                            time: '방금',
                            content: `식단 신청 (${MEAL_MAP[message.data.request_type] || message.data.request_type})`,
                            type: 'meal'
                        }, ...prev]);
                        break;

                    case 'NEW_DOC_REQUEST':
                        // data: { room, request_items: string[] }
                        const items = (message.data.request_items as string[]).map(it => DOC_MAP[it] || it).join(', ');
                        setNotifications(prev => [{
                            id,
                            room: message.data.room,
                            time: '방금',
                            content: `서류 신청 (${items})`,
                            type: 'doc'
                        }, ...prev]);
                        break;

                    case 'IV_PHOTO_UPLOADED':
                        setLastUploadedIv({
                            admissionId: message.data.admission_id,
                            url: message.data.photo_url
                        });
                        break;

                    case 'NEW_IV':
                        const newDrops = message.data.infusion_rate;
                        const room = message.data.room;
                        setBeds(prev => prev.map(bed => {
                            if (String(bed.room) === String(room)) {
                                return { ...bed, drops: newDrops };
                            }
                            return bed;
                        }));
                        break;

                    case 'NEW_VITAL':
                        // Handled by setLastUpdated -> Modal refresh
                        break;
                }
            } catch (e) {
                console.error('WS Parse Error', e);
            }
        };

        return () => ws.close();
    }, []);

    const removeNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    return {
        beds,
        setBeds,
        notifications,
        setNotifications,
        lastUploadedIv,
        lastUpdated,
        isConnected,
        removeNotification
    };
}
