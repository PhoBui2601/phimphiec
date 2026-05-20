import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface MovieSectionProps {
  title: string;
  movies: any[];
  link?: string;
}

const MovieSection: React.FC<MovieSectionProps> = ({ title, movies, link }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) el.addEventListener('scroll', checkScroll, { passive: true });
    return () => { if (el) el.removeEventListener('scroll', checkScroll); };
  }, [movies]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({ 
      left: direction === 'left' ? -amount : amount, 
      behavior: 'smooth' 
    });
  };

  if (!movies || movies.length === 0) return null;

  return (
    <section className="py-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 bg-gradient-to-b from-sky-400 to-blue-600 rounded-full" />
          <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Scroll arrows — visible on desktop */}
          <div className="hidden md:flex items-center gap-1.5">
            <button 
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className="p-2 rounded-xl glass text-white disabled:opacity-20 hover:bg-white/10 transition-all press"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className="p-2 rounded-xl glass text-white disabled:opacity-20 hover:bg-white/10 transition-all press"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {link && (
            <Link 
              to={link} 
              className="px-4 py-2 glass rounded-full text-white hover:text-sky-300 flex items-center text-xs md:text-sm font-semibold transition-all hover:-translate-y-0.5 whitespace-nowrap ml-2 press"
            >
              Xem tất cả <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          )}
        </div>
      </div>

      {/* Movie List — Horizontal scroll on mobile, grid on large */}
      <div className="relative">
        {/* Fade edges */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none md:hidden" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none md:hidden" />
        )}

        <div 
          ref={scrollRef}
          className="flex md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-2 md:pb-0 scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {movies.slice(0, 12).map((movie) => (
            <div key={movie.slug} className="min-w-[140px] sm:min-w-[160px] md:min-w-0 snap-start">
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MovieSection;
