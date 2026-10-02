// Places for delivery addresses: Ulaanbaatar's districts with their khoroo
// counts (204 in all since the 2023 reform) and the aimags with their sums.

export const UB_DISTRICTS: { name: string; khoroos: number }[] = [
  { name: 'Багануур', khoroos: 5 },
  { name: 'Багахангай', khoroos: 2 },
  { name: 'Баянгол', khoroos: 34 },
  { name: 'Баянзүрх', khoroos: 43 },
  { name: 'Налайх', khoroos: 8 },
  { name: 'Сонгинохайрхан', khoroos: 43 },
  { name: 'Сүхбаатар', khoroos: 20 },
  { name: 'Хан-Уул', khoroos: 25 },
  { name: 'Чингэлтэй', khoroos: 24 },
];

// Aimags (alphabetical) with their centers and sums, from Mongolian
// Wikipedia's per-aimag sum categories (2026). Delivery only needs a
// recognisable place, so a few villages (Хатгал, Цагааннуур) are kept.
const AIMAG_DATA: { name: string; center: string; sums: string[] }[] = [
  { name: 'Архангай', center: 'Цэцэрлэг', sums: ["Батцэнгэл", "Булган", "Жаргалант", "Ихтамир", "Өгийнуур", "Өлзийт", "Өндөр-Улаан", "Тариат", "Төвшрүүлэх", "Хайрхан", "Хангай", "Хашаат", "Хотонт", "Цахир", "Цэнхэр", "Цэцэрлэг", "Чулуут", "Эрдэнэмандал"] },
  { name: 'Баян-Өлгий', center: 'Өлгий', sums: ["Алтай", "Алтанцөгц", "Баяннуур", "Бугат", "Булган", "Буянт", "Дэлүүн", "Ногооннуур", "Сагсай", "Толбо", "Улаанхус", "Цагааннуур", "Цэнгэл"] },
  { name: 'Баянхонгор', center: 'Баянхонгор', sums: ["Баацагаан", "Баян-Өндөр", "Баян-Овоо", "Баянбулаг", "Баянговь", "Баянлиг", "Баянцагаан", "Бөмбөгөр", "Богд", "Бууцагаан", "Галуут", "Гурванбулаг", "Жаргалант", "Жинст", "Заг", "Өлзийт", "Хүрээмарал", "Шинэжинст", "Эрдэнэцогт"] },
  { name: 'Булган', center: 'Булган', sums: ["Баян-Агт", "Баяннуур", "Бүрэгхангай", "Бугат", "Гурванбулаг", "Дашинчилэн", "Могод", "Орхон", "Рашаант", "Сайхан", "Сэлэнгэ", "Тэшиг", "Хангал", "Хишиг-Өндөр", "Хутаг-Өндөр"] },
  { name: 'Говь-Алтай', center: 'Алтай', sums: ["Алтай", "Баян-Уул", "Бигэр", "Бугат", "Дарви", "Дэлгэр", "Жаргалан", "Тайшир", "Төгрөг", "Тонхил", "Халиун", "Хөхморьт", "Цогт", "Цээл", "Чандмань", "Шарга", "Эрдэнэ"] },
  { name: 'Говьсүмбэр', center: 'Чойр', sums: ["Баянтал", "Шивээговь"] },
  { name: 'Дархан-Уул', center: 'Дархан', sums: ["Орхон", "Хонгор", "Шарынгол"] },
  { name: 'Дорноговь', center: 'Сайншанд', sums: ["Айраг", "Алтанширээ", "Даланжаргалан", "Дэлгэрэх", "Замын-Үүд", "Иххэт", "Мандах", "Өргөн", "Сайхандулаан", "Улаанбадрах", "Хатанбулаг", "Хөвсгөл", "Эрдэнэ"] },
  { name: 'Дорнод', center: 'Чойбалсан', sums: ["Баян-Уул", "Баяндун", "Баянтүмэн", "Булган", "Гурванзагал", "Дашбалбар", "Матад", "Сэргэлэн", "Халхгол", "Хөлөнбуйр", "Цагаан-Овоо", "Чойбалсан", "Чулуунхороот"] },
  { name: 'Дундговь', center: 'Мандалговь', sums: ["Адаацаг", "Баянжаргалан", "Говь-Угтаал", "Гурвансайхан", "Дэлгэрхангай", "Дэлгэрцогт", "Дэрэн", "Луус", "Өлзийт", "Өндөршил", "Сайхан-Овоо", "Хулд", "Цагаандэлгэр", "Эрдэнэдалай"] },
  { name: 'Завхан', center: 'Улиастай', sums: ["Алдархаан", "Асгат", "Баянтэс", "Баянхайрхан", "Дөрвөлжин", "Завханмандал", "Идэр", "Их-Уул", "Нөмрөг", "Отгон", "Сантмаргац", "Сонгино", "Тосонцэнгэл", "Түдэвтэй", "Тэлмэн", "Тэс", "Ургамал", "Цагаанхайрхан", "Цагаанчулуут", "Цэцэн-Уул", "Шилүүстэй", "Эрдэнэхайрхан", "Яруу"] },
  { name: 'Өвөрхангай', center: 'Арвайхээр', sums: ["Баруунбаян-Улаан", "Бат-Өлзий", "Баян-Өндөр", "Баянгол", "Богд", "Бүрд", "Гучин-Ус", "Есөнзүйл", "Зүүнбаян-Улаан", "Нарийнтээл", "Өлзийт", "Сант", "Тарагт", "Төгрөг", "Уянга", "Хайрхандулаан", "Хархорин", "Хужирт"] },
  { name: 'Өмнөговь', center: 'Даланзадгад', sums: ["Баян-Овоо", "Баяндалай", "Булган", "Гурвантэс", "Мандал-Овоо", "Манлай", "Номгон", "Ноён", "Сэврэй", "Ханбогд", "Ханхонгор", "Хүрмэн", "Цогт-Овоо", "Цогтцэций"] },
  { name: 'Орхон', center: 'Эрдэнэт', sums: ["Жаргалант"] },
  { name: 'Сэлэнгэ', center: 'Сүхбаатар', sums: ["Алтанбулаг", "Баруунбүрэн", "Баянгол", "Ерөө", "Жавхлант", "Зүүнбүрэн", "Мандал", "Орхон", "Орхонтуул", "Сайхан", "Сант", "Түшиг", "Хүдэр", "Хушаат", "Цагааннуур", "Шаамар"] },
  { name: 'Сүхбаатар', center: 'Баруун-Урт', sums: ["Асгат", "Баяндэлгэр", "Дарьганга", "Мөнххаан", "Наран", "Онгон", "Сүхбаатар", "Түвшинширээ", "Түмэнцогт", "Уулбаян", "Халзан", "Эрдэнэцагаан"] },
  { name: 'Төв', center: 'Зуунмод', sums: ["Алтанбулаг", "Аргалант", "Архуст", "Батсүмбэр", "Баян", "Баян-Өнжүүл", "Баяндэлгэр", "Баянжаргалан", "Баянхангай", "Баянцагаан", "Баянцогт", "Баянчандмань", "Борнуур", "Бүрэн", "Дэлгэрхаан", "Жаргалант", "Заамар", "Лүн", "Мөнгөнморьт", "Өндөрширээт", "Сүмбэр", "Сэргэлэн", "Угтаалцайдам", "Цээл", "Эрдэнэ", "Эрдэнэсант"] },
  { name: 'Увс', center: 'Улаангом', sums: ["Баруунтуруун", "Бөхмөрөн", "Давст", "Завхан", "Зүүнговь", "Зүүнхангай", "Малчин", "Наранбулаг", "Өлгий", "Өмнөговь", "Өндөрхангай", "Сагил", "Тариалан", "Түргэн", "Тэс", "Ховд", "Хяргас", "Цагаанхайрхан"] },
  { name: 'Ховд', center: 'Ховд', sums: ["Алтай", "Булган", "Буянт", "Дарви", "Дөргөн", "Дуут", "Зэрэг", "Манхан", "Мөнххайрхан", "Мөст", "Мянгад", "Үенч", "Ховд", "Цэцэг", "Чандмань", "Эрдэнэбүрэн"] },
  { name: 'Хэнтий', center: 'Чингис', sums: ["Батноров", "Батширээт", "Баян-Адарга", "Баян-Овоо", "Баянмөнх", "Баянхутаг", "Биндэр", "Бор-Өндөр", "Галшар", "Дадал", "Дархан", "Дэлгэрхаан", "Жаргалтхаан", "Мөрөн", "Норовлин", "Өмнөдэлгэр", "Цэнхэрмандал"] },
  { name: 'Хөвсгөл', center: 'Мөрөн', sums: ["Алаг-Эрдэнэ", "Арбулаг", "Баянзүрх", "Бүрэнтогтох", "Галт", "Жаргалант", "Их-Уул", "Рашаант", "Рэнчинлхүмбэ", "Тариалан", "Төмөрбулаг", "Тосонцэнгэл", "Түнэл", "Улаан-Уул", "Ханх", "Хатгал", "Цагаан-Үүр", "Цагаан-Уул", "Цагааннуур", "Цэцэрлэг", "Чандмань-Өндөр", "Шинэ-Идэр", "Эрдэнэбулган"] },
];

