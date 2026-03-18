import React from 'react';
import { Plus, Trash2, ChevronDown, Beaker, Check } from 'lucide-react';
import { Select } from './ui/Select';
import type { MixedMed } from '@/types/domain';

export type { MixedMed };

const addMed = (setter: React.Dispatch<React.SetStateAction<MixedMed[]>>, name: string = '', unit: string = 'amp') => {
    setter(prev => [...prev, { id: crypto.randomUUID(), name, amount: 1, unit }]);
};

const updateMed = (setter: React.Dispatch<React.SetStateAction<MixedMed[]>>, id: string, field: keyof MixedMed, val: MixedMed[keyof MixedMed]) => {
    setter(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m));
};

const removeMed = (setter: React.Dispatch<React.SetStateAction<MixedMed[]>>, id: string) => {
    setter(prev => prev.filter(m => m.id !== id));
};

interface MedItemRowProps {
    med: MixedMed;
    setter: React.Dispatch<React.SetStateAction<MixedMed[]>>;
    unit: string;
    mixedMedPresets: string[];
    showFrequency?: boolean;
}

function MedItemRow({ med, setter, unit, mixedMedPresets, showFrequency = false }: MedItemRowProps) {
    const showSelect = mixedMedPresets.length > 0 && (
        mixedMedPresets.includes(med.name) || !med.name || med.name === 'SELECT_MODE' || med.name === ''
    );

    return (
        <div className="flex flex-col gap-1.5 p-2 bg-slate-50/50 rounded-xl border border-slate-100 transition-all">
            <div className="flex items-center gap-2">
                {showSelect ? (
                    <div className="flex-1 min-w-0">
                        <Select
                            options={[
                                ...mixedMedPresets.map(p => ({ label: p, value: p })),
                                { label: '직접 입력...', value: 'CUSTOM' }
                            ]}
                            value={med.name && med.name !== 'SELECT_MODE' ? [med.name] : []}
                            onValueChange={(val) => {
                                if (val[0] === 'CUSTOM') {
                                    updateMed(setter, med.id, 'name', 'CUSTOM_MODE');
                                } else {
                                    updateMed(setter, med.id, 'name', val[0]);
                                }
                            }}
                            placeholder="약물 선택"
                        />
                    </div>
                ) : (
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                        <div className="relative flex-1 group">
                            <input
                                value={med.name === 'CUSTOM_MODE' ? '' : med.name}
                                onChange={(e) => updateMed(setter, med.id, 'name', e.target.value)}
                                autoFocus
                                className="w-full h-8 pl-4 pr-10 bg-white border-2 border-teal-500/30 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-teal-500 shadow-sm"
                                placeholder="약물명 직접 입력"
                            />
                            {mixedMedPresets.length > 0 && (
                                <button
                                    onClick={() => updateMed(setter, med.id, 'name', 'SELECT_MODE')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-300 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                                    title="목록에서 선택"
                                >
                                    <ChevronDown size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                )}
                <div className="flex-shrink-0 flex items-center gap-2 bg-white px-2 py-1 h-8 rounded-xl border-2 border-slate-100">
                    <input
                        type="number"
                        value={med.amount}
                        onChange={(e) => updateMed(setter, med.id, 'amount', Number(e.target.value))}
                        className="w-10 bg-transparent border-none outline-none text-xs font-black text-slate-700 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{unit}</span>
                </div>
                <button onClick={() => removeMed(setter, med.id)} className="flex-shrink-0 p-1 text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                </button>
            </div>
            {showFrequency && (
                <div className="flex gap-1.5 pt-2 border-t border-slate-200/50">
                    {(['QD', 'BID', 'TID'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => updateMed(setter, med.id, 'frequency', f)}
                            className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${med.frequency === f ? 'bg-purple-500 text-white shadow-lg shadow-purple-200' : 'bg-white text-slate-400 border border-slate-100'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export type AstResult = 'NONE' | 'NEG' | 'POS';

const AST_OPTIONS = [
    { id: 'NONE', label: '미시행', color: 'bg-slate-200' },
    { id: 'NEG',  label: '-', color: 'bg-green-100 text-green-700 border-green-200' },
    { id: 'POS',  label: '+', color: 'bg-red-100 text-red-700 border-red-200' }
] as const;

export interface MedSectionProps {
    title: string;
    icon: React.ComponentType<{ size?: number | string; className?: string }>;
    meds: MixedMed[];
    setter: React.Dispatch<React.SetStateAction<MixedMed[]>>;
    color: string;
    showRate?: boolean;
    rateVal?: number;
    setRateVal?: (val: number) => void;
    presets?: string[];
    unit?: string;
    showFrequency?: boolean;
    baseFluid?: string;
    setBaseFluid?: (val: string) => void;
    rateLabel?: string;
    rateUnit?: string;
    mixedMedPresets?: string[];
    astResult?: AstResult;
    onAstChange?: (res: AstResult) => void;
}

export function MedSection({
    title, icon: Icon, meds, setter, color, showRate = false, rateVal, setRateVal,
    presets = [], unit = 'amp', showFrequency = false, baseFluid, setBaseFluid,
    rateLabel = 'Infusion Rate', rateUnit = 'CC/HR',
    mixedMedPresets = [], astResult, onAstChange
}: MedSectionProps) {
    return (
        <section className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200/60 space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-1.5 h-4 ${color} rounded-full`} />
                    <Icon size={16} className="text-slate-400 shrink-0" />
                    <h3 className="text-sm font-bold text-slate-800 truncate">{title}</h3>
                    
                    {/* AST 피부반응 결과 선택 (헤더 통합 버전) */}
                    {astResult !== undefined && onAstChange && (
                        <div className="ml-auto mr-2 flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">AST</span>
                            <div className="flex gap-1 p-0.5 bg-slate-50/80 rounded-lg border border-slate-100">
                                {AST_OPTIONS.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => onAstChange(opt.id)}
                                        className={`px-1.5 h-6 min-w-[1.5rem] rounded-md text-[9px] font-black transition-all border ${astResult === opt.id ? `${opt.color} shadow-sm ring-1 ring-inset ring-black/5` : 'bg-white text-slate-400 border-slate-100 opacity-60'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <button
                    onClick={() => addMed(setter, '', unit)}
                    className="flex-shrink-0 px-2.5 py-1 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors flex items-center gap-1.5 text-[11px] font-bold border border-teal-100"
                >
                    <Plus size={14} /> 약물 추가
                </button>
            </div>

            {showRate ? (
                <div className="flex flex-col gap-1.5">
                    {/* Base Fluid: 라벨 + 버튼들 한 줄 */}
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide w-20 shrink-0">Base Fluid</label>
                        <div className="flex flex-1 gap-1.5">
                            {presets.map((name: string) => {
                                const isSelected = baseFluid === name;
                                return (
                                    <button
                                        key={name}
                                        onClick={() => setBaseFluid?.(isSelected ? '' : name)}
                                        className={`flex-1 px-2 h-7 border rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${isSelected
                                            ? 'bg-teal-600 border-teal-600 text-white shadow-sm shadow-teal-200'
                                            : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-teal-50'}`}
                                    >
                                        {isSelected && <Check size={10} />}
                                        {name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Rate: 라벨 + 인풋 한 줄 */}
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide w-20 shrink-0">{rateLabel}</label>
                        <div className="relative flex-1">
                            <input
                                type="number"
                                value={rateVal || ''}
                                onChange={(e) => setRateVal?.(Number(e.target.value))}
                                className="w-full h-7 px-3 bg-slate-50 border-2 border-slate-100 rounded-lg font-bold text-slate-700 outline-none text-xs focus:ring-4 focus:ring-teal-500/10 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-black">{rateUnit}</span>
                        </div>
                    </div>

                    {/* Mixed Medications */}
                    <div className="flex flex-col gap-1.5 mt-1">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Mixed Medications</label>
                            <span className="text-[10px] font-bold text-slate-300">{meds.length} meds</span>
                        </div>
                        <div className="space-y-1.5 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
                            {meds.length === 0 ? (
                                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-xl py-3 grayscale opacity-50">
                                    <Beaker size={20} className="text-slate-300 mb-1" />
                                    <p className="text-[10px] font-bold text-slate-400 italic">No meds mixed yet</p>
                                </div>
                            ) : (
                                meds.map((med) => (
                                    <MedItemRow
                                        key={med.id}
                                        med={med}
                                        setter={setter}
                                        unit={unit}
                                        mixedMedPresets={mixedMedPresets}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex flex-wrap gap-2">
                        {presets.map((name: string) => (
                            <button
                                key={name}
                                onClick={() => addMed(setter, name, unit)}
                                className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-teal-50 transition-all"
                            >
                                + {name}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-2">
                        {meds.map((med) => (
                            <MedItemRow
                                key={med.id}
                                med={med}
                                setter={setter}
                                unit={unit}
                                mixedMedPresets={mixedMedPresets}
                                showFrequency={showFrequency}
                            />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}
