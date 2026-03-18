import React from 'react';
import { Plus, Trash2, ChevronDown, Beaker, Check } from 'lucide-react';
import { Select } from './ui/Select';
import type { AstResult, MixedMed } from '@/types/domain';

export type { MixedMed };

const addMed = (setter: React.Dispatch<React.SetStateAction<MixedMed[]>>, name: string = '', unit: string = 'amp', defaultAmount: number = 1) => {
    setter(prev => [...prev, { id: crypto.randomUUID(), name, amount: defaultAmount, unit }]);
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
    amountStep?: number;
    amountMin?: number;
    amountMax?: number;
}

function MedItemRow({ med, setter, unit, mixedMedPresets, showFrequency = false, amountStep = 1, amountMin, amountMax }: MedItemRowProps) {
    const showSelect = mixedMedPresets.length > 0 && (
        mixedMedPresets.includes(med.name) || !med.name || med.name === 'SELECT_MODE' || med.name === ''
    );

    return (
        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50/50 rounded-lg border border-slate-100 transition-all">
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
                <div className="flex-1 min-w-0 flex items-center gap-1">
                    <div className="relative flex-1 group">
                        <input
                            value={med.name === 'CUSTOM_MODE' ? '' : med.name}
                            onChange={(e) => updateMed(setter, med.id, 'name', e.target.value)}
                            autoFocus
                            className="w-full h-5 pl-2 pr-7 bg-white border border-teal-500/30 rounded-md text-[10px] font-bold text-slate-700 outline-none focus:border-teal-500"
                            placeholder="약물명 직접 입력"
                        />
                        {mixedMedPresets.length > 0 && (
                            <button
                                onClick={() => updateMed(setter, med.id, 'name', 'SELECT_MODE')}
                                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-teal-600 hover:bg-teal-50 rounded transition-all"
                                title="목록에서 선택"
                            >
                                <ChevronDown size={12} />
                            </button>
                        )}
                    </div>
                </div>
            )}
            {showFrequency && (
                <div className="flex gap-0.5 shrink-0">
                    {(['QD', 'BID', 'TID'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => updateMed(setter, med.id, 'frequency', f)}
                            className={`px-1.5 h-5 rounded text-[9px] font-black transition-all border ${med.frequency === f ? 'bg-purple-500 text-white border-purple-500 shadow-sm' : 'bg-white text-slate-400 border-slate-100'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            )}
            <div className="flex-shrink-0 flex items-center gap-1 bg-white px-1.5 h-5 rounded border border-slate-200">
                <input
                    type="number"
                    value={med.amount}
                    step={amountStep}
                    min={amountMin}
                    max={amountMax}
                    onChange={(e) => {
                        const val = Number(e.target.value);
                        if (amountStep > 1) {
                            updateMed(setter, med.id, 'amount', Math.round(val / amountStep) * amountStep);
                        } else {
                            updateMed(setter, med.id, 'amount', val);
                        }
                    }}
                    className="w-8 bg-transparent border-none outline-none text-[10px] font-black text-slate-700 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-[9px] font-bold text-slate-400 uppercase">{unit}</span>
            </div>
            <button onClick={() => removeMed(setter, med.id)} className="flex-shrink-0 p-0.5 text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 size={14} />
            </button>
        </div>
    );
}

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
    rateStep?: number;
    rateMin?: number;
    rateMax?: number;
    rateReadOnly?: boolean;
    mixedMedPresets?: string[];
    astResult?: AstResult;
    onAstChange?: (res: AstResult) => void;
    defaultAmount?: number;
    amountStep?: number;
    amountMin?: number;
    amountMax?: number;
    maxMeds?: number;
}

export function MedSection({
    title, icon: Icon, meds, setter, color, showRate = false, rateVal, setRateVal,
    presets = [], unit = 'amp', showFrequency = false, baseFluid, setBaseFluid,
    rateLabel = 'Infusion Rate', rateUnit = 'CC/HR',
    mixedMedPresets = [], astResult, onAstChange,
    defaultAmount = 1, amountStep = 1, amountMin, amountMax,
    rateStep, rateMin, rateMax, rateReadOnly = false, maxMeds
}: MedSectionProps) {
    return (
        <section className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-200/60 space-y-1.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div className={`w-1.5 h-3.5 ${color} rounded-full`} />
                    <Icon size={14} className="text-slate-400 shrink-0" />
                    <h3 className="text-[12px] font-black text-slate-800 truncate">{title}</h3>

                    {/* AST 피부반응 결과 선택 (헤더 통합 버전) */}
                    {astResult !== undefined && onAstChange && (
                        <div className="ml-auto mr-1 flex items-center gap-1.5 shrink-0">
                            <span className="text-[9px] font-black text-slate-400 uppercase">AST</span>
                            <div className="flex gap-0.5 p-0.5 bg-slate-50/80 rounded-lg border border-slate-100">
                                {AST_OPTIONS.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => onAstChange(opt.id)}
                                        className={`px-1 h-5 min-w-[1.25rem] rounded text-[9px] font-black transition-all border ${astResult === opt.id ? `${opt.color} shadow-sm ring-1 ring-inset ring-black/5` : 'bg-white text-slate-400 border-slate-100 opacity-60'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                {(!maxMeds || meds.length < maxMeds) && (
                    <button
                        onClick={() => addMed(setter, '', unit, defaultAmount)}
                        className="flex-shrink-0 px-2 py-0.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold border border-teal-100"
                    >
                        <Plus size={12} /> 약물 추가
                    </button>
                )}
            </div>

            {showRate ? (
                <div className="flex flex-col gap-1">
                    {/* Base Fluid: 라벨 + 버튼들 */}
                    <div className="flex items-center gap-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wide w-16 shrink-0">Base Fluid</label>
                        <div className="flex flex-1 gap-1">
                            {presets.map((name: string) => {
                                const isSelected = baseFluid === name;
                                return (
                                    <button
                                        key={name}
                                        onClick={() => setBaseFluid?.(isSelected ? '' : name)}
                                        className={`flex-1 px-1.5 h-5 border rounded-md text-[9px] font-bold transition-all flex items-center justify-center gap-0.5 whitespace-nowrap ${isSelected
                                            ? 'bg-teal-600 border-teal-600 text-white shadow-sm shadow-teal-200'
                                            : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-teal-50'}`}
                                    >
                                        {isSelected && <Check size={8} />}
                                        {name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Rate: 라벨 + 인풋 */}
                    <div className="flex items-center gap-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wide w-16 shrink-0">{rateLabel}</label>
                        <div className="relative flex-1">
                            <input
                                type="number"
                                value={rateVal || ''}
                                step={rateStep}
                                min={rateMin}
                                max={rateMax}
                                readOnly={rateReadOnly}
                                onChange={(e) => {
                                    if (rateReadOnly) return;
                                    const raw = e.target.value.replace(/[^0-9]/g, '');
                                    if (raw.length > 3) return;
                                    setRateVal?.(raw === '' ? 0 : Number(raw));
                                }}
                                onBlur={(e) => {
                                    if (rateReadOnly || !rateStep || rateStep <= 1) return;
                                    const val = e.target.valueAsNumber;
                                    if (isNaN(val)) { setRateVal?.(0); return; }
                                    const snapped = Math.round(val / rateStep) * rateStep;
                                    const clamped = rateMin !== undefined && rateMax !== undefined
                                        ? Math.min(rateMax, Math.max(rateMin, snapped))
                                        : snapped;
                                    setRateVal?.(clamped);
                                }}
                                className={`w-full h-5 px-2 border rounded-md font-bold text-slate-700 outline-none text-[10px] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${rateReadOnly ? 'bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-teal-500/10'}`}
                                placeholder="0"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-black">{rateUnit}</span>
                        </div>
                    </div>

                    {/* Mixed Medications */}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between px-0.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Mixed Medications</label>
                            <span className="text-[9px] font-bold text-slate-300">{meds.length} meds</span>
                        </div>
                        <div className="space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                            {meds.length === 0 ? (
                                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-xl py-2 grayscale opacity-50">
                                    <Beaker size={16} className="text-slate-300 mb-0.5" />
                                    <p className="text-[9px] font-bold text-slate-400 italic">No meds mixed yet</p>
                                </div>
                            ) : (
                                meds.map((med) => (
                                    <MedItemRow
                                        key={med.id}
                                        med={med}
                                        setter={setter}
                                        unit={unit}
                                        mixedMedPresets={mixedMedPresets}
                                        amountStep={amountStep}
                                        amountMin={amountMin}
                                        amountMax={amountMax}
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

                    <div className="space-y-1 overflow-y-auto custom-scrollbar pr-0.5" style={{ maxHeight: maxMeds ? `${maxMeds * 2.25}rem` : '10rem' }}>
                        {meds.map((med) => (
                            <MedItemRow
                                key={med.id}
                                med={med}
                                setter={setter}
                                unit={unit}
                                mixedMedPresets={mixedMedPresets}
                                showFrequency={showFrequency}
                                amountStep={amountStep}
                                amountMin={amountMin}
                                amountMax={amountMax}
                            />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}