const byMongolian = (a: string, b: string) => a.localeCompare(b, 'mn');

// Alphabetical by Mongolian order (Ө after О, Ү after У)
export const AIMAGS = [...AIMAG_DATA]
  .sort((a, b) => byMongolian(a.name, b.name))
  .map(a => ({ ...a, sums: [...a.sums].sort(byMongolian) }));

export type Region = 'ub' | 'countryside';
export type PlaceType = 'home' | 'office';

export interface DeliveryAddress {
  region: Region;
  // UB district, or the aimag
  district: string;
  // UB khoroo number ("12"), or the sum
  subdivision: string;
  // Building, entrance, floor, door — or the organisation and room
  detail: string;
  placeType: PlaceType;
  // Optional pin from the map
  lat: number | null;
  lng: number | null;
}

export const emptyAddress = (): DeliveryAddress => ({
  region: 'ub',
  district: '',
  subdivision: '',
  detail: '',
  placeType: 'home',
  lat: null,
  lng: null,
});

export const PLACE_LABELS: Record<PlaceType, string> = { home: 'Гэр', office: 'Оффис' };

export function addressComplete(a: DeliveryAddress): boolean {
  return !!(a.district && a.subdivision && a.detail.trim());
}

// The columns the order tables keep: city is «Улаанбаатар» or the aimag,
// district the UB district or the sum, khoroo only in Ulaanbaatar
export function addressColumns(a: DeliveryAddress) {
  const ub = a.region === 'ub';
  return {
    city: ub ? 'Улаанбаатар' : a.district,
    district: ub ? a.district : a.subdivision,
    khoroo: ub ? a.subdivision : '',
    detail: a.detail.trim(),
    placeType: a.placeType,
    lat: a.lat,
    lng: a.lng,
  };
}

export function formatAddress(p: { city?: string; district?: string; khoroo?: string; detail?: string }): string {
  // Older orders had «Орон нутаг» and a typed-in district, sometimes with its suffix
  const legacy = p.city === 'Орон нутаг';
  const ub = !p.city || p.city === 'Улаанбаатар';
  const suffix = (name: string, word: string) => (new RegExp(`${word}$`, 'i').test(name.trim()) ? name.trim() : `${name.trim()} ${word}`);
  return [
    legacy ? 'Орон нутаг' : ub ? 'Улаанбаатар' : p.city && suffix(p.city, 'аймаг'),
    p.district && (legacy ? p.district : suffix(p.district, ub ? 'дүүрэг' : 'сум')),
    p.khoroo && `${p.khoroo}-р хороо`,
    p.detail,
  ]
    .filter(Boolean)
    .join(', ');
}

export const mapLink = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
