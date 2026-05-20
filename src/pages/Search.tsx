import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import { Search } from 'lucide-react';
import { searchMovies } from '../services/api';
import { useLoading } from '../context/LoadingContext';
import PageWrapper from '../components/PageWrapper';

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const { startLoading, stopLoading } = useLoading();

  useEffect(() => {
    const fetchMovies = async () => {
      if (!query) {
        setLoading(false);
        return;
      }
      startLoading();
      try {
        const res = await searchMovies(query);
        setMovies(res.data.items || []);
      } catch (error) {
        console.error("Failed to search", error);
        setMovies([]);
      } finally {
        setLoading(false);
        stopLoading();
      }
    };
    fetchMovies();
  }, [query]);

  if (loading && query) return null;

  return (
    <PageWrapper>
      <div className="min-h-screen bg-slate-900 pb-20 pt-32 md:pt-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white mb-2 border-l-4 border-sky-500 pl-4">
            Kết quả tìm kiếm
          </h1>
          {query && <p className="text-gray-400 mb-8 pl-5">Tìm kiếm: "{query}" — {movies.length} kết quả</p>}

          {!query ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                <Search className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-gray-400 text-lg">Nhập từ khóa để tìm kiếm phim</p>
            </div>
          ) : movies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {movies.map((movie: any) => (
                <MovieCard key={movie._id} movie={movie} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                <Search className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-gray-400 text-lg mb-2">Không tìm thấy phim nào</p>
              <p className="text-gray-600 text-sm">Thử tìm kiếm với từ khóa khác</p>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
};

export default SearchPage;
