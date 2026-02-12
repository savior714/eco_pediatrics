'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 font-sans text-center">
                    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
                        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
                        <p className="text-slate-500 text-sm mb-6 max-h-32 overflow-y-auto break-all">
                            {error.message || "An unexpected error occurred."}
                        </p>
                        <button
                            onClick={() => reset()}
                            className="w-full py-3 rounded-xl bg-teal-500 text-white font-bold hover:bg-teal-600 active:scale-95 transition-all shadow-md shadow-teal-200"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
