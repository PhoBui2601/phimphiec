import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, LogOut, Menu, X, ChevronDown, Smartphone, PlayCircle, Loader2, Settings, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { searchMovies, getMovieImageUrl } from '../services/api';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';

const HighlightText = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight.trim()) return <>{text}</>;
  const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} className="text-yellow-400 font-extrabold bg-yellow-400/10 px-[1px] rounded">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

const Header = () => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isSplash, setIsSplash] = useState(() => {
    if (typeof window !== 'undefined') {
      const hasSeen = sessionStorage.getItem('hasSeenSplash');
      return !hasSeen;
    }
    return true;
  });
  
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  const prevNotifsRef = useRef<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchNotifs = async () => {
      try {
        const res = await axios.get('/api/notifications', { withCredentials: true });
        const unread = res.data.filter((n: any) => !n.is_read).length;
        
        // Push notification cho item mới
        if (prevNotifsRef.current.length > 0) {
          const newNotifs = res.data.filter((n: any) => 
            !n.is_read && !prevNotifsRef.current.find((old: any) => old.id === n.id)
          );
          if (newNotifs.length > 0 && Notification.permission === "granted") {
            newNotifs.forEach((n: any) => {
               new Notification('PhimPhiếc - Tập Mới!', {
                 body: n.message,
                 icon: '/favicon.ico'
               });
            });
          }
        }
        
        prevNotifsRef.current = res.data;
        setNotifications(res.data);
        setUnreadCount(unread);
      } catch (err) {}
    };
    
    fetchNotifs();
    const intv = setInterval(fetchNotifs, 30000);
    return () => clearInterval(intv);
  }, [user]);

  const handleReadNotifs = async () => {
    setShowNotifs(!showNotifs);
    if (!showNotifs && unreadCount > 0) {
      setUnreadCount(0);
      try {
        await axios.post('/api/notifications/read', {}, { withCredentials: true });
        setNotifications(prev => prev.map(n => ({...n, is_read: 1})));
      } catch (err) {}
    }
  };
  const navigate = useNavigate();

  useEffect(() => {
    if (isSplash) {
      sessionStorage.setItem('hasSeenSplash', 'true');
      
      const playMetallicSound = () => {
        const audio = new Audio('https://files.catbox.moe/x1giza.mp3');
        audio.play().catch(e => console.warn("Audio blocked", e));
      };

      playMetallicSound();

      const timer = setTimeout(() => {
        setIsSplash(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isSplash]);

  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      const isOutsideDesktop = searchRef.current ? !searchRef.current.contains(target) : true;
      const isOutsideMobile = mobileSearchRef.current ? !mobileSearchRef.current.contains(target) : true;
      const isOutsideNotif = notifRef.current ? !notifRef.current.contains(target) : true;
      const isDropdownClick = (target as HTMLElement).closest('.nav-dropdown-trigger');

      if (isOutsideDesktop && isOutsideMobile) {
        setShowSuggestions(false);
      }
      if (isOutsideNotif) {
        setShowNotifs(false);
      }
      if (!isDropdownClick) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setSelectedIndex(-1);
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length >= 1) {
        setIsSearching(true);
        try {
          const res = await searchMovies(searchQuery);
          if (res.data && res.data.items) {
            setSuggestions(res.data.items.slice(0, 5)); // Limit to 5 suggestions
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
          }
        } catch (error) {
          console.error("Failed to fetch suggestions", error);
          setSuggestions([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsMenuOpen(false);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (slug: string) => {
    navigate(`/movie/${slug}`);
    setShowSuggestions(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || searchQuery.trim().length < 1) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > -1 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        handleSuggestionClick(suggestions[selectedIndex].slug);
      }
    }
  };

  return (
    <>
      <AnimatePresence>
        {isSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
            className="fixed inset-0 z-[100] bg-[#0f172a]/95 backdrop-blur-3xl flex items-center justify-center pointer-events-auto"
          />
        )}
      </AnimatePresence>

      <header className={clsx("fixed left-3 right-3 md:left-6 md:right-6 lg:left-8 lg:right-8 z-[101] transition-all duration-500 max-w-[1920px] mx-auto", isSplash ? "top-1/2 -translate-y-1/2" : "top-2 md:top-4 lg:top-5")}>
        <div className={clsx("w-full px-5 md:px-8 xl:px-12 rounded-full transition-all duration-1000", isSplash ? "bg-transparent border-transparent" : "bg-[#0f172a]/80 backdrop-blur-2xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.5)]")}>
          <div className="flex items-center justify-between h-[4rem] md:h-20 gap-4">

          {/* Left Section: Logo & Search */}
          <div className="flex items-center gap-8 flex-1 lg:flex-none">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0 flex items-center gap-3 group relative z-[102] outline-none">
              <motion.div
                layout
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                className={
                  isSplash 
                    ? "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-[80%] w-52 h-52 md:w-72 md:h-72 pointer-events-none" 
                    : "relative w-12 h-12 md:w-14 md:h-14 transition-transform duration-300 group-hover:scale-110"
                }
              >
                <img
                  src="https://files.catbox.moe/9zgroo.png"
                  alt="PhimPhiếc Logo"
                  className={clsx("w-full h-full object-contain transition-all duration-1000", isSplash ? "drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]" : "drop-shadow-md")}
                />
                
                {/* Shine Mask Overlay */}
                <AnimatePresence>
                  {isSplash && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.3 } }}
                      className="absolute inset-0 z-10"
                      style={{
                        WebkitMaskImage: `url(https://files.catbox.moe/9zgroo.png)`,
                        WebkitMaskSize: 'contain',
                        WebkitMaskPosition: 'center',
                        WebkitMaskRepeat: 'no-repeat',
                      }}
                    >
                      <motion.div
                        className="absolute top-0 bottom-0 left-0 w-[150%] h-[150%] bg-gradient-to-r from-transparent via-white/80 to-transparent origin-top"
                        initial={{ x: '-150%', skewX: -30 }}
                        animate={{ x: '150%' }}
                        transition={{ 
                          duration: 1.2, 
                          delay: 0.5,
                          repeat: Infinity, 
                          repeatDelay: 1.2,
                          ease: "linear" 
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              
              <motion.div 
                layout
                transition={{ duration: 1 }}
                className={clsx("flex flex-col transition-all duration-1000", isSplash ? "opacity-0 invisible fixed" : "opacity-100 visible relative delay-500")}
              >
                <h1 className="text-xl md:text-2xl font-bold text-white leading-none tracking-tight">
                  PhimPhiếc
                </h1>
                <span className="text-[9px] md:text-[10px] text-gray-400 font-medium tracking-wider uppercase">phim hay đến "chiếc"</span>
              </motion.div>
            </Link>

            {/* Search Bar - Desktop */}
            <div className={clsx("hidden lg:block relative w-80 transition-all duration-1000", isSplash ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0 delay-300")} ref={searchRef}>
              <form onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder="Tìm kiếm phim, diễn viên..."
                  className="w-full bg-white/10 text-white rounded-full py-2.5 px-5 pl-12 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:bg-white/15 transition-all placeholder:text-gray-400 shadow-inner border border-transparent focus:border-white/10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    if (searchQuery.trim().length >= 1) setShowSuggestions(true);
                  }}
                />
                <button type="submit" className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Search className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
                </button>
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                )}
              </form>

              {/* Search Suggestions Dropdown */}
              {showSuggestions && searchQuery.trim().length >= 1 && (
                <div className="absolute top-[calc(100%+12px)] left-0 w-full p-2 bg-[#1a1a1a]/95 backdrop-blur-2xl rounded-3xl shadow-[0_16px_40px_rgba(0,0,0,0.5)] border border-white/10 z-50 origin-top animate-none transition-all duration-300">
                  <div className="flex flex-col space-y-1">
                    {isSearching ? (
                      <div className="py-6 text-center text-gray-400 flex flex-col items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-sky-500 mb-2" />
                        <span className="text-sm font-medium">Đang tìm kiếm...</span>
                      </div>
                    ) : suggestions.length > 0 ? (
                      <>
                        {suggestions.map((movie, index) => (
                          <div
                            key={movie._id}
                            onClick={() => handleSuggestionClick(movie.slug)}
                            className={clsx(
                              "flex items-center gap-4 px-3 py-2 cursor-pointer transition-all rounded-2xl group",
                              selectedIndex === index ? "bg-white/10 scale-[1.02] shadow-lg border border-white/10" : "hover:bg-white/10 border border-transparent"
                            )}
                          >
                            <div className="w-12 h-16 rounded-xl overflow-hidden shadow-md flex-shrink-0">
                              <img
                                src={getMovieImageUrl(movie.thumb_url)}
                                alt={movie.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-white truncate group-hover:text-yellow-400 transition-colors">
                                <HighlightText text={movie.name} highlight={searchQuery} />
                              </h4>
                              <p className="text-xs text-gray-400 truncate mt-0.5">{movie.origin_name}</p>
                              <p className="text-[11px] font-semibold text-sky-400 mt-1">{movie.year}</p>
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={handleSearch}
                          className="w-full text-center py-3 mt-1 bg-white/5 hover:bg-white/10 rounded-2xl text-sm text-sky-400 hover:text-sky-300 font-bold transition-all"
                        >
                          Xem tất cả kết quả
                        </button>
                      </>
                    ) : (
                      <div className="py-8 px-4 text-center bg-white/5 rounded-2xl">
                        <Search className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                        <p className="text-sm text-gray-400">Không tìm thấy kết quả nào cho</p>
                        <p className="text-base font-bold text-white mt-1 truncate">"{searchQuery}"</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center Section: Navigation */}
          <nav className={clsx("hidden lg:flex items-center space-x-1 text-sm font-semibold transition-all duration-1000", isSplash ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0 delay-500")}>
            <Link to="/category/phim-le" className="px-3 xl:px-4 py-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-all">Phim Lẻ</Link>
            <Link to="/category/phim-bo" className="px-3 xl:px-4 py-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-all">Phim Bộ</Link>

            {/* Dropdown: Thể Loại */}
            <div 
              className="relative cursor-pointer py-6 nav-dropdown-trigger"
              onMouseEnter={() => setActiveDropdown('genre')}
              onMouseLeave={() => setActiveDropdown(null)}
              onClick={() => setActiveDropdown(activeDropdown === 'genre' ? null : 'genre')}
            >
              <span className={clsx("flex items-center px-3 xl:px-4 py-2 rounded-full transition-all", activeDropdown === 'genre' ? "text-white bg-white/10" : "text-gray-300 hover:text-white hover:bg-white/10")}>
                Thể Loại <ChevronDown className={clsx("w-4 h-4 ml-1.5 opacity-70 transition-transform duration-300", activeDropdown === 'genre' ? "rotate-180" : "")} />
              </span>
              <div className={clsx("absolute top-full left-1/2 -translate-x-1/2 w-[600px] mt-2 bg-[#1a1a1a]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 transition-all duration-300 transform z-50", activeDropdown === 'genre' ? "opacity-100 visible translate-y-0" : "opacity-0 invisible translate-y-4")}>
                <div className="py-4 px-2 grid grid-cols-4 gap-1">
                  {[
                    { name: 'Hành Động', slug: 'hanh-dong' },
                    { name: 'Tình Cảm', slug: 'tinh-cam' },
                    { name: 'Hài Hước', slug: 'hai-huoc' },
                    { name: 'Cổ Trang', slug: 'co-trang' },
                    { name: 'Tâm Lý', slug: 'tam-ly' },
                    { name: 'Hình Sự', slug: 'hinh-su' },
                    { name: 'Chiến Tranh', slug: 'chien-tranh' },
                    { name: 'Thể Thao', slug: 'the-thao' },
                    { name: 'Võ Thuật', slug: 'vo-thuat' },
                    { name: 'Viễn Tưởng', slug: 'vien-tuong' },
                    { name: 'Phiêu Lưu', slug: 'phieu-luu' },
                    { name: 'Khoa Học', slug: 'khoa-hoc' },
                    { name: 'Kinh Dị', slug: 'kinh-di' },
                    { name: 'Âm Nhạc', slug: 'am-nhac' },
                    { name: 'Thần Thoại', slug: 'than-thoai' },
                    { name: 'Tài Liệu', slug: 'tai-lieu' },
                    { name: 'Gia Đình', slug: 'gia-dinh' },
                    { name: 'Chính Kịch', slug: 'chinh-kich' },
                    { name: 'Bí Ẩn', slug: 'bi-an' },
                    { name: 'Học Đường', slug: 'hoc-duong' },
                    { name: 'Kinh Điển', slug: 'kinh-dien' },
                    { name: 'Hoạt Hình', slug: 'hoat-hinh' }
                  ].map((genre) => (
                    <Link key={genre.slug} to={`/genre/${genre.slug}`} className="block px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-md transition-colors">
                      {genre.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Dropdown: Quốc Gia */}
            <div 
              className="relative cursor-pointer py-6 nav-dropdown-trigger"
              onMouseEnter={() => setActiveDropdown('country')}
              onMouseLeave={() => setActiveDropdown(null)}
              onClick={() => setActiveDropdown(activeDropdown === 'country' ? null : 'country')}
            >
              <span className={clsx("flex items-center px-3 xl:px-4 py-2 rounded-full transition-all", activeDropdown === 'country' ? "text-white bg-white/10" : "text-gray-300 hover:text-white hover:bg-white/10")}>
                Quốc gia <ChevronDown className={clsx("w-4 h-4 ml-1.5 opacity-70 transition-transform duration-300", activeDropdown === 'country' ? "rotate-180" : "")} />
              </span>
              <div className={clsx("absolute top-full left-1/2 -translate-x-1/2 w-48 mt-2 bg-[#1a1a1a]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 transition-all duration-300 transform z-50", activeDropdown === 'country' ? "opacity-100 visible translate-y-0" : "opacity-0 invisible translate-y-4")}>
                <div className="py-2">
                  {[
                    { name: 'Trung Quốc', slug: 'trung-quoc' },
                    { name: 'Hàn Quốc', slug: 'han-quoc' },
                    { name: 'Nhật Bản', slug: 'nhat-ban' },
                    { name: 'Thái Lan', slug: 'thai-lan' },
                    { name: 'Âu Mỹ', slug: 'au-my' },
                    { name: 'Việt Nam', slug: 'viet-nam' }
                  ].map((country) => (
                    <Link key={country.slug} to={`/country/${country.slug}`} className="block px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5">
                      {country.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <Link to="/category/tv-shows" className="px-3 xl:px-4 py-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-all">TV Shows</Link>
            <Link to="/category/phim-chieu-rap" className="px-3 xl:px-4 py-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap">Chiếu Rạp</Link>
          </nav>

          {/* Right Group wrapper for justify-between alignment */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Right Section: Actions */}
            <div className={clsx("hidden md:flex items-center gap-6 transition-all duration-1000", isSplash ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0 delay-700")}>
            {/* User Button */}
            {user ? (
              <div className="flex items-center gap-4">
                {/* Notification Bell */}
                <div className="relative" ref={notifRef} tabIndex={0}>
                  <button 
                    onClick={handleReadNotifs}
                    className="relative p-2 rounded-full cursor-pointer bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all border border-transparent hover:border-white/10"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-slate-900 animate-pulse" />
                    )}
                  </button>
                  
                  {/* Notification Dropdown */}
                  <div className={clsx(
                    "absolute right-0 mt-3 w-80 bg-[#1a1a1a]/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] border border-white/10 z-[110] transform transition-all duration-300 origin-top-right overflow-hidden",
                    showNotifs ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                  )}>
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                      <h3 className="font-bold text-white text-base">Thông báo</h3>
                      <span className="text-xs font-semibold bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full">{notifications.length > 0 ? `${unreadCount} Mới` : '0'}</span>
                    </div>
                    <div className="max-h-[350px] overflow-y-auto overscroll-contain flex flex-col pointer-events-auto">
                      {notifications.length > 0 ? (
                        notifications.map((n) => (
                          <Link 
                            key={n.id} 
                            to={`/watch/${n.movie_slug}`}
                            onClick={() => setShowNotifs(false)}
                            className={clsx(
                              "p-4 border-b border-white/5 flex gap-3 hover:bg-white/5 transition-colors cursor-pointer",
                              !n.is_read ? "bg-sky-500/5" : ""
                            )}
                          >
                            <div className="shrink-0 mt-1">
                              <div className="w-2 h-2 rounded-full bg-sky-400 mt-1 opacity-80" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-200 line-clamp-2 leading-snug">{n.message}</p>
                              <p className="text-xs text-gray-500 mt-2 font-medium">{new Date(n.created_at).toLocaleDateString('vi-VN', {hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'})}</p>
                            </div>
                          </Link>
                        ))
                      ) : (
                        <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                          <Bell className="w-8 h-8 opacity-20 mb-3" />
                          <p className="text-sm">Không có thông báo mới.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              <div 
                className="relative nav-dropdown-trigger"
                onMouseEnter={() => setActiveDropdown('user')}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button 
                  onClick={() => setActiveDropdown(activeDropdown === 'user' ? null : 'user')}
                  className={clsx("flex items-center gap-3 bg-white/5 hover:bg-white/10 text-white pl-2 pr-5 py-1.5 rounded-full transition-all border shadow-sm focus:ring-2 focus:ring-white/20", activeDropdown === 'user' ? "border-white/30 bg-white/10" : "border-white/10")}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold shadow-inner overflow-hidden border border-white/10">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      user.username[0].toUpperCase()
                    )}
                  </div>
                  <span className="text-sm font-semibold max-w-[120px] truncate">{user.username}</span>
                </button>

                <div className={clsx("absolute right-0 mt-2 w-56 bg-[#1a1a1a]/95 backdrop-blur-xl rounded-2xl shadow-2xl p-2 transition-all duration-300 transform origin-top-right border border-white/10 z-50", activeDropdown === 'user' ? "opacity-100 visible translate-y-0" : "opacity-0 invisible translate-y-2")}>
                  <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/5 mb-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Tài khoản</p>
                    <p className="text-white font-medium truncate">{user.username}</p>
                  </div>
                  <Link to="/settings" className="flex items-center px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                    <Settings className="w-4 h-4 mr-3 text-gray-400" />
                    Cài đặt
                  </Link>
                  <Link to="/profile" className="flex items-center px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                    <User className="w-4 h-4 mr-3 text-gray-400" />
                    Tủ Phim Cá Nhân
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 hover:text-red-300 flex items-center transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Đăng Xuất
                  </button>
                </div>
              </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/settings"
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all border border-white/10 hover:border-white/20 shadow-sm"
                  title="Cấu hình nguồn phim"
                >
                  <Settings className="w-4 h-4 text-gray-400 group-hover:text-white" />
                </Link>
                <Link
                  to="/login"
                  className="flex items-center gap-2 bg-white text-black hover:bg-gray-200 px-5 py-2 rounded-full text-sm font-bold transition-all shadow-lg shadow-white/10"
                >
                  <User className="w-4 h-4 fill-black" />
                  Thành viên
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className={clsx("lg:hidden flex items-center gap-4 transition-all duration-1000", isSplash ? "opacity-0" : "opacity-100 delay-500")}>
            {/* Mobile Search Icon Trigger */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-300 hover:text-white focus:outline-none p-2"
            >
              {isMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </button>
          </div>
          </div>
        </div>
      </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={clsx(
          "lg:hidden fixed inset-0 z-40 bg-[#0f172a]/95 backdrop-blur-3xl pt-28 pb-20 overflow-y-auto w-full h-screen overscroll-contain transition-all duration-300 ease-out transform",
          isMenuOpen ? "opacity-100 visible translate-y-0 scale-100" : "opacity-0 invisible -translate-y-8 scale-95 pointer-events-none"
        )}
      >
        <div className="px-6 space-y-6">
            <div className="relative lg:hidden" ref={mobileSearchRef}>
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm phim..."
                  className="w-full bg-white/10 text-white rounded-full py-3 px-4 pl-11 focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-inner"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    handleKeyDown(e);
                    if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < suggestions.length) {
                      setIsMenuOpen(false);
                    }
                  }}
                  onFocus={() => {
                    if (searchQuery.trim().length >= 1) setShowSuggestions(true);
                  }}
                />
                <button type="submit" className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <Search className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
                </button>
                {isSearching && (
                  <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                )}
              </form>

              {/* Mobile Search Suggestions */}
              {showSuggestions && searchQuery.trim().length >= 1 && (
                <div className="absolute top-full left-0 w-full mt-3 p-2 bg-[#1a1a1a]/95 backdrop-blur-2xl rounded-3xl shadow-[0_16px_40px_rgba(0,0,0,0.5)] border border-white/10 z-50 transition-all duration-300">
                  <div className="flex flex-col space-y-1">
                    {isSearching ? (
                      <div className="py-6 text-center text-gray-400 flex flex-col items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-sky-500 mb-2" />
                        <span className="text-sm font-medium">Đang tìm kiếm...</span>
                      </div>
                    ) : suggestions.length > 0 ? (
                      <>
                        {suggestions.map((movie, index) => (
                          <div
                            key={movie._id}
                            onClick={() => {
                              handleSuggestionClick(movie.slug);
                              setIsMenuOpen(false);
                            }}
                            className={clsx(
                              "flex items-center gap-4 px-3 py-2 cursor-pointer transition-all rounded-2xl group",
                              selectedIndex === index ? "bg-white/10 scale-[1.02] shadow-lg border border-white/10" : "hover:bg-white/10 active:bg-white/20 border border-transparent"
                            )}
                          >
                            <div className="w-12 h-16 rounded-xl overflow-hidden shadow-md flex-shrink-0">
                              <img
                                src={getMovieImageUrl(movie.thumb_url)}
                                alt={movie.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-white truncate group-hover:text-yellow-400 transition-colors">
                                <HighlightText text={movie.name} highlight={searchQuery} />
                              </h4>
                              <p className="text-xs text-gray-400 truncate mt-0.5">{movie.origin_name}</p>
                              <p className="text-[11px] font-semibold text-sky-400 mt-1">{movie.year}</p>
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={(e) => {
                            handleSearch(e);
                            setIsMenuOpen(false);
                          }}
                          className="w-full text-center py-3 mt-1 bg-white/5 hover:bg-white/10 rounded-2xl text-sm text-sky-400 hover:text-sky-300 font-bold transition-all"
                        >
                          Xem tất cả kết quả
                        </button>
                      </>
                    ) : (
                      <div className="py-8 px-4 text-center bg-white/5 rounded-2xl">
                        <Search className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                        <p className="text-sm text-gray-400">Không tìm thấy kết quả nào cho</p>
                        <p className="text-base font-bold text-white mt-1 truncate">"{searchQuery}"</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1 pt-2">
              <Link to="/" className="block px-4 py-3 rounded-lg text-base font-medium text-white hover:bg-white/5" onClick={() => setIsMenuOpen(false)}>Trang Chủ</Link>
              <Link to="/category/phim-le" className="block px-4 py-3 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-white/5" onClick={() => setIsMenuOpen(false)}>Phim Lẻ</Link>
              <Link to="/category/phim-bo" className="block px-4 py-3 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-white/5" onClick={() => setIsMenuOpen(false)}>Phim Bộ</Link>
              <Link to="/category/hoat-hinh" className="block px-4 py-3 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-white/5" onClick={() => setIsMenuOpen(false)}>Hoạt Hình</Link>
              <Link to="/category/tv-shows" className="block px-4 py-3 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-white/5" onClick={() => setIsMenuOpen(false)}>TV Shows</Link>
              <Link to="/category/phim-chieu-rap" className="block px-4 py-3 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-white/5" onClick={() => setIsMenuOpen(false)}>Phim Chiếu Rạp</Link>
            </div>

            <div className="border-t border-white/10 pt-4 mt-4 md:hidden">
              {user ? (
                <>
                  <div className="flex items-center gap-3 px-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold shadow-lg overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        user.username[0].toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">{user.username}</p>
                      <p className="text-xs text-gray-400">Thành viên</p>
                    </div>
                  </div>
                  <Link to="/settings" className="block px-4 py-3 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-white/5" onClick={() => setIsMenuOpen(false)}>Cài Đặt</Link>
                  <Link to="/profile" className="block px-4 py-3 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-white/5" onClick={() => setIsMenuOpen(false)}>Tủ Phim Cá Nhân</Link>
                  <button onClick={() => { logout(); setIsMenuOpen(false); }} className="w-full text-left block px-4 py-3 rounded-lg text-base font-medium text-red-400 hover:bg-white/5">Đăng Xuất</button>
                </>
              ) : (
                <div className="space-y-3">
                  <Link to="/settings" className="block px-4 py-3 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-white/5" onClick={() => setIsMenuOpen(false)}>Cài Đặt</Link>
                  <Link to="/login" className="block w-full text-center bg-yellow-500 text-black font-bold py-3 rounded-lg hover:bg-yellow-400 transition-colors" onClick={() => setIsMenuOpen(false)}>
                    Đăng Nhập Thành Viên
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
    </>
  );
};

export default Header;
