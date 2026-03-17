/** AST 피부반응 검사 및 주요 검사 결과 입력 섹션 */

/** 검사 항목 정의 */
const LAB_ITEMS = [
    { id: 'cbc', label: 'CBC' },
    { id: 'lft', label: 'LFT' },
    { id: 'electrolyte', label: 'Electrolyte' },
    { id: 'ua', label: 'UA & U/Cx.' },
    { id: 'bcx', label: 'B/Cx.' },
    { id: 'stool', label: 'Stool PCR/Cx.' },
    { id: 'resp', label: 'Resp. PCR (V/B)' }
] as const;

/** AST 결과 선택지 */
const AST_OPTIONS = [
    { id: 'NONE', label: '미시행', color: 'bg-slate-200' },
    { id: 'NEG',  label: 'Negative', color: 'bg-green-500' },
    { id: 'POS',  label: 'Positive', color: 'bg-red-500' }
] as const;

export type AstResult = 'NONE' | 'NEG' | 'POS';
export type LabResultMap = Record<string, { checked: boolean; value: string }>;

interface IVLabelLabSectionProps {
    astResult: AstResult;
    onAstChange: (result: AstResult) => void;
    labResults: LabResultMap;
    onLabChange: (id: string, field: 'checked' | 'value', val: boolean | string) => void;
}

/** IV 라벨 — AST 및 주요 검사 결과 입력 섹션 컴포넌트 */
export function IVLabelLabSection({ astResult, onAstChange, labResults, onLabChange }: IVLabelLabSectionProps) {
    return (
        <section className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200/60 space-y-2">
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-teal-600 rounded-full" />
                <h3 className="text-sm font-bold text-slate-800">AST 및 주요 검사 결과</h3>
            </div>

            {/* AST 피부반응 결과 선택 */}
            <div className="flex items-center gap-3 px-2 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide shrink-0">AST 결과</span>
                <div className="flex gap-1.5">
                    {AST_OPTIONS.map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => onAstChange(opt.id)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${astResult === opt.id ? `${opt.color} text-white shadow-sm` : 'bg-white text-slate-400 border border-slate-100'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 검사 항목별 체크 + 결과값 한 줄 배치 */}
            <div className="grid grid-cols-2 gap-1.5">
                {LAB_ITEMS.map(lab => (
                    <div key={lab.id} className="flex items-center gap-2 px-2 py-1.5 bg-slate-50/50 rounded-lg border border-slate-100">
                        <input
                            type="checkbox"
                            checked={labResults[lab.id]?.checked}
                            onChange={(e) => onLabChange(lab.id, 'checked', e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 shrink-0"
                        />
                        <label className="text-[10px] font-black text-slate-600 w-20 shrink-0">{lab.label}</label>
                        <input
                            value={labResults[lab.id]?.value}
                            onChange={(e) => onLabChange(lab.id, 'value', e.target.value)}
                            disabled={!labResults[lab.id]?.checked}
                            className="flex-1 h-6 px-2 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20 disabled:opacity-40 transition-all"
                            placeholder="결과값"
                        />
                    </div>
                ))}
            </div>
        </section>
    );
}
