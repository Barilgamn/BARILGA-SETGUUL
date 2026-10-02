import { useEffect, useState } from 'react';
import { Loader2, Printer } from 'lucide-react';
import { BankSettings } from '../types';
import { getBankSettings } from '../lib/purchases';
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_TEL } from '../lib/bank';
import { BankDetails } from './BankDetails';

export interface InvoiceProps {
  number: string;
  date: number;
  buyer: { name?: string; phone?: string; company?: string; registerNumber?: string };
  items: { label: string; quantity?: number; amount: number }[];
  // What the buyer must write in the transfer description
  reference: string;
  note?: string;
}

// Printable invoice with the transfer details. The site chrome is hidden in
// print, so "Хэвлэх / PDF" gives a clean one-page invoice.
export function Invoice({ number, date, buyer, items, reference, note }: InvoiceProps) {
  const [bank, setBank] = useState<BankSettings | null>(null);

  useEffect(() => {
    getBankSettings().then(setBank);
  }, []);

  const total = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-stone-900 p-6 sm:p-10 print:border-0 print:p-0 space-y-7">
        <div className="flex flex-wrap justify-between gap-4 border-b border-stone-900 pb-5">
          <div>
            <p className="font-serif text-3xl font-bold text-stone-950">Нэхэмжлэх</p>
            <p className="text-sm text-stone-500 mt-1">
              № {number} · {new Date(date).toLocaleDateString('mn-MN')}
            </p>
          </div>
          <div className="text-sm text-stone-600 sm:text-right">
            <p className="font-semibold text-stone-950">Барилга МН сэтгүүл</p>
            <p>Баянзүрх дүүрэг, 6-р хороо</p>
            <p>Утас: {CONTACT_PHONE}</p>
            <p>{CONTACT_EMAIL}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-stone-500">Худалдан авагч</p>
            {buyer.company && <p className="font-semibold text-stone-950">{buyer.company}</p>}
            {buyer.registerNumber && <p className="text-stone-700">РД: {buyer.registerNumber}</p>}
            {buyer.name && <p className="text-stone-950">{buyer.name}</p>}
            {buyer.phone && <p className="text-stone-700">{buyer.phone}</p>}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-stone-500 border-b border-stone-300">
              <th className="py-2 font-medium">Бүтээгдэхүүн</th>
              <th className="py-2 font-medium text-right">Дүн</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.label} className="border-b border-stone-100">
                <td className="py-3 text-stone-950">
                  {item.label}
                  {item.quantity && item.quantity > 1 ? ` × ${item.quantity}` : ''}
                </td>
                <td className="py-3 text-right tabular-nums text-stone-950">{item.amount.toLocaleString()}₮</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-4 font-semibold text-stone-950">Нийт төлөх</td>
              <td className="pt-4 text-right font-serif text-2xl font-bold tabular-nums text-stone-950">
                {total.toLocaleString()}₮
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="bg-[#EDE8DF] print:bg-transparent print:border print:border-stone-400 p-5 sm:p-6 space-y-3 text-sm">
          <p className="font-semibold text-stone-950">Төлбөр шилжүүлэх данс</p>
          {!bank ? (
            <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
          ) : (
            <BankDetails bank={bank} amount={total} reference={reference} />
          )}
        </div>

        <p className="text-sm text-stone-600">
          {note || 'Төлбөр орсныг шалгаад захиалгыг баталгаажуулна.'} Лавлах:{' '}
          <a href={CONTACT_PHONE_TEL} className="font-semibold text-stone-950 underline-offset-2 hover:underline">
            {CONTACT_PHONE}
          </a>
        </p>
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        className="print:hidden inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 border border-stone-950 text-stone-950 hover:bg-stone-950 hover:text-white text-sm font-semibold transition-colors"
      >
        <Printer className="w-4 h-4" /> Нэхэмжлэх хэвлэх / PDF
      </button>
    </div>
  );
}

export function transferReference(name: string | undefined, phone: string | undefined): string {
  return [name?.trim(), phone?.replace(/[^\d]/g, '').replace(/^976(?=\d{8}$)/, '')].filter(Boolean).join(' ') || 'Нэр, утас';
}
