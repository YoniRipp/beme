import { Fragment, useEffect, useState, type JSX } from 'react';
import { Input } from '@/components/ui/input';
import type { DateFormat } from '@/types/settings';

interface Props {
  value: string;
  onChange: (next: string) => void;
  dateFormat: DateFormat;
  maxYear?: number;
}

type Part = 'DD' | 'MM' | 'YYYY';

const ORDER: Record<DateFormat, Part[]> = {
  'DD/MM/YYYY': ['DD', 'MM', 'YYYY'],
  'MM/DD/YYYY': ['MM', 'DD', 'YYYY'],
  'YYYY-MM-DD': ['YYYY', 'MM', 'DD'],
};

const SEPARATOR: Record<DateFormat, string> = {
  'DD/MM/YYYY': '/',
  'MM/DD/YYYY': '/',
  'YYYY-MM-DD': '-',
};

function isValidDate(y: number, m: number, d: number) {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function DateOfBirthInput({ value, onChange, dateFormat, maxYear }: Props) {
  const [yyyy, setY] = useState('');
  const [mm, setM] = useState('');
  const [dd, setD] = useState('');

  // Sync internal state when `value` (YYYY-MM-DD) changes from the parent.
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-');
      setY(y); setM(m); setD(d);
    } else {
      setY(''); setM(''); setD('');
    }
  }, [value]);

  const emit = (nextY: string, nextM: string, nextD: string) => {
    const yi = parseInt(nextY, 10);
    const mi = parseInt(nextM, 10);
    const di = parseInt(nextD, 10);
    if (
      nextY.length === 4 && nextM.length >= 1 && nextD.length >= 1 &&
      !isNaN(yi) && !isNaN(mi) && !isNaN(di) &&
      isValidDate(yi, mi, di)
    ) {
      const out = `${String(yi).padStart(4, '0')}-${String(mi).padStart(2, '0')}-${String(di).padStart(2, '0')}`;
      onChange(out);
    } else if (!nextY && !nextM && !nextD) {
      onChange('');
    }
  };

  const inputs: Record<Part, JSX.Element> = {
    DD: (
      <Input
        type="number"
        inputMode="numeric"
        placeholder="DD"
        aria-label="Day"
        className="h-9 w-14 text-center"
        min={1}
        max={31}
        value={dd}
        onChange={(e) => {
          const v = e.target.value.slice(0, 2);
          setD(v);
          emit(yyyy, mm, v);
        }}
      />
    ),
    MM: (
      <Input
        type="number"
        inputMode="numeric"
        placeholder="MM"
        aria-label="Month"
        className="h-9 w-14 text-center"
        min={1}
        max={12}
        value={mm}
        onChange={(e) => {
          const v = e.target.value.slice(0, 2);
          setM(v);
          emit(yyyy, v, dd);
        }}
      />
    ),
    YYYY: (
      <Input
        type="number"
        inputMode="numeric"
        placeholder="YYYY"
        aria-label="Year"
        className="h-9 w-20 text-center"
        min={1900}
        max={maxYear ?? new Date().getFullYear()}
        value={yyyy}
        onChange={(e) => {
          const v = e.target.value.slice(0, 4);
          setY(v);
          emit(v, mm, dd);
        }}
      />
    ),
  };

  const order = ORDER[dateFormat] ?? ORDER['DD/MM/YYYY'];
  const sep = SEPARATOR[dateFormat] ?? '/';

  return (
    <div className="flex items-center gap-1">
      {order.map((part, i) => (
        <Fragment key={part}>
          {i > 0 && <span className="text-muted-foreground">{sep}</span>}
          {inputs[part]}
        </Fragment>
      ))}
    </div>
  );
}
