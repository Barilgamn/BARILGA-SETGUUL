import { ReactNode } from 'react';

// The pieces every order form is built from (catalog, magazine subscription),
// so they look and read the same: numbered steps, choice cards, plain square
// fields and a summary of what it comes to.

export const fieldClass =
  'w-full px-4 py-3 border border-stone-300 bg-white text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-950 focus:ring-2 focus:ring-stone-950/10';

// One numbered part of a form: the number on the left, its title and fields beside it
export function FormStep({ n, title, optional = false, children }: { n: number; title: string; optional?: boolean; children: ReactNode }) {
  return (
    <div role="group" aria-label={title} className="flex gap-3 sm:gap-4">
      <span className="w-8 h-8 shrink-0 flex items-center justify-center bg-stone-950 text-white text-sm font-bold tabular-nums">{n}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-stone-950 mb-3 leading-8">
          {title} {optional && <span className="font-normal text-stone-400">(заавал биш)</span>}
        </p>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children, className = '' }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-sm font-semibold text-stone-800">{label}</span>
      {children}
    </label>
  );
}

// A selectable card: dark when chosen. `aside` sits on the right (a price).
export function ChoiceCard({
  selected,
  onSelect,
  icon,
  title,
  note,
  aside,
  badge,
}: {
  selected: boolean;
  onSelect: () => void;
  icon?: ReactNode;
  title: ReactNode;
  note?: ReactNode;
  aside?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`relative w-full flex items-center gap-3 p-4 border text-left transition-colors ${
        selected ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-300 bg-white text-stone-900 hover:border-stone-950'
      }`}
    >
      {icon && <span className={selected ? 'text-amber-400' : 'text-stone-500'}>{icon}</span>}
      <span className="flex-1 min-w-0">
        <span className="block font-semibold">{title}</span>
        {note && <span className={`block text-xs mt-0.5 ${selected ? 'text-stone-300' : 'text-stone-500'}`}>{note}</span>}
      </span>
      {aside && <span className={`text-sm font-semibold tabular-nums text-right ${selected ? 'text-amber-400' : 'text-stone-700'}`}>{aside}</span>}
      {badge && <span className="absolute -top-2.5 right-3 text-[11px] font-semibold text-stone-950 bg-amber-400 px-1.5 py-0.5">{badge}</span>}
    </button>
  );
}

// «What it comes to»: item lines, then the total in large type
export function OrderSummary({ lines, total }: { lines: { label: ReactNode; value: ReactNode }[]; total: ReactNode }) {
  return (
    <dl className="space-y-1.5 text-sm">
      {lines.map((line, i) => (
        <div key={i} className="flex justify-between gap-4 text-stone-600">
          <dt>{line.label}</dt>
          <dd className="tabular-nums text-right">{line.value}</dd>
        </div>
      ))}
      <div className="flex justify-between items-baseline pt-2 border-t border-stone-200">
        <dt className="font-semibold text-stone-950">Нийт төлөх</dt>
        <dd className="font-serif text-2xl font-bold text-stone-950 tabular-nums">{total}</dd>
      </div>
    </dl>
  );
}
