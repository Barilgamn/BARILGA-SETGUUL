import { Component, ReactNode } from 'react';

// One broken page shouldn't blank the whole site: show a way back instead
type Props = { children: ReactNode; resetKey?: string };

export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  // The project has no @types/react, so spell out what Component provides
  declare props: Props;
  declare setState: (state: { failed: boolean }) => void;
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Page crashed:', error);
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="text-center py-20 space-y-4">
        <p className="font-serif text-xl font-bold text-stone-900">Уучлаарай, алдаа гарлаа</p>
        <p className="text-sm text-stone-500">Хуудсаа шинэчлээд дахин оролдоно уу. Асуудал давтагдвал 9100-0233 руу залгана уу.</p>
        <a href="/" className="inline-block px-6 py-3 rounded-xl bg-stone-900 text-white text-sm font-semibold">Нүүр хуудас</a>
      </div>
    );
  }
}
