import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getMovieDetail, getMovieImageUrl } from '../services/api';
import { Play, Calendar, Clock, Globe, Heart, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import PageWrapper from '../components/PageWrapper';
import CommentSection from '../components/CommentSection';
import ShareModal from '../components/ShareModal';
import axios from 'axios';

const MovieDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isFollowed, setIsFollowed] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const { startLoading, stopLoading } = useLoading();

  useEffect(() => {
    const fetchMovie = async () => {
      startLoading();
      try {
        const res = await getMovieDetail(slug!);
        setMovie(res.movie);
      } catch (error) {
        console.error("Failed to fetch movie detail", error);
      } finally {
        setLoading(false);
        stopLoading();
      }
    };
    fetchMovie();
  }, [slug]);


  useEffect(() => {
    if (user && movie) {
      // Check if followed
      // Ideally we fetch this from API, but for now let's just assume false or implement check later
      // I'll implement a check endpoint or just fetch all follows and check client side for simplicity
      axios.get('/api/follows').then(res => {
        const followed = res.data.some((f: any) => f.movie_slug === movie.slug);
        setIsFollowed(followed);
      });
    }
  }, [user, movie]);

  const handleFollow = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    try {
      await axios.post('/api/follows', {
        movie_slug: movie.slug,
        movie_name: movie.name,
        poster_url: movie.thumb_url
      });
      setIsFollowed(!isFollowed);
    } catch (error) {
      console.error("Failed to follow", error);
    }
  };

  if (loading) return null;
  if (!movie) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Movie not found</div>;

  const posterUrl = getMovieImageUrl(movie.poster_url);
  const thumbUrl = getMovieImageUrl(movie.thumb_url);

  return (
    <PageWrapper>
      <div className="min-h-screen bg-slate-900 text-white pb-20">
        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowLoginModal(false)}>
            <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-white mb-2">Yêu cầu đăng nhập</h3>
              <p className="text-gray-400 mb-6">Bạn cần đăng nhập hoặc đăng ký tài khoản để sử dụng tính năng Theo Dõi phim.</p>
              <div className="flex flex-col gap-3">
                <Link to="/login" className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-center text-white rounded-xl font-bold transition-colors">
                  Đăng nhập ngay
                </Link>
                <Link to="/register" className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-center text-white rounded-xl font-bold transition-colors border border-white/10">
                  Đăng ký tài khoản
                </Link>
                <button 
                  onClick={() => setShowLoginModal(false)}
                  className="w-full py-2 text-gray-500 hover:text-white transition-colors text-sm mt-2"
                >
                  Để sau
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Banner / Backdrop */}
        <div className="relative h-[60vh] w-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent z-10" />
          <img
            src={posterUrl} // Use posterUrl (landscape) for backdrop
            alt={movie.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-20">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Poster */}
            <div className="flex-shrink-0 w-64 mx-auto md:mx-0 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/20 bg-white/5 backdrop-blur-3xl aspect-[2/3] p-2 relative group">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-10 rounded-[2rem]" />
              <img src={thumbUrl} alt={movie.name} className="w-full h-full object-cover rounded-[1.5rem] shadow-inner" />
            </div>

            {/* Info */}
            <div className="flex-grow pt-4 md:pt-12">
              <h1 className="text-4xl font-bold mb-2">{movie.name}</h1>
              <h2 className="text-xl text-gray-400 mb-6">{movie.origin_name} ({movie.year})</h2>

              <div className="flex flex-wrap gap-4 mb-8">
                <Link
                  to={`/watch/${movie.slug}`}
                  className="relative overflow-hidden group bg-gradient-to-r from-sky-500/90 to-blue-600/90 backdrop-blur-2xl text-white px-8 py-3 rounded-full font-bold flex items-center transition-all transform hover:scale-105 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_10px_30px_rgba(14,165,233,0.3)] border border-sky-400/30"
                >
                  <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-[30deg] -translate-x-full group-hover:translate-x-[250%] transition-transform duration-1000 ease-out" />
                  <Play className="w-5 h-5 mr-2 fill-current relative z-10" />
                  <span className="relative z-10">
                    {movie.status === 'trailer' || movie.episode_current === 'Trailer' ? 'Xem Trailer' : 'Xem Phim'}
                  </span>
                </Link>
                <button
                  onClick={handleFollow}
                  className={`px-8 py-3 rounded-full font-bold flex items-center transition-all duration-300 border shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] hover:-translate-y-0.5 ${isFollowed ? 'bg-pink-500/20 backdrop-blur-xl border-pink-500/50 text-pink-400 shadow-[0_10px_20px_rgba(236,72,153,0.2)]' : 'bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 text-white'}`}
                >
                  <Heart className={`w-5 h-5 mr-2 transition-all ${isFollowed ? 'fill-current scale-110' : ''}`} />
                  {isFollowed ? 'Đã Theo Dõi' : 'Theo Dõi'}
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="px-8 py-3 rounded-full font-bold flex items-center transition-all duration-300 border shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] hover:-translate-y-0.5 bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 text-white"
                >
                  <Share2 className="w-5 h-5 mr-2" />
                  Chia Sẻ
                </button>
              </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm text-gray-300 mb-8 bg-black/20 backdrop-blur-3xl p-6 rounded-[2rem] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_20px_40px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-full border border-white/10 shadow-inner">
                  <Calendar className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Năm Phát Hành</p>
                  <span className="font-semibold text-white">{movie.year}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-full border border-white/10 shadow-inner">
                  <Globe className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Quốc Gia</p>
                  <span className="font-semibold text-white">{movie.country?.[0]?.name || 'N/A'}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-full border border-white/10 shadow-inner">
                  <Clock className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Thời Lượng</p>
                  <span className="font-semibold text-white">{movie.time || 'N/A'}</span>
                </div>
              </div>
              <div className="flex items-center">
                <span className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-xl text-xs font-bold border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] text-white/90">
                  {movie.quality} {movie.lang}
                </span>
              </div>
            </div>

            {movie.category && movie.category.length > 0 && (
              <div className="mb-8 flex flex-wrap gap-2 items-center bg-white/5 backdrop-blur-xl p-3 px-6 border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-full w-max">
                <span className="text-white/60 text-xs uppercase tracking-widest font-bold mr-2">Thể loại</span>
                <span className="w-1 h-1 rounded-full bg-white/20 mr-2" />
                {movie.category.map((cat: any) => (
                  <Link
                    key={cat.id || cat.slug}
                    to={`/category/${cat.slug}`}
                    className="px-4 py-1.5 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 shadow-sm rounded-full text-xs font-medium text-white transition-all hover:-translate-y-0.5"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}

            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_20px_40px_rgba(0,0,0,0.3)] rounded-[2.5rem] p-6 md:p-10 mb-8 overflow-hidden relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-[1.5px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
              <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-3">
                <span className="w-1.5 h-6 bg-gradient-to-b from-sky-400 to-blue-600 rounded-full shadow-[0_0_10px_rgba(56,189,248,0.5)]"></span>
                Nội Dung Phim
              </h3>
              <div dangerouslySetInnerHTML={{ __html: movie.content }} className="text-gray-300 leading-relaxed text-sm md:text-base opacity-90 drop-shadow-sm" />
            </div>

            <CommentSection slug={movie.slug} />
            </div>
          </div>
        </div>
      </div>
      <ShareModal 
        isOpen={showShareModal} 
        onClose={() => setShowShareModal(false)}
        movieName={movie.name}
        movieSlug={movie.slug}
      />
    </PageWrapper>
  );
};

export default MovieDetail;

