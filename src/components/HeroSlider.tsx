import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Play, Info, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getMovieImageUrl } from '../services/api';

interface Movie {
  _id: string;
  name: string;
  slug: string;
  origin_name: string;
  thumb_url: string;
  poster_url: string;
  year: number;
  category?: { name: string; slug?: string; id?: string }[];
  time?: string;
  quality?: string;
  lang?: string;
  content?: string;
}

interface HeroSliderProps {
  movies: Movie[];
}

const HeroSlider: React.FC<HeroSliderProps> = ({ movies }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Take only the first 5 movies
  const sliderMovies = movies.slice(0, 5);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sliderMovies.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, sliderMovies.length]);

  if (sliderMovies.length === 0) return null;

  const currentMovie = sliderMovies[currentIndex];
  
  const getImageUrl = (url: string) => {
    return getMovieImageUrl(url);
  };

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % sliderMovies.length);
  }, [sliderMovies.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + sliderMovies.length) % sliderMovies.length);
  }, [sliderMovies.length]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].clientX;
    setIsAutoPlaying(false);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    const SWIPE_THRESHOLD = 50;
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0) goNext();
      else goPrev();
    }
    // Resume autoplay after swipe
    setTimeout(() => setIsAutoPlaying(true), 3000);
  }, [goNext, goPrev]);

  return (
    <div 
      className="relative w-full h-[50vh] md:h-[70vh] lg:h-[85vh] overflow-hidden group"
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setIsAutoPlaying(false); }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setIsAutoPlaying(true); }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              src={getImageUrl(currentMovie.poster_url)} // Use poster_url for landscape
              alt={currentMovie.name}
              className="w-full h-full object-cover object-center"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/60 to-transparent" />
          </div>

          {/* Content */}
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="max-w-2xl space-y-4 md:space-y-6">
                <motion.h1 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-tight drop-shadow-lg"
                >
                  {currentMovie.name}
                </motion.h1>
                
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="flex flex-wrap items-center gap-3 text-sm md:text-base text-gray-300"
                >
                  <div className="flex items-center gap-3 bg-white/5 backdrop-blur-2xl px-4 py-2 rounded-full border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
                    <span className="text-yellow-400 font-bold">{currentMovie.year}</span>
                    {currentMovie.quality && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-white/30" />
                        <span className="font-semibold text-white tracking-wider">
                          {currentMovie.quality}
                        </span>
                      </>
                    )}
                    {currentMovie.lang && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-white/30" />
                        <span className="text-white/80 font-medium tracking-wide">
                          {currentMovie.lang}
                        </span>
                      </>
                    )}
                  </div>
                  <span className="hidden md:inline text-white/40">•</span>
                  <span className="hidden md:inline truncate max-w-xs bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/5 shadow-inner">
                    {currentMovie.origin_name}
                  </span>
                </motion.div>

                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="text-gray-300 text-sm md:text-lg line-clamp-3 max-w-xl drop-shadow-md"
                  dangerouslySetInnerHTML={{ __html: currentMovie.content || "Phim hay đang chờ bạn khám phá!" }}
                />

                {currentMovie.category && currentMovie.category.length > 0 && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.45, duration: 0.5 }}
                    className="flex flex-wrap items-center gap-2 pt-2"
                  >
                    {currentMovie.category.map((cat: any) => (
                      <Link
                        key={cat.id || cat.slug || cat.name}
                        to={cat.slug ? `/category/${cat.slug}` : '#'}
                        onClick={(e) => !cat.slug && e.preventDefault()}
                        className="px-4 py-1.5 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_10px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_20px_rgba(0,0,0,0.4)] rounded-full text-xs font-medium text-white transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </motion.div>
                )}

                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="flex items-center gap-4 pt-4"
                >
                  <Link 
                    to={`/movie/${currentMovie.slug}`}
                    className="relative overflow-hidden group flex items-center gap-2 bg-gradient-to-r from-yellow-400/90 to-yellow-500/90 backdrop-blur-2xl text-black px-6 md:px-8 py-3 md:py-4 rounded-full font-bold transition-all transform hover:scale-105 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_10px_30px_rgba(234,179,8,0.3)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_15px_40px_rgba(234,179,8,0.5)] border border-yellow-300/50"
                  >
                    <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-[30deg] -translate-x-full group-hover:translate-x-[250%] transition-transform duration-1000 ease-out" />
                    <Play className="w-5 h-5 fill-black z-10" />
                    <span className="z-10 relative">Xem Ngay</span>
                  </Link>
                  {/* <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full font-medium transition-all backdrop-blur-sm border border-white/10">
                    <Info className="w-5 h-5" />
                    Chi Tiết
                  </button> */}
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Thumbnails Navigation (Bottom Right) */}
      <div className="absolute bottom-8 right-4 md:right-8 lg:right-12 z-20 hidden md:block">
        <div className="flex items-center gap-4 bg-white/5 backdrop-blur-2xl p-3 border border-white/10 rounded-2xl md:rounded-[2rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_20px_40px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
          
          {sliderMovies.map((movie, index) => (
            <button
              key={movie.slug}
              onClick={() => setCurrentIndex(index)}
              className={`relative group transition-all duration-500 ease-out ${
                index === currentIndex 
                  ? 'w-40 h-24 ring-[2px] ring-white/50 scale-100 z-10 shadow-[0_0_20px_rgba(255,255,255,0.3)] border border-white/20' 
                  : 'w-24 h-16 opacity-50 hover:opacity-100 hover:scale-105 border border-white/5'
              } rounded-xl overflow-hidden`}
            >
              <img
                src={getImageUrl(movie.poster_url)}
                alt={movie.name}
                className="w-full h-full object-cover"
              />
              <div className={`absolute inset-0 bg-black/50 ${index === currentIndex ? 'bg-transparent' : ''} group-hover:bg-transparent transition-colors`} />
              
              {/* Progress bar glass effect */}
              {index === currentIndex && isAutoPlaying && (
                <div className="absolute bottom-0 left-0 h-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-[progress_5s_linear_infinite]" style={{ width: '100%' }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Dots */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 md:hidden z-20">
        {sliderMovies.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex ? 'bg-yellow-400 w-6' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
      
      {/* Navigation Arrows — visible on touch, hover-reveal on desktop */}
      <button 
        onClick={goPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-yellow-500 hover:text-black transition-all opacity-70 md:opacity-0 md:group-hover:opacity-100 backdrop-blur-sm border border-white/10"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button 
        onClick={goNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-yellow-500 hover:text-black transition-all opacity-70 md:opacity-0 md:group-hover:opacity-100 backdrop-blur-sm border border-white/10"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
};

export default HeroSlider;
