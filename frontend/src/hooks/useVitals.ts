import { useEffect, useState } from 'react';

export interface VitalData {
    time: string;
    temperature: number;
    has_medication: boolean;
    recorded_at: string;
}

export function useVitals(token: string) {
    const [vitals, setVitals] = useState<VitalData[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!token) return;

        // Initial Fetch
        const fetchVitals = async () => {
            try {
                const res = await fetch(`http://localhost:8000/api/v1/dashboard/${token}`);
                if (!res.ok) {
                    if (res.status === 403) {
                        // Handle discharge or invalid token
                        window.location.href = '/403'; // Or handle error state
                    }
                    return;
                }
                const data = await res.json();
                // Transform data for graph
                const formattedVitals = data.vitals.map((v: any) => ({
                    time: new Date(v.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    temperature: v.temperature,
                    has_medication: v.has_medication,
                    recorded_at: v.recorded_at
                })).reverse(); // Recharts often prefers chronological order
                setVitals(formattedVitals);
            } catch (error) {
                console.error("Failed to fetch initial vitals", error);
            }
        };

        fetchVitals();

        // WebSocket Connection
        const ws = new WebSocket(`ws://localhost:8000/ws/${token}`);

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
                    recorded_at: newVital.recorded_at
                };
                setVitals((prev) => [...prev, formattedVital]);
            }
        };

        ws.onclose = () => {
            console.log('Disconnected from Vitals WS');
            setIsConnected(false);
        };

        return () => {
            ws.close();
        };
    }, [token]);

    return { vitals, isConnected };
}
