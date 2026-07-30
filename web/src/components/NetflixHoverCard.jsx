import React, { useState, useEffect } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { IMG_POSTER_URL } from '../services/api';
import * as Storage from '../services/storageService';

/**
 * Card simples e leve — sem hover expansion, sem fetch extra, sem animações pesadas.
 * Otimizado para projetor fraco e navegação por D-pad.
 */
export default function NetflixHoverCard({ item, type, onClickItem, showRemoveButton, onRemove }) {
  const [isInList, setIsInList] = useState(false);
  const itemType = (type && type !== 'anime') ? type : (item.media_type || (item.title ? 'movie' : 'tv'));
  const posterPath = item.poster_path;

  useEffect(() => {
    setIsInList(Storage.isItemInMyList(item.id, itemType));
  }, [item.id, itemType]);

  if (!posterPath) return null;

  const handleClick = () => {
    if (onClickItem) onClickItem(item.id, itemType, 'info');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') handleClick();
  };

  const handleToggleList = (e) => {
    e.stopPropagation();
    if (isInList) {
      Storage.removeFromMyList(item.id, itemType);
      setIsInList(false);
    } else {
      Storage.saveToMyList({
        id: item.id, type: itemType,
        title: item.title || item.name,
        poster_path: item.poster_path,
        media_type: itemType
      });
      setIsInList(true);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (onRemove) onRemove(item);
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={item.title || item.name}
      className="relative cursor-pointer rounded-lg overflow-hidden bg-zinc-900 group focus:outline-none focus:ring-2 focus:ring-[#E50914] focus:ring-offset-1 focus:ring-offset-zinc-950"
    >
      {/* Poster */}
      <img
        src={`${IMG_POSTER_URL}${posterPath}`}
        alt={item.title || item.name}
        className="w-full h-auto aspect-[2/3] object-cover"
        loading="lazy"
        decoding="async"
      />

      {/* Overlay com título — visível no focus/hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2 pointer-events-none">
        <span className="text-white text-xs font-bold leading-tight line-clamp-2 text-center">
          {item.title || item.name}
        </span>
      </div>

      {/* Botão + minha lista */}
      <button
        onClick={handleToggleList}
        tabIndex={-1}
        className={`absolute top-1.5 right-1.5 z-10 w-7 h-7 rounded-full flex items-center justify-center border opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-all duration-200 ${
          isInList
            ? 'bg-green-600/90 border-green-500 text-white'
            : 'bg-black/70 border-zinc-600 text-white hover:bg-zinc-700'
        }`}
        title={isInList ? 'Remover da lista' : 'Adicionar à lista'}
      >
        {isInList ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
      </button>

      {/* Botão remover (histórico/lista) */}
      {showRemoveButton && (
        <button
          onClick={handleRemove}
          tabIndex={-1}
          className="absolute top-1.5 left-1.5 z-10 w-7 h-7 rounded-full bg-black/70 hover:bg-red-600 border border-zinc-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-all duration-200"
          title="Remover"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
