import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMovieDetail, getMovieImageUrl } from '../services/api';
import { Loader2, PlayCircle } from 'lucide-react';

const stripHtml = (html: string) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const Embed = () => {
  const { slug } = useParams<{ slug: string }>();
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [posterUrl, setPosterUrl] = useState<string>('');

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        const res = await getMovieDetail(slug!);
        if (res.movie) {
          setMovie(res.movie);
          let pUrl = res.movie.poster_url || res.movie.thumb_url;
          setPosterUrl(getMovieImageUrl(pUrl));
        }
      } catch (error) {
        console.error("Failed to fetch movie", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovie();
  }, [slug]);

  if (loading) return <div className="w-full h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="animate-spin text-sky-500 w-8 h-8" /></div>;
  if (!movie) return <div className="w-full h-screen bg-slate-900 flex items-center justify-center text-white font-sans">Không tìm thấy phim.</div>;

  return (
    <div className="w-full h-screen bg-slate-900 text-white font-sans flex flex-col p-4 md:p-6 overflow-hidden relative">
      {/* Background Ambient */}
      <div className="absolute inset-0 z-0 opacity-20 blur-[100px] pointer-events-none select-none">
         <img src={posterUrl} alt="bg" className="w-full h-full object-cover" />
      </div>

      <div className="flex flex-col h-full max-w-4xl mx-auto w-full relative z-10 gap-4">
        {/* Top: Name & Episode */}
        <div className="w-full text-center p-4 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] shrink-0">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white uppercase tracking-wider !leading-tight drop-shadow-md mb-2">
            {movie.name}
          </h1>
          <div className="inline-block px-4 py-1 bg-sky-500/20 text-sky-400 rounded-full border border-sky-500/30 text-sm font-bold uppercase tracking-widest shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
            {movie.episode_current || 'Tập mới nhất'}
          </div>
        </div>

        {/* Middle: Description */}
        <div className="w-full flex-grow p-5 md:p-8 bg-black/20 backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-inner overflow-y-auto custom-scrollbar">
          <p className="text-gray-300 text-sm md:text-base leading-relaxed">
            {stripHtml(movie.content)}
          </p>
        </div>

        {/* Bottom: Banner */}
        <div className="w-full relative h-[250px] md:h-[350px] rounded-[2rem] overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.5)] border border-white/10 shrink-0 group">
          <img 
            src={posterUrl} 
            alt={movie.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent pointer-events-none" />
          
          <a 
            href={`/movie/${slug}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="absolute bottom-6 right-6 md:bottom-8 md:right-8 bg-sky-500 hover:bg-sky-400 text-white px-6 md:px-8 py-3 rounded-full font-bold shadow-lg transition-all hover:scale-105 flex items-center gap-2 border border-white/10 hover:border-white/20"
          >
             <PlayCircle className="w-5 h-5 md:w-6 md:h-6"/>
             Xem Phim
          </a>
        </div>
      </div>
    </div>
  );
};

export default Embed;
