import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMovieDetail, getMovieImageUrl } from '../services/api';
import VideoPlayer from '../components/VideoPlayer';
import { ArrowLeft, Share2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import CommentSection from '../components/CommentSection';
import ShareModal from '../components/ShareModal';
import { useLoading } from '../context/LoadingContext';
import PageWrapper from '../components/PageWrapper';

const getYouTubeId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const Watch = () => {
  const { slug } = useParams<{ slug: string }>();
  const [movie, setMovie] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<any>(null);
  const [currentServer, setCurrentServer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState(0);
  const currentTimeRef = React.useRef(0);
  const durationRef = React.useRef(0);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showShareModal, setShowShareModal] = useState(false);
  const { startLoading, stopLoading } = useLoading();

  useEffect(() => {
    const fetchMovieAndHistory = async () => {
      startLoading();
      try {
        let movieSlug = slug!;
        let urlEpisodeSlug = '';
        if (slug!.includes('-tap-')) {
          const parts = slug!.split('-tap-');
          movieSlug = parts[0];
          urlEpisodeSlug = parts[1];
        }

        const res = await getMovieDetail(movieSlug);
        setMovie(res.movie);
        setEpisodes(res.episodes || []);
        
        let history = null;
        if (user) {
          try {
            const historyRes = await axios.get(`/api/history/${movieSlug}`);
            history = historyRes.data;
          } catch (e) {
            // No history found, ignore
          }
        }

        if (res.episodes && res.episodes.length > 0) {
          let targetEp: any = null;
          let targetServer: any = null;

          // 1. Try matching episode from URL deep link
          if (urlEpisodeSlug) {
            const cleanTarget = urlEpisodeSlug.toLowerCase();
            for (const server of res.episodes) {
              const ep = server.server_data.find((e: any) => {
                const nameLower = e.name.toLowerCase();
                const slugLower = (e.slug || '').toLowerCase();
                return slugLower === cleanTarget || 
                       slugLower === `tap-${cleanTarget}` ||
                       nameLower === cleanTarget || 
                       nameLower === `tap-${cleanTarget}` ||
                       slugLower.replace(/^tap-/, '') === cleanTarget;
              });
              if (ep) {
                targetEp = ep;
                targetServer = server;
                break;
              }
            }
          }

          // 2. If no URL match, try matching from history
          if (!targetEp && history) {
            for (const server of res.episodes) {
              const ep = server.server_data.find((e: any) => e.slug === history.episode_slug);
              if (ep) {
                targetEp = ep;
                targetServer = server;
                setStartTime(history.timestamp || 0);
                break;
              }
            }
          }

          // 3. Fallback to first episode of first server
          if (!targetEp) {
            const firstServer = res.episodes[0];
            targetServer = firstServer;
            if (firstServer.server_data && firstServer.server_data.length > 0) {
              targetEp = firstServer.server_data[0];
              setStartTime(0);
            }
          }

          if (targetEp && targetServer) {
            setCurrentServer(targetServer);
            setCurrentEpisode(targetEp);
          }
        }
      } catch (error) {
        console.error("Failed to fetch movie", error);
      } finally {
        setLoading(false);
        stopLoading();
      }
    };
    fetchMovieAndHistory();
  }, [slug, user]);

  // Sync URL with current episode
  useEffect(() => {
    if (movie && currentEpisode) {
      const suffix = currentEpisode.slug ? currentEpisode.slug.replace(/^tap-/, '') : currentEpisode.name.toLowerCase();
      const targetUrl = `/watch/${movie.slug}-tap-${suffix}`;
      if (window.location.pathname !== targetUrl) {
        navigate(targetUrl, { replace: true });
      }
    }
  }, [movie, currentEpisode, navigate]);

  // Save history periodically
  useEffect(() => {
    if (!user || !movie || !currentEpisode) return;

    const saveHistory = async () => {
      // Only save if watched more than 5 seconds OR if it's the initial save (timestamp 0) to mark as started
      if (currentTimeRef.current > 5 || currentTimeRef.current === 0) { 
        try {
          await axios.post('/api/history', {
            movie_slug: movie.slug,
            movie_name: movie.name,
            poster_url: movie.thumb_url,
            episode_slug: currentEpisode.slug,
            episode_name: currentEpisode.name,
            timestamp: Math.floor(currentTimeRef.current),
            duration: Math.floor(durationRef.current)
          });
        } catch (err) {
          console.error("Failed to save history", err);
        }
      }
    };

    // Save immediately when episode changes (to record the new episode)
    saveHistory();

    // Save every 30 seconds
    const interval = setInterval(saveHistory, 30000);

    return () => clearInterval(interval);
  }, [user, movie, currentEpisode]);

  // Save on unmount / navigation
  useEffect(() => {
    const handleUnload = () => {
      if (user && movie && currentEpisode && currentTimeRef.current > 5) {
        const data = JSON.stringify({
            movie_slug: movie.slug,
            movie_name: movie.name,
            poster_url: movie.thumb_url,
            episode_slug: currentEpisode.slug,
            episode_name: currentEpisode.name,
            timestamp: Math.floor(currentTimeRef.current),
            duration: Math.floor(durationRef.current)
        });
        
        // Use fetch with keepalive for reliable delivery on page unload
        fetch('/api/history', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: data,
          keepalive: true
        }).catch(err => console.error("Failed to save history on unload", err));
      }
    };

    // Handle browser close/refresh
    window.addEventListener('beforeunload', handleUnload);

    // Handle component unmount (SPA navigation)
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload();
    };
  }, [user, movie, currentEpisode]);

  const handleTimeUpdate = (time: number) => {
    currentTimeRef.current = time;
  };

  const handleDurationChange = (duration: number) => {
    durationRef.current = duration;
  };

  const getEpisodeIndex = (ep: any, server: any) => {
    if (!server || !server.server_data) return -1;
    return server.server_data.findIndex((e: any) => e.slug === ep.slug);
  };

  const handleNextEpisode = () => {
    if (!currentServer || !currentEpisode) return;
    const idx = getEpisodeIndex(currentEpisode, currentServer);
    if (idx !== -1 && idx < currentServer.server_data.length - 1) {
      setStartTime(0);
      currentTimeRef.current = 0; // Reset current time ref
      setCurrentEpisode(currentServer.server_data[idx + 1]);
    }
  };

  const handlePrevEpisode = () => {
    if (!currentServer || !currentEpisode) return;
    const idx = getEpisodeIndex(currentEpisode, currentServer);
    if (idx > 0) {
      setStartTime(0);
      currentTimeRef.current = 0; // Reset current time ref
      setCurrentEpisode(currentServer.server_data[idx - 1]);
    }
  };

  const hasNext = currentServer && currentEpisode && getEpisodeIndex(currentEpisode, currentServer) < currentServer.server_data.length - 1;
  const hasPrev = currentServer && currentEpisode && getEpisodeIndex(currentEpisode, currentServer) > 0;

  const isTrailer = movie && (movie.status === 'trailer' || movie.episode_current === 'Trailer');
  const youtubeId = movie?.trailer_url ? getYouTubeId(movie.trailer_url) : null;
  const hasValidEpisode = currentEpisode && currentEpisode.link_m3u8 && currentEpisode.link_m3u8.trim() !== '';

  if (loading) return null;
  if (!movie) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-bold text-lg">Phim không tồn tại.</div>;
  if (!hasValidEpisode && !isTrailer) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-bold text-lg">Chưa cập nhật tập mới.</div>;
  if (!hasValidEpisode && isTrailer && !youtubeId) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-bold text-lg">Chưa có trailer.</div>;

  const posterUrl = getMovieImageUrl(movie.poster_url);

  return (
    <PageWrapper>
      <div className="min-h-screen bg-slate-900 text-white pt-32 md:pt-40 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button onClick={() => navigate(-1)} className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Quay lại
          </button>

          {/* Player */}
          <div className="mb-6 rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10 relative z-10 bg-black">
            {!hasValidEpisode && isTrailer && youtubeId ? (
              <div className="w-full aspect-video relative rounded-2xl overflow-hidden">
                 <iframe 
                   src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`} 
                   className="w-full h-full border-0 absolute inset-0" 
                   allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                   allowFullScreen 
                 />
              </div>
            ) : (
              <VideoPlayer 
                src={currentEpisode.link_m3u8} 
                poster={posterUrl} 
                servers={episodes}
                currentServerName={currentServer?.server_name}
                currentEpisodeName={currentEpisode.name}
                startTime={startTime}
                onTimeUpdate={handleTimeUpdate}
                onDurationChange={handleDurationChange}
                onNextEpisode={handleNextEpisode}
                onPrevEpisode={handlePrevEpisode}
                hasNext={hasNext}
                hasPrev={hasPrev}
                onServerChange={(serverName) => {
                  const server = episodes.find(s => s.server_name === serverName);
                  if (server) {
                    setCurrentServer(server);
                    const sameEpisode = server.server_data.find((e: any) => e.name === currentEpisode.name);
                    if (sameEpisode) {
                      setStartTime(currentTimeRef.current);
                      setCurrentEpisode(sameEpisode);
                    } else if (server.server_data.length > 0) {
                      setStartTime(0);
                      currentTimeRef.current = 0;
                      setCurrentEpisode(server.server_data[0]);
                    }
                  }
                }}
              />
            )}
          </div>

          {/* Title & Info Banner */}
          <div className="mb-8 p-6 md:p-8 rounded-[2rem] bg-white/5 backdrop-blur-3xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_20px_40px_rgba(0,0,0,0.3)] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-400 drop-shadow-sm">{movie.name}</h1>
              <div className="flex items-center gap-3 mt-3">
                <span className="px-3 py-1 bg-sky-500/20 text-sky-400 rounded-full border border-sky-500/30 text-[10px] font-bold uppercase tracking-widest shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                   {isTrailer && !hasValidEpisode ? 'Trailer' : 'Đang Chiếu'}
                </span>
                {hasValidEpisode && currentEpisode && (
                  <p className="text-lg text-white font-medium">Tập {currentEpisode.name}</p>
                )}
              </div>
            </div>
            <button 
              onClick={() => setShowShareModal(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-colors font-semibold"
            >
              <Share2 className="w-5 h-5" />
              Chia Sẻ
            </button>
          </div>

          {/* Episode List */}
          <div className="bg-black/20 backdrop-blur-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_20px_40px_rgba(0,0,0,0.5)] rounded-[2.5rem] p-6 md:p-10 border border-white/10 mt-8 mb-8 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-[1.5px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-white">
              <span className="w-1.5 h-6 bg-gradient-to-b from-sky-400 to-blue-600 rounded-full shadow-[0_0_10px_rgba(56,189,248,0.5)]"></span>
              Máy Chủ / Servers
            </h3>
            
            {episodes.map((server, idx) => (
              <div key={idx} className="mb-8 last:mb-0">
                <h4 className="text-xs font-bold text-white/50 mb-4 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                  {server.server_name}
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent ml-2" />
                </h4>
                <div className="flex flex-wrap gap-3">
                  {server.server_data.map((ep: any) => (
                    <button
                      key={ep.slug}
                      onClick={() => {
                        setStartTime(0);
                        currentTimeRef.current = 0;
                        setCurrentEpisode(ep);
                        setCurrentServer(server);
                      }}
                      className={`min-w-[4rem] px-4 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 transform ${
                        currentEpisode.slug === ep.slug
                          ? 'bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-[0_10px_20px_rgba(14,165,233,0.3)] border border-sky-300/50 scale-105'
                          : 'bg-white/5 backdrop-blur-md text-gray-300 hover:bg-white/10 hover:text-white border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:-translate-y-1'
                      }`}
                    >
                      {ep.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Comments */}
          <CommentSection slug={movie.slug} />
        </div>
        <ShareModal 
          isOpen={showShareModal} 
          onClose={() => setShowShareModal(false)}
          movieName={movie.name}
          movieSlug={movie.slug}
        />
      </div>
    </PageWrapper>
  );
};

export default Watch;
