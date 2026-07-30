import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

const TABS = [
  { id: 'inicio', label: 'Início' },
  { id: 'movie', label: 'Filmes' },
  { id: 'tv', label: 'Séries' },
  { id: 'anime', label: 'Animes' },
];

export default function Navbar({ activeTab, setActiveTab, onSearch, openDetails }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/60 shadow-xl">
      <div className="flex items-center justify-between px-4 md:px-10 h-16">

        {/* Logo */}
        <span className="text-[#E50914] font-black text-xl tracking-widest uppercase flex-shrink-0">
          FUDIDOFLIX
        </span>

        {/* Abas — centro */}
        <div className="flex items-center gap-1 md:gap-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              tabIndex={0}
              className={`
                px-4 py-2 rounded-lg font-bold text-sm md:text-base transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-[#E50914] focus:ring-offset-1 focus:ring-offset-zinc-950
                ${activeTab === tab.id
                  ? 'bg-[#E50914] text-white shadow-lg shadow-red-900/30'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-800 focus:text-white focus:bg-zinc-800'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Busca */}
        <div className="flex items-center">
          {searchOpen ? (
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="bg-zinc-800 text-white placeholder-zinc-500 text-sm px-4 py-2 rounded-lg border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#E50914] w-40 md:w-56"
              />
              <button
                type="submit"
                tabIndex={0}
                className="p-2 rounded-lg bg-[#E50914] text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-white"
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                tabIndex={0}
                className="p-2 rounded-lg text-zinc-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#E50914]"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              tabIndex={0}
              aria-label="Buscar"
              className="p-2 rounded-lg text-zinc-400 hover:text-white focus:text-white focus:outline-none focus:ring-2 focus:ring-[#E50914] transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
