import StationClient from './StationClient';

export default function StationPage() {
    // Read the secret from server-side environment variables.
    // This variable is NOT prefixed with NEXT_PUBLIC_, so it won't be in the client bundle.
    // It is passed as a prop to the client component, which serializes it into the initial HTML.
    const wsToken = process.env.STATION_WS_TOKEN || 'STATION';

    return <StationClient wsToken={wsToken} />;
}
