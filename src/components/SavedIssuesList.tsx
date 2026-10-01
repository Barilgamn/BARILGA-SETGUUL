import { Link } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { useSavedIssues } from '../contexts/SavedIssuesContext';
import { SaveButton } from './SaveButton';

// «Хадгалсан» on Миний хэвлэлүүд: issues bookmarked with the Хадгалах button
export function SavedIssuesList() {
  const { saved } = useSavedIssues();

  return (
    <section className="space-y-4">
      <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">Хадгалсан</h2>
      {saved.length === 0 ? (
        <p className="text-sm text-stone-500 flex items-center gap-2">
          <Bookmark className="w-4 h-4" />
          Сэтгүүлийн хавтас дээрх хавчуурга товчийг дарж хадгалаарай — энд цуглана.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-6">
          {saved.map(item => (
            <article key={item.issueId} className="flex flex-col">
              <div className="relative">
                <Link to={`/read/${item.issueId}`} className="block aspect-[3/4] overflow-hidden ring-1 ring-stone-200 shadow-sm bg-stone-100">
                  <img src={item.coverImage} alt={item.title} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </Link>
                <SaveButton
                  issue={{ id: item.issueId, title: item.title, coverImage: item.coverImage }}
                  variant="overlay"
                  className="absolute top-2 right-2"
                />
              </div>
              <Link to={`/read/${item.issueId}`} className="mt-2 text-sm font-semibold text-stone-900 leading-snug line-clamp-2 hover:underline">
                {item.title}
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
