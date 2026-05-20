import React, { useEffect, useState } from 'react';
import { getNewMovies, getMoviesByStatus, getMovieDetail } from '../services/api';
import MovieSection from '../components/MovieSection';
import MovieCard from '../components/MovieCard';
import HeroSlider from '../components/HeroSlider';
import ContinueWatchingSection from '../components/ContinueWatchingSection';
import { Loader2, ArrowUp, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import PageWrapper from '../components/PageWrapper';
import axios from 'axios';

const Home = () => {
  const [newMovies, setNewMovies] = useState([]);
  const [sliderMovies, setSliderMovies] = useState([]);
  const [seriesMovies, setSeriesMovies] = useState([]);
  const [singleMovies, setSingleMovies] = useState([]);
  const [cartoons, setCartoons] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [aiReasonings, setAiReasonings] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNoHistory, setAiNoHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { user } = useAuth();
  const { startLoading, stopLoading } = useLoading();

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      startLoading();
      try {

        const [newRes, seriesRes, singleRes, cartoonRes] = await Promise.all([
          getNewMovies(1),
          getMoviesByStatus('phim-bo', 1),
          getMoviesByStatus('phim-le', 1),
          getMoviesByStatus('hoat-hinh', 1),
        ]);

        const newItems = newRes.items || newRes.data?.items || [];
        setNewMovies(newItems);
        setSeriesMovies(seriesRes.items || seriesRes.data?.items || []);
        setSingleMovies(singleRes.items || singleRes.data?.items || []);
        setCartoons(cartoonRes.items || cartoonRes.data?.items || []);

        const topMovies = newItems.slice(0, 5);
        const detailedMovies = await Promise.all(
          topMovies.map(async (movie: any) => {
            try {
              const detailRes = await getMovieDetail(movie.slug);
              if (detailRes.status && detailRes.movie) {
                return { 
                  ...movie, 
                  content: detailRes.movie.content,
                  category: detailRes.movie.category
                };
              }
              return movie;
            } catch (e) {
              return movie;
            }
          })
        );
        setSliderMovies(detailedMovies);

        let historyData: any[] = [];
        if (user) {
          try {
            const historyRes = await axios.get('/api/history');
            historyData = historyRes.data || [];
            setContinueWatching(historyData);
          } catch (e) {
            console.error("Failed to fetch history", e);
          }
        } else {
          setContinueWatching([]);
        }

        // --- Real AI Recommendation Generation ---
        if (user && historyData && historyData.length > 0) {
          setAiLoading(true);
          setAiNoHistory(false);
          try {
            // Gather candidate movies from new + series, deduplicate by slug
            const allCandidates = [...newItems, ...(seriesRes.items || seriesRes.data?.items || [])];
            const seenSlugs = new Set<string>();
            const watchedSlugs = new Set(historyData.map((h: any) => h.movie_slug));
            const uniqueCandidates = allCandidates.filter((m: any) => {
              if (seenSlugs.has(m.slug) || watchedSlugs.has(m.slug)) return false;
              seenSlugs.add(m.slug);
              return true;
            }).slice(0, 24).map((m: any) => ({
              slug: m.slug,
              name: m.name,
              origin_name: m.origin_name || '',
              year: m.year || '',
            }));

            const aiRes = await axios.post('/api/ai/recommendations', {
              candidates: uniqueCandidates,
            });

            if (aiRes.data?.success && aiRes.data.recommendations?.length > 0) {
              const slugToMovie: Record<string, any> = {};
              allCandidates.forEach((m: any) => { if (!slugToMovie[m.slug]) slugToMovie[m.slug] = m; });

              const recs: any[] = [];
              const reasons: Record<string, string> = {};
              aiRes.data.recommendations.forEach((rec: any) => {
                const movie = slugToMovie[rec.slug];
                if (movie) {
                  recs.push(movie);
                  reasons[rec.slug] = rec.reason || 'AI Đề xuất';
                }
              });

              setAiRecommendations(recs);
              setAiReasonings(reasons);
            }
          } catch (err) {
            console.error("Failed to fetch AI recommendations", err);
          } finally {
            setAiLoading(false);
          }
        } else if (user) {
          setAiNoHistory(true);
        }

      } catch (error) {
        console.error("Failed to fetch movies", error);
      } finally {
        setLoading(false);
        stopLoading();
      }
    };

    fetchData();
  }, [user]);

  if (loading) return null;

  return (
    <PageWrapper>
      <div className="min-h-screen bg-slate-900 pb-20">
        <HeroSlider movies={sliderMovies.length > 0 ? sliderMovies : newMovies} />

        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 mt-8 md:mt-12 space-y-8">
          {continueWatching.length > 0 && (
            <ContinueWatchingSection items={continueWatching} />
          )}

          {/* AI Recommendations Section */}
          {user && (
            <section className="py-6 bg-gradient-to-b from-purple-950/10 via-slate-900/5 to-transparent border border-white/[0.03] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              {/* Ambient background glow */}
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-72 h-72 rounded-full bg-pink-500/5 blur-[80px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-72 h-72 rounded-full bg-violet-600/5 blur-[80px] pointer-events-none" />

              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-7 bg-gradient-to-b from-pink-500 to-violet-600 rounded-full shadow-[0_0_10px_rgba(236,72,153,0.4)]" />
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">Gợi ý phim thông minh từ</h2>
                    <span className="bg-gradient-to-r from-pink-500 to-violet-500 animate-pulse text-[9px] font-black text-white px-2.5 py-0.5 rounded-full border border-pink-400/40 shadow-[0_0_15px_rgba(236,72,153,0.5)] tracking-wider">
                      AI
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative z-10">
                {aiLoading ? (
                  <div className="flex md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 overflow-hidden pb-10 md:pb-12">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="min-w-[140px] sm:min-w-[160px] md:min-w-0 animate-pulse">
                        <div className="aspect-[2/3] bg-white/5 rounded-2xl border border-white/5" />
                        <div className="mt-2 h-3 bg-white/5 rounded w-3/4" />
                        <div className="mt-1 h-2.5 bg-white/5 rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : aiNoHistory ? (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-600/20 flex items-center justify-center mb-4 border border-pink-500/20">
                      <Sparkles className="w-7 h-7 text-pink-400" />
                    </div>
                    <p className="text-sm md:text-base text-gray-300 font-semibold max-w-md leading-relaxed">
                      Bạn chưa có lịch sử xem, bạn hãy xem ít nhất một bộ phim để có đề xuất
                    </p>
                    <p className="text-xs text-gray-500 mt-2">AI sẽ phân tích gu xem phim của bạn để gợi ý chính xác nhất</p>
                  </div>
                ) : aiRecommendations.length > 0 ? (
                  <div 
                    className="flex md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-10 md:pb-12 scrollbar-none"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {aiRecommendations.map((movie) => (
                      <div key={movie.slug} className="min-w-[140px] sm:min-w-[160px] md:min-w-0 snap-start relative group/ai pb-8">
                        <MovieCard movie={movie} />
                        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-20 w-[92%] bg-gradient-to-r from-pink-500/90 to-violet-600/90 backdrop-blur-md text-white text-[9px] font-black px-2 py-1 rounded-xl border border-pink-400/30 text-center shadow-[0_4px_12px_rgba(236,72,153,0.3)] opacity-95 group-hover/ai:opacity-100 group-hover/ai:scale-105 transition-all duration-300 pointer-events-none select-none flex items-center justify-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-pink-200 shrink-0 animate-pulse" />
                          <span className="truncate">{aiReasonings[movie.slug] || 'AI Đề xuất'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
          )}

          <MovieSection title="Phim Mới Cập Nhật" movies={newMovies} link="/category/phim-moi" />
          <MovieSection title="Phim Bộ Đang Hot" movies={seriesMovies} link="/category/phim-bo" />
          <MovieSection title="Phim Lẻ Đặc Sắc" movies={singleMovies} link="/category/phim-le" />
          <MovieSection title="Hoạt Hình" movies={cartoons} link="/category/hoat-hinh" />
        </div>

        {/* Scroll to Top */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`scroll-top-btn p-3 rounded-2xl glass text-white hover:bg-white/10 transition-all press ${showScrollTop ? 'visible' : ''}`}
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      </div>
    </PageWrapper>
  );
};

export default Home;

