import { ReactNode, Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Building2, Check, ChevronDown, Home, Loader2, MapPin, X } from 'lucide-react';
import { AIMAGS, DeliveryAddress, PlaceType, Region, UB_DISTRICTS } from '../lib/places';

// Delivery address: Ulaanbaatar district → khoroo, or aimag → sum; home or
// office; the detailed address; and, if the buyer wants, a pin on the map.

const LocationPicker = lazy(() => import('./LocationPicker'));

const control =
  'w-full px-4 py-3 bg-white border border-stone-300 text-base text-stone-950 focus:outline-none focus:border-stone-950 focus:ring-2 focus:ring-stone-950/10 disabled:bg-stone-100 disabled:text-stone-400';

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string; icon?: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 border border-stone-300 bg-white">
      {options.map(opt => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.id)}
            className={`inline-flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
              active ? 'bg-stone-950 text-white' : 'text-stone-700 hover:bg-stone-50'
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-stone-800">{label}</span>
      {children}
    </label>
  );
}

// A dropdown that opens right under its field, at a fixed height, instead of
// the browser's own menu (43 khoroos filled the whole screen on a Mac).
// Khoroos show as a grid of numbers; places as a scrolling list.
function Picker({
  label,
  value,
  display,
  placeholder,
  disabled,
  options,
  grid = false,
  onChange,
}: {
  label: string;
  value: string;
  display?: string;
  placeholder: string;
  disabled?: boolean;
  options: { value: string; label: string; note?: string }[];
  grid?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', escape);
    // Bring the whole panel into view, then start the list at the current choice
    panelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    panelRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <div ref={boxRef} className="relative space-y-1.5">
      <span className="block text-sm font-semibold text-stone-800">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${control} flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed`}
      >
        <span className={value ? 'text-stone-950' : 'text-stone-400'}>{value ? display || value : placeholder}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-stone-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          ref={panelRef}
          role="listbox"
          aria-label={label}
          className={`absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-stone-300 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.35)] max-h-72 overflow-y-auto overscroll-contain ${
            grid ? 'grid grid-cols-6 sm:grid-cols-8 gap-1 p-2' : 'py-1'
          }`}
        >
          {options.map(opt => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={
                  grid
                    ? `h-10 text-sm font-semibold tabular-nums transition-colors ${
                        selected ? 'bg-stone-950 text-white' : 'bg-stone-50 text-stone-800 hover:bg-amber-100'
                      }`
                    : `w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                        selected ? 'bg-stone-950 text-white' : 'text-stone-800 hover:bg-stone-100'
                      }`
                }
              >
                <span>{opt.label}</span>
                {!grid && opt.note && <span className={`text-xs ${selected ? 'text-stone-300' : 'text-stone-400'}`}>{opt.note}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AddressFields({ value, onChange }: { value: DeliveryAddress; onChange: (a: DeliveryAddress) => void }) {
  const [mapOpen, setMapOpen] = useState(value.lat != null);
  const set = (patch: Partial<DeliveryAddress>) => onChange({ ...value, ...patch });
  const ub = value.region === 'ub';
  const ubDistrict = UB_DISTRICTS.find(d => d.name === value.district);
  const aimag = AIMAGS.find(a => a.name === value.district);
  const pinned = value.lat != null && value.lng != null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Segmented<Region>
          label="Хот эсвэл орон нутаг"
          value={value.region}
          onChange={region => region !== value.region && set({ region, district: '', subdivision: '' })}
          options={[
            { id: 'ub', label: 'Улаанбаатар' },
            { id: 'countryside', label: 'Орон нутаг' },
          ]}
        />
        <Segmented<PlaceType>
          label="Хүргүүлэх газар"
          value={value.placeType}
          onChange={placeType => set({ placeType })}
          options={[
            { id: 'home', label: 'Гэртээ', icon: <Home className="w-4 h-4" /> },
            { id: 'office', label: 'Оффист', icon: <Building2 className="w-4 h-4" /> },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ub ? (
          <>
            <Picker
              label="Дүүрэг"
              value={value.district}
              placeholder="Дүүрэг сонгох"
              options={UB_DISTRICTS.map(d => ({ value: d.name, label: d.name, note: `${d.khoroos} хороо` }))}
              onChange={district => district !== value.district && set({ district, subdivision: '' })}
            />
            <Picker
              label="Хороо"
              value={value.subdivision}
              display={`${value.subdivision}-р хороо`}
              placeholder={ubDistrict ? 'Хороо сонгох' : 'Эхлээд дүүргээ сонгоно уу'}
              disabled={!ubDistrict}
              grid
              options={Array.from({ length: ubDistrict?.khoroos || 0 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
              onChange={subdivision => set({ subdivision })}
            />
          </>
        ) : (
          <>
            <Picker
              label="Аймаг"
              value={value.district}
              placeholder="Аймаг сонгох"
              options={AIMAGS.map(a => ({ value: a.name, label: a.name, note: a.center }))}
              onChange={district => district !== value.district && set({ district, subdivision: '' })}
            />
            <Picker
              label="Сум"
              value={value.subdivision}
              display={aimag && value.subdivision === aimag.center ? `${value.subdivision} (аймгийн төв)` : value.subdivision}
              placeholder={aimag ? 'Сум сонгох' : 'Эхлээд аймгаа сонгоно уу'}
              disabled={!aimag}
              options={
                aimag
                  ? [
                      { value: aimag.center, label: aimag.center, note: 'аймгийн төв' },
                      ...aimag.sums.filter(s => s !== aimag.center).map(s => ({ value: s, label: s })),
                    ]
                  : []
              }
              onChange={subdivision => set({ subdivision })}
            />
          </>
        )}
      </div>

      <Field label="Дэлгэрэнгүй хаяг">
        <textarea
          value={value.detail}
          onChange={e => set({ detail: e.target.value })}
          rows={3}
          maxLength={300}
          required
          placeholder={
            value.placeType === 'office'
              ? 'Байгууллагын нэр, байр, давхар, өрөөний дугаар'
              : ub
                ? 'Хотхон / гудамж, байр, орц, давхар, тоот, орцны код'
                : 'Баг, гудамж, байр, тоот эсвэл хашааны дугаар'
          }
          className={`${control} resize-y`}
        />
      </Field>

      <div className="border border-stone-300 bg-white">
        {!mapOpen ? (
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-stone-50"
          >
            <MapPin className="w-5 h-5 text-amber-700 shrink-0" />
            <span className="flex-1">
              <span className="block text-sm font-semibold text-stone-950">Газрын зураг дээр байршлаа заах</span>
              <span className="block text-xs text-stone-500">Заавал биш — хүргэгч хаягийг илүү хурдан олно</span>
            </span>
          </button>
        ) : (
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-stone-950 flex items-center gap-1.5">
                {pinned ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" /> Байршил тэмдэглэгдлээ
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 text-amber-700" /> Байршлаа заана уу
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() => {
                  setMapOpen(false);
                  set({ lat: null, lng: null });
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-stone-950"
              >
                <X className="w-3.5 h-3.5" /> {pinned ? 'Арилгах' : 'Хаах'}
              </button>
            </div>
            <Suspense
              fallback={
                <div className="h-64 sm:h-72 flex items-center justify-center bg-stone-100">
                  <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
                </div>
              }
            >
              <LocationPicker lat={value.lat} lng={value.lng} inUlaanbaatar={ub} onChange={(lat, lng) => set({ lat, lng })} />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
