import React from 'react';
import { Plus, Trash2, ChevronDown, Beaker, Check } from 'lucide-react';
import { Select } from './ui/Select';

export interface MixedMed {
    id: string;
    name: string;
    amount: number;
    unit?: string;
    frequency?: 'QD' | 'BID' | 'TID';
}

const addMed = (setter: React.Dispatch<React.SetStateAction<MixedMed[]>>, name: string = '', unit: string = 'amp') => {
    setter(prev => [...prev, { id: crypto.randomUUID(), name, amount: 1, unit }]);
};

const updateMed = (setter: React.Dispatch<React.SetStateAction<MixedMed[]>>, id: string, field: keyof MixedMed, val: MixedMed[keyof MixedMed]) => {
    setter(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m));
};

const removeMed = (setter: React.Dispatch<React.SetStateAction<MixedMed[]>>, id: string) => {
    setter(prev => prev.filter(m => m.id !== id));
};

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
}

export function MedSection({
    title, icon: Icon, meds, setter, color, showRate = false, rateVal, setRateVal,
    presets = [], unit = 'amp', showFrequency = false, baseFluid, setBaseFluid,
    rateLabel = 'Infusion Rate', rateUnit = 'CC/HR',
    mixedMedPresets = []
}: MedSectionProps) {
    return (
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-4 ${color} rounded-full`} />
                    <Icon size={16} className="text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-800">{title}</h3>
                </div>
                <button
                    onClick={() => addMed(setter, '', unit)}
                    className="px-2.5 py-1 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors flex items-center gap-1.5 text-[11px] font-bold border border-teal-100"
                >
                    <Plus size={14} /> 약물 추가
                </button>
            </div>

            {showRate ? (
                <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Base Fluid</label>
                            <div className="flex flex-wrap gap-2">
                                {presets.map((name: string) => {
                                    const isSelected = baseFluid === name;
                                    return (
                                        <button
                                            key={name}
                                            onClick={() => setBaseFluid?.(isSelected ? '' : name)}
                                            className={`flex-1 px-3 py-1 h-12 border rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${isSelected
                                                ? 'bg-teal-600 border-teal-600 text-white shadow-sm shadow-teal-200'
                                                : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-teal-50'}`}
                                        >
                                            {isSelected && <Check size={12} />}
                                            {name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-tighter">{rateLabel}</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={rateVal || ''}
                                    onChange={(e) => setRateVal?.(Number(e.target.value))}
                                    className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none text-xs focus:ring-4 focus:ring-teal-500/10 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    placeholder="0"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-black">{rateUnit}</span>
                            </div>
                        </div>
                    </div>

                    <div className="col-span-12 lg:col-span-7 flex flex-col gap-3 min-h-[120px]">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Mixed Medications</label>
                            <span className="text-[10px] font-bold text-slate-300">{meds.length} meds</span>
                        </div>
                        <div className="flex-1 space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                            {meds.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl py-8 grayscale opacity-50">
                                    <Beaker size={24} className="text-slate-300 mb-2" />
                                    <p className="text-[10px] font-bold text-slate-400 italic">No meds mixed yet</p>
                                </div>
                            ) : (
                                meds.map((med) => {
                                    const showSelect = mixedMedPresets.length > 0 && (mixedMedPresets.includes(med.name) || !med.name || med.name === 'SELECT_MODE' || med.name === '');

                                    return (
                                        <div key={med.id} className="flex flex-col gap-2 p-3 bg-slate-50/50 rounded-xl border border-slate-100 transition-all">
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
                                                                className="w-full h-11 pl-4 pr-10 bg-white border-2 border-teal-500/30 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-teal-500 shadow-sm"
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
                                                <div className="flex-shrink-0 flex items-center gap-2 bg-white px-2 py-1 h-11 rounded-xl border-2 border-slate-100">
                                                    <input
                                                        type="number"
                                                        value={med.amount}
                                                        onChange={(e) => updateMed(setter, med.id, 'amount', Number(e.target.value))}
                                                        className="w-10 bg-transparent border-none outline-none text-xs font-black text-slate-700 text-center"
                                                    />
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{unit}</span>
                                                </div>
                                                <button onClick={() => removeMed(setter, med.id)} className="flex-shrink-0 p-1 text-slate-300 hover:text-red-500 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
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
                        {meds.map((med) => {
                            return (
                                <div key={med.id} className="flex flex-col gap-2 p-3 bg-slate-50/50 rounded-xl border border-slate-100 transition-all">
                                    <div className="flex items-center gap-2">
                                        {(mixedMedPresets.length > 0 && (mixedMedPresets.includes(med.name) || !med.name || med.name === 'SELECT_MODE' || med.name === '')) ? (
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
                                                        className="w-full h-11 pl-4 pr-10 bg-white border-2 border-teal-500/30 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-teal-500 shadow-sm"
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
                                        <div className="flex-shrink-0 flex items-center gap-2 bg-white px-2 py-1 h-11 rounded-xl border-2 border-slate-100">
                                            <input
                                                type="number"
                                                value={med.amount}
                                                onChange={(e) => updateMed(setter, med.id, 'amount', Number(e.target.value))}
                                                className="w-12 bg-transparent border-none outline-none text-xs font-black text-slate-700 text-center"
                                            />
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">{unit}</span>
                                        </div>
                                        <button onClick={() => removeMed(setter, med.id)} className="flex-shrink-0 p-1 text-slate-300 hover:text-red-500">
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
                        })}
                    </div>
                </>
            )}
        </section>
    );
}
