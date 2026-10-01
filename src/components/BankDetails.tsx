import { useState } from 'react';
import { AlertTriangle, Check, Copy } from 'lucide-react';
import { BankSettings } from '../types';

// Transfer details with one-tap copy buttons, so buyers paste the account,
// IBAN and description into their bank app instead of retyping them.

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers, or a page that isn't allowed the async clipboard
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyText(text)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }}
      aria-label={`${label} хуулах`}
      className={`print:hidden shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 border text-xs font-semibold transition-colors ${
        copied ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-stone-400 bg-white text-stone-800 hover:border-stone-950'
      }`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Хуулсан' : 'Хуулах'}
    </button>
  );
}

// "Хаан банк" → "Хаан банкны данс"
export function accountLabel(bankName: string): string {
  const name = bankName.trim();
  return /банк$/i.test(name) ? `${name}ны данс` : `${name} данс`;
}

// "MN910005005175009575" → "MN91000500 5175009575", the way banks print it
export function formatIban(iban: string): string {
  const compact = iban.replace(/\s+/g, '').toUpperCase();
  return compact.length > 10 ? `${compact.slice(0, -10)} ${compact.slice(-10)}` : compact;
}

function Row({ label, value, copy, mono = false }: { label: string; value: string; copy?: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-stone-400/40 last:border-0">
      <div className="min-w-0">
        <p className="text-xs text-stone-600">{label}</p>
        <p className={`font-semibold text-stone-950 break-all ${mono ? 'font-mono text-base sm:text-lg tracking-wide' : 'text-sm sm:text-base'}`}>
          {value}
        </p>
      </div>
      {copy && <CopyButton text={copy} label={label} />}
    </div>
  );
}

export function BankDetails({ bank, amount, reference }: { bank: BankSettings; amount?: number; reference: string }) {
  return (
    <div className="space-y-3">
      <div>
        <Row label={accountLabel(bank.bankName)} value={bank.accountNumber} copy={bank.accountNumber.replace(/\s+/g, '')} mono />
        {bank.iban && <Row label="IBAN" value={formatIban(bank.iban)} copy={bank.iban.replace(/\s+/g, '')} mono />}
        <Row label="Хүлээн авагч" value={bank.accountName} />
        {amount !== undefined && <Row label="Дүн" value={`${amount.toLocaleString()}₮`} copy={String(amount)} />}
      </div>
      <div className="bg-white/70 border border-amber-700/30 p-3 sm:p-4 space-y-2">
        <p className="flex gap-2 items-start text-sm text-stone-800">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            Гүйлгээний утга дээр <strong>нэр, утасны дугаараа заавал</strong> бичнэ үү
          </span>
        </p>
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono font-bold text-stone-950 text-base break-all">{reference}</p>
          <CopyButton text={reference} label="Гүйлгээний утга" />
        </div>
      </div>
    </div>
  );
}
