import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import MovieCard from '../components/MovieCard';
import ContinueWatchingCard from '../components/ContinueWatchingCard';
import { Loader2, History, Heart, Settings, Film, Clock } from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();
  const [follows, setFollows] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'history' | 'follows'>('history');

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        try {
          const [followsRes, historyRes] = await Promise.all([
            axios.get('/api/follows'),
            axios.get('/api/history')
          ]);
          setFollows(followsRes.data);
          setHistory(historyRes.data);
        } catch (error) {
          console.error("Failed to fetch profile data", error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [user]);

  if (!user) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
      <div className="w-20 h-20 rounded-full glass flex items-center justify-center">
        <Film className="w-8 h-8 text-gray-600" />
      </div>
      <p className="text-gray-400">Vui lòng đăng nhập để xem trang cá nhân</p>
      <Link to="/login" className="px-6 py-2.5 bg-sky-500 text-white font-semibold rounded-xl press">
        Đăng Nhập
      </Link>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      <p className="text-gray-500 text-sm">Đang tải tủ phim...</p>
    </div>
  );

  const tabs = [
    { id: 'history' as const, label: 'Lịch Sử', icon: History, count: history.length, color: 'sky' },
    { id: 'follows' as const, label: 'Theo Dõi', icon: Heart, count: follows.length, color: 'rose' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 pb-20 pt-32 md:pt-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="glass-strong rounded-3xl p-6 md:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-sky-500/20 shrink-0 overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user.username[0].toUpperCase()
              )}
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-bold text-white">{user.username}</h1>
              <p className="text-gray-500 text-sm mt-1">Thành viên Phim Phiếc</p>
              <div className="flex items-center justify-center sm:justify-start gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock className="w-4 h-4 text-sky-400" />
                  <span className="text-gray-400"><strong className="text-white">{history.length}</strong> phim đã xem</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Heart className="w-4 h-4 text-rose-400" />
                  <span className="text-gray-400"><strong className="text-white">{follows.length}</strong> theo dõi</span>
                </div>
              </div>
            </div>
            <Link to="/account" className="shrink-0 p-2.5 rounded-xl glass text-gray-400 hover:text-white hover:bg-white/10 transition-all press">
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all press ${
                activeTab === tab.id 
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' 
                  : 'glass text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-md ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-white/5'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'history' && (
          <section>
            {history.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {history.map((item: any) => (
                  <ContinueWatchingCard 
                    key={item.id} 
                    item={item} 
                    onRemove={async () => {
                      try {
                        await axios.delete('/api/history/' + item.movie_slug, { withCredentials: true });
                        setHistory(prev => prev.filter((i: any) => i.movie_slug !== item.movie_slug));
                      } catch(err) {
                        console.error(err);
                      }
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full glass flex items-center justify-center mb-4">
                  <History className="w-7 h-7 text-gray-600" />
                </div>
                <p className="text-gray-400">Chưa có lịch sử xem</p>
                <p className="text-gray-600 text-sm mt-1">Phim bạn xem sẽ hiển thị ở đây</p>
              </div>
            )}
          </section>
        )}

        {activeTab === 'follows' && (
          <section>
            {follows.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {follows.map((item: any) => (
                  <MovieCard
                    key={item.id}
                    movie={{
                      _id: item.movie_slug,
                      name: item.movie_name,
                      slug: item.movie_slug,
                      origin_name: '',
                      poster_url: item.poster_url,
                      thumb_url: item.poster_url,
                      year: 0
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full glass flex items-center justify-center mb-4">
                  <Heart className="w-7 h-7 text-gray-600" />
                </div>
                <p className="text-gray-400">Chưa theo dõi phim nào</p>
                <p className="text-gray-600 text-sm mt-1">Bấm theo dõi để nhận thông báo tập mới</p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default Profile;
