import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DetailsModal from './components/DetailsModal';
import PlayerModal from './components/PlayerModal';
import Home from './views/Home';
import Browse from './views/Browse';
import CategoryPage from './views/CategoryPage';
import { ArrowLeft, Loader2, ArrowUp } from 'lucide-react';
import { fetchTMDB, IMG_POSTER_URL } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('inicio');

  // Search / Actor / Genre states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [actorDetails, setActorDetails] = useState(null);
  const [actorCredits, setActorCredits] = useState([]);
  const [loadingActor, setLoadingActor] = useState(false);
  const [genreFilter, setGenreFilter] = useState(null);

  // Modal states
  const [detailsMedia, setDetailsMedia] = useState(null);
  const [playerMedia, setPlayerMedia] = useState(null);

  // Scroll to top button
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    setActiveTab('search');
    setLoadingSearch(true);
    try {
      const data = await fetchTMDB(`/search/multi?query=${encodeURIComponent(query)}`);
      setSearchResults(data?.results?.filter(i => i.media_type !== 'person' && i.poster_path) || []);
    } catch { setSearchResults([]); }
    finally { setLoadingSearch(false); }
  };

  const handleSelectActor = async (actorId, actorName) => {
    setActorDetails({ id: actorId, name: actorName });
    setActiveTab('actor');
    setLoadingActor(true);
    try {
      const [movieData, tvData] = await Promise.all([
        fetchTMDB(`/person/${actorId}/movie_credits`),
        fetchTMDB(`/person/${actorId}/tv_credits`)
      ]);
      const all = [
        ...(movieData?.cast || []).map(m => ({ ...m, media_type: 'movie' })),
        ...(tvData?.cast || []).map(t => ({ ...t, media_type: 'tv' })),
      ];
      const unique = [...new Map(all.map(i => [i.id, i])).values()];
      setActorCredits(unique.filter(i => i.poster_path).sort((a, b) => b.popularity - a.popularity));
    } catch { setActorCredits([]); }
    finally { setLoadingActor(false); }
  };

  const handleSelectGenre = (genreId, genreName, type) => {
    setGenreFilter({ id: genreId, name: genreName, type });
    setActiveTab('genre');
  };

  const handlePlayMedia = (id, type, season = null, episode = null, itemData = null, resolvedStreamUrl = null) => {
    setPlayerMedia({ id, type, season, episode, itemData, resolvedStreamUrl, isTrailer: false });
  };

  const handlePlayTrailer = async (id, type) => {
    try {
      const data = await fetchTMDB(type === 'movie' ? `/movie/${id}/videos` : `/tv/${id}/videos`);
      if (data?.results?.length > 0) {
        const trailers = data.results.filter(v => v.site === 'YouTube' && v.type === 'Trailer');
        const t = trailers.find(t => t.official) || trailers[0] || data.results[0];
        setPlayerMedia({ id, type, isTrailer: true, trailerKey: t.key });
      } else {
        alert('Nenhum trailer encontrado.');
      }
    } catch { /* noop */ }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans select-none">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSearch={handleSearch}
        openDetails={(id, type) => setDetailsMedia({ id, type })}
      />

      <main className="flex-1">
        {activeTab === 'inicio' && (
          <Home onSelectMedia={(id, type) => setDetailsMedia({ id, type })} />
        )}

        {(activeTab === 'tv' || activeTab === 'movie' || activeTab === 'anime') && (
          <CategoryPage
            type={activeTab}
            title={activeTab === 'tv' ? 'Séries' : activeTab === 'movie' ? 'Filmes' : 'Animes'}
            onSelectMedia={(id, type, mode, data) => {
              if (mode === 'play') handlePlayMedia(id, type, null, null, data);
              else setDetailsMedia({ id, type: type === 'anime' ? 'tv' : type });
            }}
          />
        )}

        {/* Busca */}
        {activeTab === 'search' && (
          <div className="pt-20 px-4 md:px-16 pb-20">
            <h2 className="text-3xl font-black mb-8">Resultados para "{searchQuery}"</h2>
            {loadingSearch ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#E50914] animate-spin mr-2" />
                <span className="text-zinc-500 font-semibold text-sm">Pesquisando...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-zinc-500 font-medium">Nenhum resultado encontrado.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {searchResults.map(item => (
                  <div
                    key={item.id}
                    onClick={() => setDetailsMedia({ id: item.id, type: item.media_type })}
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setDetailsMedia({ id: item.id, type: item.media_type })}
                    className="relative cursor-pointer rounded-lg overflow-hidden group shadow-md focus:outline-none focus:ring-2 focus:ring-[#E50914]"
                  >
                    <img
                      src={`${IMG_POSTER_URL}${item.poster_path}`}
                      className="w-full h-auto aspect-[2/3] object-cover transition-transform group-hover:scale-105 group-focus:scale-105"
                      alt=""
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-transparent p-4 flex flex-col justify-end text-center opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <span className="text-white text-xs font-bold leading-tight line-clamp-2">{item.title || item.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filmografia de ator */}
        {activeTab === 'actor' && actorDetails && (
          <div className="pt-20 px-4 md:px-16 pb-20">
            <button
              onClick={() => setActiveTab('inicio')}
              tabIndex={0}
              className="flex items-center space-x-2 text-zinc-400 hover:text-white focus:text-white mb-6 font-bold text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E50914] rounded-lg px-2 py-1"
            >
              <ArrowLeft className="w-5 h-5" /> <span>Voltar</span>
            </button>
            <h2 className="text-3xl font-black mb-8">Filmografia de {actorDetails.name}</h2>
            {loadingActor ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#E50914] animate-spin mr-2" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {actorCredits.map(item => (
                  <div
                    key={item.id}
                    onClick={() => setDetailsMedia({ id: item.id, type: item.media_type })}
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setDetailsMedia({ id: item.id, type: item.media_type })}
                    className="relative cursor-pointer rounded-lg overflow-hidden group shadow-md focus:outline-none focus:ring-2 focus:ring-[#E50914]"
                  >
                    <img src={`${IMG_POSTER_URL}${item.poster_path}`} className="w-full h-auto aspect-[2/3] object-cover transition-transform group-hover:scale-105 group-focus:scale-105" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-transparent p-4 flex flex-col justify-end text-center opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <span className="text-white text-xs font-bold leading-tight line-clamp-2">{item.title || item.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filtro por gênero */}
        {activeTab === 'genre' && genreFilter && (
          <div className="pt-20 px-4 md:px-16 pb-20">
            <button
              onClick={() => setActiveTab('inicio')}
              tabIndex={0}
              className="flex items-center space-x-2 text-zinc-400 hover:text-white focus:text-white mb-6 font-bold text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E50914] rounded-lg px-2 py-1"
            >
              <ArrowLeft className="w-5 h-5" /> <span>Voltar</span>
            </button>
            <Browse
              type={genreFilter.type}
              title={`${genreFilter.type === 'movie' ? 'Filmes' : 'Séries'} de ${genreFilter.name}`}
              onSelectMedia={(id, type) => setDetailsMedia({ id, type })}
              initialGenre={genreFilter.id}
            />
          </div>
        )}
      </main>

      <footer className="text-center text-[#E50914] text-xs font-black py-8 border-t border-zinc-900">
        FUDIDOFLIX © {new Date().getFullYear()}
      </footer>

      {/* Botão voltar ao topo */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          tabIndex={0}
          className="fixed bottom-6 right-6 z-50 p-3.5 bg-[#E50914] rounded-full text-white cursor-pointer hover:bg-red-700 active:scale-95 transition-all shadow-xl focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Voltar ao topo"
        >
          <ArrowUp className="w-6 h-6 stroke-[2.5]" />
        </button>
      )}

      {/* Modal de detalhes */}
      {detailsMedia && (
        <DetailsModal
          id={detailsMedia.id}
          type={detailsMedia.type}
          onClose={() => setDetailsMedia(null)}
          onPlay={handlePlayMedia}
          onPlayTrailer={handlePlayTrailer}
          onSelectActor={handleSelectActor}
          onSelectGenre={handleSelectGenre}
          onSelectMedia={(id, type) => setDetailsMedia({ id, type })}
        />
      )}

      {/* Modal do player */}
      {playerMedia && (
        <PlayerModal
          id={playerMedia.id}
          type={playerMedia.type}
          initialSeason={playerMedia.season}
          initialEpisode={playerMedia.episode}
          itemData={playerMedia.itemData}
          resolvedStreamUrl={playerMedia.resolvedStreamUrl}
          isTrailer={playerMedia.isTrailer}
          trailerKey={playerMedia.trailerKey}
          onClose={() => setPlayerMedia(null)}
          onPlayerClose={() => setPlayerMedia(null)}
        />
      )}
    </div>
  );
}
