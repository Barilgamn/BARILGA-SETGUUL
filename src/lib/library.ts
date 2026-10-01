// The whole digital library — Heyzine flipbooks plus magazines added in the
// admin — shared by the home page and «Цахим номууд».
import { useEffect, useState } from 'react';
import { MOCK_MAGAZINES } from './data';
import { fetchHeyzineMagazines } from './heyzine';
import { listMagazines } from './records';

export const CATEGORIES = [
  { id: 'all', label: 'Бүгд' },
  { id: 'magazine', label: 'Сэтгүүл' },
  { id: 'book', label: 'Ном, товхимол' },
  { id: 'norm', label: 'Норм дүрэм' },
  { id: 'standard', label: 'Стандарт' },
  { id: 'research', label: 'Судалгаа' },
  { id: 'blueprint', label: 'Зураг төсөл' },
];

// Issue number from the title ("…№191", "…сэтгүүл 177") or, for issues added
// in the admin, the separate issue field ("195")
export function issueNo(mag: any): number | null {
  const fromTitle = mag.title?.match(/(?:№\s?|сэтгүүл\s+)(\d{1,3})(?!\d)/i)?.[1];
  // Only when the field is just a number ("195", "№195"), not a year inside a subtitle
  const fromField = String(mag.issueNumber || '').match(/^\s*№?\s*(\d{1,3})\s*$/)?.[1];
  const n = Number(fromTitle ?? fromField);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Title with its number, for issues whose title doesn't carry one
export function displayTitle(mag: any): string {
  const n = issueNo(mag);
  return n && !/№\s?\d/.test(mag.title || '') && mag.category === 'magazine' ? `${mag.title} №${n}` : mag.title;
}

const flipbookKey = (link: string) => String(link || '').match(/flip-book\/([0-9a-f]{10})/i)?.[1]?.toLowerCase();

export const readHref = (item: any) =>
  item.locked ? `/buy/${item.id}` : item.heyzineLink ? `/read/${item.id}` : `/magazine/${item.id}`;

export function useLibrary() {
  const [magazines, setMagazines] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Heyzine and Supabase load independently: the catalog shows as soon as
    // Heyzine answers, and a slow or unreachable database can't hold it back
    let cancelled = false;
    let heyzineMags: any[] = [];
    let dbMags: any[] = [];
    let heyzineDone = false;
    const publish = () => {
      if (cancelled || !heyzineDone) return;
      // Admin-added issues win over the same flipbook from the Heyzine list;
      // everything is shown newest first so additions don't sink to the end
      const dbKeys = new Set(dbMags.map(m => flipbookKey(m.heyzineLink)).filter(Boolean));
      const liveMags = [...dbMags, ...heyzineMags.filter(m => !dbKeys.has(flipbookKey(m.heyzineLink)))].sort(
        (a, b) => (b.publishedDate || 0) - (a.publishedDate || 0)
      );
      setMagazines(liveMags.length > 0 ? liveMags : MOCK_MAGAZINES);
      setLoaded(true);
    };
    fetchHeyzineMagazines().then(items => {
      heyzineMags = items;
      heyzineDone = true;
      publish();
    });
    listMagazines()
      .then(items => {
        dbMags = items;
        publish();
      })
      .catch(err => console.error('Failed to fetch magazines:', err));
    return () => {
      cancelled = true;
    };
  }, []);

  return { magazines, loaded };
}
