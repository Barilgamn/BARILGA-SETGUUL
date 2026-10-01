import { TouchEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

// Flip through the first pages of an issue right on its cover.
// Page 1 is the cover image we already have; later pages are drawn from the
// PDF with pdf.js, which is only downloaded once the reader starts flipping
// and fetches just the byte ranges those pages need (Heyzine's CDN allows
// cross-origin range requests). Paid issues have no PDF link, so they get the
// plain cover.

const PREVIEW_PAGES = 6;
const PDFJS_VERSION = '5.7.284';

type PdfDoc = { numPages: number; getPage: (n: number) => Promise<any> };
let pdfjsPromise: Promise<any> | null = null;

function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

// The PDF behind an issue: given directly, or next to its Heyzine thumbnail
// (".../v3/<hash>.pdf-thumb.jpg" sits beside ".../v3/<hash>.pdf")
export function previewPdfUrl(issue: { pdfUrl?: string; coverImage?: string; locked?: boolean }): string | null {
  if (issue.locked) return null;
  if (issue.pdfUrl) return issue.pdfUrl;
  const m = issue.coverImage?.match(/^(https:\/\/cdnm?\.heyzine\.com\/files\/uploaded\/.+\.pdf)-thumb\.jpg$/);
  return m ? m[1] : null;
}

interface Props {
  coverImage: string;
  title: string;
  pdfUrl: string | null;
  readHref: string;
  className?: string;
}

export function PagePreview({ coverImage, title, pdfUrl, readHref, className = '' }: Props) {
  const [index, setIndex] = useState(0); // 0 = cover; PREVIEW_PAGES = "keep reading" slide
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [failed, setFailed] = useState(false);
  const [rendering, setRendering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);

  const pageCount = Math.min(PREVIEW_PAGES, doc?.numPages ?? PREVIEW_PAGES);
  const lastIndex = pageCount; // one past the pages: the call to action
  const canPreview = !!pdfUrl && !failed;

  // Open the PDF on first interaction
  const ensureDoc = async () => {
    if (doc || !pdfUrl) return doc;
    try {
      const pdfjs = await loadPdfjs();
      const loaded = await pdfjs.getDocument({
        url: pdfUrl,
        disableAutoFetch: true,
        disableStream: true,
        rangeChunkSize: 262144,
        cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/cmaps/`,
        cMapPacked: true,
      }).promise;
      setDoc(loaded);
      return loaded as PdfDoc;
    } catch (err) {
      console.error('Page preview failed to open the PDF:', err);
      setFailed(true);
      return null;
    }
  };

  // Draw the current page (index 1 → PDF page 2, …)
  useEffect(() => {
    if (!doc || index === 0 || index >= lastIndex) return;
    let cancelled = false;
    let task: any;
    setRendering(true);
    (async () => {
      try {
        const page = await doc.getPage(index + 1);
        if (cancelled || !canvasRef.current || !boxRef.current) return;
        const width = boxRef.current.clientWidth;
        const base = page.getViewport({ scale: 1 });
        const scale = (width / base.width) * Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        task = page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport });
        await task.promise;
        // Warm the next page while the reader looks at this one
        if (index + 2 <= Math.min(PREVIEW_PAGES, doc.numPages)) doc.getPage(index + 2).catch(() => undefined);
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') console.error('Page preview render failed:', err);
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel?.();
    };
  }, [doc, index, lastIndex]);

  const go = async (delta: number) => {
    const next = Math.max(0, Math.min(lastIndex, index + delta));
    if (next === index) return;
    if (next > 0 && !(await ensureDoc())) return;
    setIndex(next);
  };

  const onTouchStart = (e: TouchEvent) => (touchX.current = e.touches[0].clientX);
  const onTouchEnd = (e: TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  };

  const arrow =
    'absolute top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 text-stone-900 shadow-md hover:bg-white disabled:opacity-0 transition-opacity';

  return (
    <div className={className}>
      <div
        ref={boxRef}
        className="relative aspect-[3/4] bg-stone-200 overflow-hidden select-none shadow-[0_40px_80px_-30px_rgba(28,25,23,0.55)]"
        onTouchStart={canPreview ? onTouchStart : undefined}
        onTouchEnd={canPreview ? onTouchEnd : undefined}
      >
        {index === 0 && (
          <Link to={readHref} className="block w-full h-full">
            <img src={coverImage} alt={title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
          </Link>
        )}

        {index > 0 && index < lastIndex && (
          <>
            <canvas ref={canvasRef} className="w-full h-full object-contain bg-white" aria-label={`${title} — ${index + 1}-р хуудас`} />
            {rendering && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                <Loader2 className="w-7 h-7 animate-spin text-stone-500" />
              </div>
            )}
          </>
        )}

        {index === lastIndex && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-5 bg-stone-950 text-white px-14 py-8 text-center">
            <p className="font-serif text-2xl font-bold leading-snug">Үргэлжлүүлэн унших уу?</p>
            <p className="text-sm text-stone-400">Эхний {pageCount} хуудсыг үзлээ.</p>
            <Link to={readHref} className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 text-stone-950 text-sm font-semibold hover:bg-amber-300">
              Бүтнээр нь унших <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {canPreview && (
          <>
            <button type="button" onClick={() => go(-1)} disabled={index === 0} aria-label="Өмнөх хуудас" className={`${arrow} left-3`}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button type="button" onClick={() => go(1)} disabled={index === lastIndex} aria-label="Дараагийн хуудас" className={`${arrow} right-3`}>
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {canPreview && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm text-stone-500">
          {index === 0 ? (
            <button type="button" onClick={() => go(1)} className="inline-flex items-center gap-1.5 font-semibold text-stone-950 hover:text-amber-700">
              Эхний хуудсуудыг үзэх <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <span className="tabular-nums">
              {index < lastIndex ? `${index + 1} / ${pageCount}` : `${pageCount} / ${pageCount}`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
