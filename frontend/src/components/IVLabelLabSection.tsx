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


export type LabResultMap = Record<string, { checked: boolean; value: string }>;

interface IVLabelLabSectionProps {
    labResults: LabResultMap;
    onLabChange: (id: string, field: 'checked' | 'value', val: boolean | string) => void;
}

export function IVLabelLabSection({ labResults, onLabChange }: IVLabelLabSectionProps) {
    return (
        <section className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-200/60 space-y-1.5">
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-3.5 bg-teal-600 rounded-full" />
                <h3 className="text-[12px] font-black text-slate-800 tracking-tight">주요 검사 결과</h3>
            </div>

            <div className="grid grid-cols-2 gap-1">
                {LAB_ITEMS.map(lab => (
                    <div key={lab.id} className="flex items-center gap-1.5 px-1.5 py-1 bg-slate-50/50 rounded-lg border border-slate-100 min-w-0">
                        <input
                            type="checkbox"
                            checked={labResults[lab.id]?.checked}
                            onChange={(e) => onLabChange(lab.id, 'checked', e.target.checked)}
                            className="w-3 h-3 rounded border-slate-300 text-teal-600 focus:ring-1 focus:ring-teal-500 shrink-0"
                        />
                        <label className="text-[9px] font-black text-slate-600 w-16 truncate shrink-0" title={lab.label}>{lab.label}</label>
                        <div className="flex-1 min-w-0">
                            <input
                                value={labResults[lab.id]?.value}
                                onChange={(e) => onLabChange(lab.id, 'value', e.target.value)}
                                disabled={!labResults[lab.id]?.checked}
                                className="w-full h-5 px-1.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-teal-500/20 disabled:opacity-30 transition-all placeholder:text-[9px]"
                                placeholder="결과값"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
