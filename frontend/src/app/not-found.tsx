import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 font-sans text-center">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
                <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Page Not Found</h2>
                <p className="text-slate-500 text-sm mb-6">
                    Could not find requested resource. <br />
                    Please check the URL or return to dashboard.
                </p>
                <div className="flex flex-col gap-3">
                    <Link
                        href="/station"
                        className="w-full py-3 rounded-xl bg-teal-500 text-white font-bold hover:bg-teal-600 active:scale-95 transition-all shadow-md shadow-teal-200"
                    >
                        Go to Nurse Station
                    </Link>
                    <span className="text-xs text-slate-400">
                        Guardian Dashboard requires a specific link.
                    </span>
                </div>
            </div>
        </div>
    );
}
