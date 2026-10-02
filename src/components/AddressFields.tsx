import { ReactNode, Suspense, lazy, useState } from 'react';
import { Building2, Check, Home, Loader2, MapPin, X } from 'lucide-react';
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
            <Field label="Дүүрэг">
              <select value={value.district} onChange={e => set({ district: e.target.value, subdivision: '' })} className={control} required>
                <option value="">Дүүрэг сонгох</option>
                {UB_DISTRICTS.map(d => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Хороо">
              <select
                value={value.subdivision}
                onChange={e => set({ subdivision: e.target.value })}
                disabled={!ubDistrict}
                className={control}
                required
              >
                <option value="">{ubDistrict ? 'Хороо сонгох' : 'Эхлээд дүүргээ сонгоно уу'}</option>
                {ubDistrict &&
                  Array.from({ length: ubDistrict.khoroos }, (_, i) => String(i + 1)).map(n => (
                    <option key={n} value={n}>
                      {n}-р хороо
                    </option>
                  ))}
              </select>
            </Field>
          </>
        ) : (
          <>
            <Field label="Аймаг">
              <select value={value.district} onChange={e => set({ district: e.target.value, subdivision: '' })} className={control} required>
                <option value="">Аймаг сонгох</option>
                {AIMAGS.map(a => (
                  <option key={a.name} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Сум">
              <select value={value.subdivision} onChange={e => set({ subdivision: e.target.value })} disabled={!aimag} className={control} required>
                <option value="">{aimag ? 'Сум сонгох' : 'Эхлээд аймгаа сонгоно уу'}</option>
                {aimag && (
                  <>
                    <option value={aimag.center}>{aimag.center} (аймгийн төв)</option>
                    {aimag.sums
                      .filter(s => s !== aimag.center)
                      .map(s => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                  </>
                )}
              </select>
            </Field>
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
