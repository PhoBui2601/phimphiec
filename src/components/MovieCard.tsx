import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Star } from 'lucide-react';
import { getMovieImageUrl } from '../services/api';

interface MovieProps {
  movie: {
    _id?: string;
    name: string;
    slug: string;
    origin_name: string;
    poster_url: string;
    thumb_url: string;
    year: number;
    episode_current?: string;
    episode_total?: string;
    lang?: string;
    quality?: string;
  };
  isUpcoming?: boolean;
}

const MovieCard: React.FC<MovieProps> = ({ movie, isUpcoming }) => {
  const imageUrl = getMovieImageUrl(movie.thumb_url);

  return (
    <Link 
      to={`/movie/${movie.slug}`} 
      className="group relative block aspect-[2/3] rounded-2xl overflow-hidden bg-slate-800/50 border border-white/[0.06] shadow-lg transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] hover:border-white/20"
    >
      <img
        src={imageUrl}
        alt={movie.name}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        loading="lazy"
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.07] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      {/* Play Button — always subtly visible, full on hover */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-11 h-11 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white opacity-50 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-400 ease-out shadow-lg">
          <Play className="w-5 h-5 md:w-6 md:h-6 fill-white ml-0.5 drop-shadow-md" />
        </div>
      </div>

      {/* Badges */}
      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
        {isUpcoming && (
          <span className="bg-amber-500/90 backdrop-blur-sm text-black text-[10px] font-bold px-2.5 py-0.5 rounded-lg shadow-md">
            Sắp Chiếu
          </span>
        )}
        {!isUpcoming && movie.episode_current && (
          <span className="bg-sky-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-0.5 rounded-lg shadow-md">
            {movie.episode_current}
          </span>
        )}
        {movie.quality && (
          <span className="bg-rose-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-0.5 rounded-lg shadow-md">
            {movie.quality}
          </span>
        )}
      </div>

      {/* Info panel — slides up on hover */}
      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
        <div className="glass rounded-xl px-3 py-2.5">
          <h3 className="text-white font-semibold text-[13px] line-clamp-1 leading-tight group-hover:text-sky-300 transition-colors">
            {movie.name}
          </h3>
          <div className="flex items-center justify-between mt-1">
            <p className="text-gray-400 text-[11px] truncate max-w-[70%]">
              {movie.origin_name}
            </p>
            {Number(movie.year) > 0 && (
              <span className="text-amber-400/80 text-[11px] font-bold shrink-0">{movie.year}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default MovieCard;
