import { Link, useLocation } from 'react-router-dom';
import { EVENT_CONFIG } from '../../config/event';

export function Header() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  if (isHome) return null;

  return (
    <header className="py-3 sm:py-4 px-3.5 sm:px-6">
      <div className="w-full max-w-lg sm:max-w-xl md:max-w-2xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-800 font-semibold transition-colors"
        >
          <span className="text-xl">{EVENT_CONFIG.emoji}</span>
          <span>{EVENT_CONFIG.name}</span>
        </Link>
      </div>
    </header>
  );
}
