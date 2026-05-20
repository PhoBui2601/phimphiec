import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getMoviesByStatus } from '../services/api';
import MovieCard from '../components/MovieCard';
import { ChevronLeft, ChevronRight, Film } from 'lucide-react';
import { useLoading } from '../context/LoadingContext';
import PageWrapper from '../components/PageWrapper';

const Category = () => {
  const { slug } = useParams<{ slug: string }>();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const { startLoading, stopLoading } = useLoading();

  useEffect(() => {
    setPage(1);
  }, [slug]);

  useEffect(() => {
    const fetchMovies = async () => {
      startLoading();
      try {
        const res = await getMoviesByStatus(slug || 'phim-moi', page);
        setMovies(res.items || res.data?.items || []);
      } catch (error) {
        console.error("Failed to fetch category", error);
      } finally {
        setLoading(false);
        stopLoading();
      }
    };
    fetchMovies();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug, page]);

  const getTitle = (slug: string) => {
    const titles: Record<string, string> = {
      'phim-le': 'Phim Lẻ',
      'phim-bo': 'Phim Bộ',
      'hoat-hinh': 'Hoạt Hình',
      'tv-shows': 'TV Shows',
      'phim-chieu-rap': 'Chiếu Rạp',
      'phim-moi': 'Phim Mới',
      'phim-moi-cap-nhat': 'Phim Mới Cập Nhật',
    };
    return titles[slug] || 'Danh Sách Phim';
  };

  if (loading && movies.length === 0) return null;

  return (
    <PageWrapper>
      <div className="min-h-screen bg-slate-900 pb-20 pt-32 md:pt-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-2xl glass">
              <Film className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {getTitle(slug || '')}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">Trang {page}</p>
            </div>
          </div>

          {movies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-full glass flex items-center justify-center mb-4">
                <Film className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-gray-400 text-lg">Không tìm thấy phim nào</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {movies.map((movie: any) => (
                  <MovieCard key={movie.slug} movie={movie} isUpcoming={slug === 'sap-chieu'} />
                ))}
              </div>
              
              {/* Pagination */}
              <div className="mt-12 flex justify-center items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-2.5 rounded-xl glass text-white disabled:opacity-20 hover:bg-white/10 transition-all press"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                {Array.from({ length: 5 }, (_, i) => {
                  const pageNum = Math.max(1, page - 2) + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all press ${
                        pageNum === page 
                          ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' 
                          : 'glass text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage(p => p + 1)}
                  className="p-2.5 rounded-xl glass text-white hover:bg-white/10 transition-all press"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </PageWrapper>
  );
};

export default Category;
