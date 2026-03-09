interface PeriodOption<T extends string> {
  value: T;
  label: string;
  summary: string;
}

interface PeriodSelectorProps<T extends string> {
  options: PeriodOption<T>[];
  selected: T;
  onChange: (value: T) => void;
}

export function PeriodSelector<T extends string>({ options, selected, onChange }: PeriodSelectorProps<T>) {
  return (
    <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
      {options.map((option) => (
        <button
          key={option.value}
          className={`flex-shrink-0 px-3 py-2 rounded-xl border text-left transition-all min-w-[80px] ${
            selected === option.value
              ? 'border-primary bg-primary/10 shadow-sm'
              : 'border-border bg-card hover:bg-muted'
          }`}
          onClick={() => onChange(option.value)}
        >
          <p className="text-xs text-muted-foreground capitalize">{option.label}</p>
          <p className="text-sm font-semibold">{option.summary}</p>
        </button>
      ))}
    </div>
  );
}
