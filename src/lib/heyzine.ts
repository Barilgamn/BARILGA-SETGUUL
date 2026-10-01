import { Magazine } from '../types';

let pending: Promise<Magazine[]> | null = null;

// Flipbooks from the Heyzine account, fetched once per page load via our server.
export function fetchHeyzineMagazines(): Promise<Magazine[]> {
  if (!pending) {
    pending = fetch('/api/heyzine/flipbooks')
      .then(res => (res.ok ? res.json() : []))
      .catch(err => {
        console.error('Failed to fetch Heyzine flipbooks:', err);
        return [];
      });
  }
  return pending;
}

export async function findHeyzineMagazine(id: string): Promise<Magazine | undefined> {
  if (!id.startsWith('hz-')) return undefined;
  const items = await fetchHeyzineMagazines();
  return items.find(m => m.id === id);
}

export interface HeyzineLookup {
  title: string;
  issueNumber?: string;
  coverImage: string;
  pages?: number;
  category?: string;
  heyzineLink: string;
}

// Cover, title and category for a pasted Heyzine flipbook link
export async function lookupHeyzineLink(url: string): Promise<HeyzineLookup | null> {
  const res = await fetch(`/api/heyzine/lookup?url=${encodeURIComponent(url.trim())}`);
  return res.ok ? res.json() : null;
}
