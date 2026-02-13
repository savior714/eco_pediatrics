'use client';

import React from 'react';
import { LogOut, RefreshCcw } from 'lucide-react';
import Link from 'next/link';

export default function DischargedPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center space-y-6">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <LogOut size={40} className="text-slate-400" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-slate-800">퇴원 처리된 환자입니다</h1>
                    <p className="text-slate-500 leading-relaxed">
                        해당 QR 코드의 입원 기록이 종료되었습니다.<br />
                        새로운 입원 기록이 있다면<br />
                        <span className="font-bold text-teal-600">간호 스테이션의 QR 코드</span>를<br />
                        다시 스캔해 주세요.
                    </p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-400 mb-4">
                        만약 입원 중인데 이 화면이 보인다면<br />
                        간호사에게 문의해 주세요.
                    </p>
                </div>
            </div>
        </div>
    );
}
