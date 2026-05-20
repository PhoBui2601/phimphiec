import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, X, Clock } from 'lucide-react';
import { getMovieImageUrl } from '../services/api';

interface ContinueWatchingCardProps {
  item: {
    movie_slug: string;
    movie_name: string;
    poster_url: string;
    episode_slug: string;
    episode_name: string;
    timestamp: number;
    duration: number;
  };
  onRemove?: () => void;
}

const formatRemaining = (timestamp: number, duration: number): string => {
  const remaining = Math.max(0, duration - timestamp);
  const mins = Math.floor(remaining / 60);
  if (mins < 1) return 'Gần xong';
  if (mins < 60) return `Còn ${mins} phút`;
  const hrs = Math.floor(mins / 60);
  return `Còn ${hrs}h${mins % 60}p`;
};

const ContinueWatchingCard: React.FC<ContinueWatchingCardProps> = ({ item, onRemove }) => {
  const navigate = useNavigate();
  const imageUrl = getMovieImageUrl(item.poster_url);

  const progress = item.duration > 0 ? (item.timestamp / item.duration) * 100 : 0;

  return (
    <div 
      onClick={() => navigate(`/watch/${item.movie_slug}`)} 
      className="group cursor-pointer relative block aspect-[2/3] rounded-2xl overflow-hidden bg-slate-800/50 border border-white/[0.06] shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-white/15 press"
    >
      <img
        src={imageUrl}
        alt={item.movie_name}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {/* Remove Button */}
      {onRemove && (
        <button 
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => { 
            e.stopPropagation(); 
            onRemove(); 
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute top-2 right-2 p-2 rounded-full bg-black/60 hover:bg-red-500/80 text-white opacity-100 backdrop-blur-md transition-all z-10 press"
          style={{ touchAction: 'manipulation' }}
          title="Xoá khỏi danh sách"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Play Button */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-sky-500/80 backdrop-blur-sm flex items-center justify-center text-white shadow-lg opacity-70 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300">
          <Play className="w-4 h-4 lg:w-5 lg:h-5 fill-current ml-0.5" />
        </div>
      </div>

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h3 className="text-white font-semibold text-sm line-clamp-2 leading-tight mb-1 group-hover:text-sky-300 transition-colors">
          {item.movie_name}
        </h3>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sky-400/80 text-xs font-medium">
            Tập {item.episode_name}
          </p>
          <div className="flex items-center gap-1 text-gray-400 text-[10px]">
            <Clock className="w-3 h-3" />
            <span>{formatRemaining(item.timestamp, item.duration)}</span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-500 transition-all duration-500" 
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ContinueWatchingCard;
