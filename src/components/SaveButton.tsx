import { MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { useSavedIssues } from '../contexts/SavedIssuesContext';

type Props = {
  issue: { id: string; title: string; coverImage: string };
  // overlay: round icon on a cover; inline: labelled button next to other actions
  variant?: 'overlay' | 'inline';
  className?: string;
};

export function SaveButton({ issue, variant = 'inline', className = '' }: Props) {
  const { isSaved, toggle } = useSavedIssues();
  const navigate = useNavigate();
  const location = useLocation();
  const saved = isSaved(issue.id);
  const label = saved ? 'Хадгалсан' : 'Хадгалах';

  const onClick = async (e: MouseEvent) => {
    // Covers are links; saving must not also open the issue
    e.preventDefault();
    e.stopPropagation();
    const signedIn = await toggle(issue);
    if (!signedIn) navigate('/login', { state: { returnTo: location.pathname + location.search + location.hash } });
  };

  if (variant === 'overlay') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={saved}
        title={label}
        className={`w-10 h-10 flex items-center justify-center rounded-full shadow-md backdrop-blur transition-colors ${
          saved ? 'bg-stone-950 text-amber-400' : 'bg-white/90 text-stone-800 hover:bg-white'
        } ${className}`}
      >
        <Bookmark className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      className={`inline-flex items-center justify-center gap-2 px-5 py-3 border text-sm font-semibold transition-colors ${
        saved ? 'bg-stone-950 border-stone-950 text-white' : 'border-stone-950 text-stone-950 hover:bg-stone-950 hover:text-white'
      } ${className}`}
    >
      <Bookmark className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
      {label}
    </button>
  );
}
