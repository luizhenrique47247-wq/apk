import React, { useState, useEffect } from 'react';
import Hero from '../components/Hero';
import MediaCarousel from '../components/MediaCarousel';
import { fetchTMDB } from '../services/api';
import { categories } from '../services/config';
import * as Storage from '../services/storageService';

/**
 * Carrega os carrosséis em sequência com delay entre cada um.
 * Evita bombardear o processador fraco do projetor com 14 requisições ao mesmo tempo.
 */
export default function Home({ onSelectMedia }) {
  const [heroItem, setHeroItem] = useState(null);
  const [rowsData, setRowsData] = useState({});

  useEffect(() => {
    let cancelled = false;

    const loadSequentially = async () => {
      // 1. Carrega o Hero primeiro
      const trending = await fetchTMDB('/trending/all/day');
      if (cancelled) return;

      if (trending?.results?.length > 0) {
        const playable = trending.results.filter(i => i.backdrop_path && i.overview);
        const hero = playable[Math.floor(Math.random() * playable.length)] || trending.results[0];
        setHeroItem(hero);
        // Adiciona trending como primeira linha também
        setRowsData(prev => ({ ...prev, 'Em Alta Hoje': trending.results }));
      }

      // 2. Carrega histórico local (instantâneo, sem rede)
      const history = Storage.getWatchedHistory();
      if (history.length > 0) {
        setRowsData(prev => ({ ...prev, 'Últimos Assistidos': history }));
      }

      // 3. Carrega restante das categorias uma por uma com delay
      const apiCategories = categories.default.filter(
        cat => cat.endpoint !== 'localstorage' && cat.title !== 'Em Alta Hoje'
      );

      for (const cat of apiCategories) {
        if (cancelled) break;
        try {
          const data = await fetchTMDB(cat.endpoint);
          if (!cancelled && data?.results) {
            setRowsData(prev => ({ ...prev, [cat.title]: data.results }));
          }
        } catch { /* ignora erros individuais */ }
        // Delay entre cada chamada para não sobrecarregar o projetor
        await new Promise(r => setTimeout(r, 150));
      }
    };

    loadSequentially();
    return () => { cancelled = true; };
  }, []);

  const orderedRows = [
    'Em Alta Hoje',
    'Últimos Assistidos',
    ...categories.default
      .filter(c => c.endpoint !== 'localstorage' && c.title !== 'Em Alta Hoje')
      .map(c => c.title)
  ];

  return (
    <div className="select-none">
      <Hero
        item={heroItem}
        onPlay={(id, type, data) => onSelectMedia(id, type, 'play', data)}
        onInfo={(id, type) => onSelectMedia(id, type, 'info')}
      />

      <div className="-mt-20 md:-mt-24 relative z-20 pb-20 space-y-6 md:space-y-8">
        {/* Top 10 da primeira linha (trending) */}
        <MediaCarousel
          title="Top 10 no Brasil Hoje"
          isTop10={true}
          items={rowsData['Em Alta Hoje'] || []}
          onClickItem={(id, type) => onSelectMedia(id, type, 'info')}
        />

        {/* Demais linhas na ordem definida */}
        {orderedRows.slice(1).map(title => {
          const items = rowsData[title];
          if (!items || items.length === 0) return null;
          return (
            <MediaCarousel
              key={title}
              title={title}
              items={items}
              onClickItem={(id, type) => onSelectMedia(id, type, 'info')}
            />
          );
        })}
      </div>
    </div>
  );
}
