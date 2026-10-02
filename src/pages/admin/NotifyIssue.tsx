import { useEffect, useState } from 'react';
import { BellRing, Check, Loader2 } from 'lucide-react';
import { api } from '../../lib/purchases';

// On each hand-added issue: email everyone who asked to hear about new
// issues. The server refuses a second send for the same issue.
export function NotifyIssueButton({ issueId, title }: { issueId: string; title: string }) {
  const [state, setState] = useState<{ subscribers: number; emailReady: boolean; sent: { sent_count: number; sent_at: number } | null } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/api/admin/notify-issue/${issueId}`).then(({ status, body }) => status === 200 && setState(body));
  }, [issueId]);

  if (!state) return null;
  if (state.sent) {
    return (
      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
        <Check className="w-3.5 h-3.5" /> И-мэйл мэдэгдэл илгээсэн · {state.sent.sent_count} хүн ·{' '}
        {new Date(Number(state.sent.sent_at)).toLocaleDateString('mn-MN')}
      </p>
    );
  }

  if (!state.emailReady) {
    return <p className="mt-2 text-xs text-stone-500">И-мэйл илгээх тохиргоо хийгдээгүй (Resend)</p>;
  }

  const send = async () => {
    if (!state.subscribers) return;
    if (!window.confirm(`«${title}» гарсныг ${state.subscribers} хүнд и-мэйлээр мэдэгдэх үү? Нэг дугаарт нэг л удаа илгээнэ.`)) return;
    setBusy(true);
    const { status, body } = await api(`/api/admin/notify-issue/${issueId}`, { method: 'POST' });
    setBusy(false);
    if (status === 200) {
      setState({ ...state, sent: { sent_count: body.sent, sent_at: Date.now() } });
      if (body.failed) alert(`${body.sent} хүнд илгээлээ, ${body.failed} илгээгдсэнгүй.`);
    } else if (body.error === 'already-sent') {
      alert('Энэ дугаарын мэдэгдлийг аль хэдийн илгээсэн байна.');
    } else {
      alert('Мэдэгдэл илгээж чадсангүй.');
    }
  };

  return (
    <button
      type="button"
      onClick={send}
      disabled={busy || !state.subscribers}
      className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-amber-300 bg-amber-50 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
      {state.subscribers ? `И-мэйл мэдэгдэл илгээх · ${state.subscribers} хүн` : 'Мэдэгдэл авах хүн алга'}
    </button>
  );
}
