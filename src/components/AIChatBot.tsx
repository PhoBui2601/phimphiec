import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Send, X, Trash2, Plus, 
  ChevronRight, Sparkles, Loader2, Bot, HelpCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { getMovieImageUrl, getMovieDetailFromSource, getActiveSource } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

const MiniMovieEmbed = ({ slug }: { slug: string; key?: React.Key }) => {
  const [movie, setMovie] = useState<any>(null);
  const [foundSource, setFoundSource] = useState<'ophim' | 'kkphim' | 'nguonc' | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const activeSource = getActiveSource();
    
    // Order: active source first, then the remaining sources
    const sources: ('ophim' | 'kkphim' | 'nguonc')[] = [activeSource];
    const allSources: ('ophim' | 'kkphim' | 'nguonc')[] = ['ophim', 'kkphim', 'nguonc'];
    allSources.forEach(s => {
      if (s !== activeSource) {
        sources.push(s);
      }
    });

    const tryFetch = async () => {
      for (const src of sources) {
        if (!active) return;
        try {
          const res = await getMovieDetailFromSource(slug, src);
          if (!active) return;
          if (res && res.movie) {
            setMovie(res.movie);
            setFoundSource(src);
            setLoading(false);
            return; // Found, stop scanning
          }
        } catch (err) {
          console.warn(`Failed to fetch ${slug} from source ${src}:`, err);
        }
      }
      if (active) setLoading(false);
    };

    tryFetch();

    return () => { active = false; };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/10 animate-pulse my-2">
        <div className="w-10 h-14 bg-white/10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-white/10 rounded w-2/3" />
          <div className="h-2.5 bg-white/10 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!movie) return null;

  const imageUrl = movie.thumb_url || movie.poster_url;
  const displayImage = getMovieImageUrl(imageUrl);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const activeSource = getActiveSource();
    
    if (foundSource && foundSource !== activeSource) {
      const sourceNameMap: Record<string, string> = {
        ophim: 'Ophim',
        kkphim: 'KKPhim',
        nguonc: 'NguonC'
      };
      const sourceName = sourceNameMap[foundSource] || foundSource;
      const confirmSwitch = window.confirm(
        `Phim này chỉ có ở nguồn ${sourceName}. Bạn có muốn đổi nguồn sang ${sourceName} để xem không?`
      );
      if (confirmSwitch) {
        localStorage.setItem('phimphiec_source', foundSource);
        window.location.href = `/movie/${movie.slug}`;
      }
    } else {
      navigate(`/movie/${movie.slug}`);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/15 hover:border-sky-500/40 transition-all group my-2 block shadow-lg cursor-pointer"
    >
      <div className="w-11 h-15 rounded-xl overflow-hidden shadow-md flex-shrink-0 bg-slate-800 border border-white/10">
        <img 
          src={displayImage} 
          alt={movie.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-sky-400 transition-colors">
          {movie.name}
        </h4>
        <p className="text-[10px] sm:text-xs text-gray-400 truncate mt-0.5">{movie.origin_name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
            {movie.episode_current || 'Full'}
          </span>
          <span className="text-[9px] text-gray-500 font-semibold">{movie.year}</span>
        </div>
      </div>
    </div>
  );
};

const ChatMessageContent = ({ content }: { content: string }) => {
  const regex = /\[MOVIE:\s*([a-zA-Z0-9-_]+)\s*\]/gi;
  const parts = content.split(regex);
  
  if (parts.length <= 1) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  return (
    <div className="space-y-1">
      {parts.map((part, idx) => {
        if (idx % 2 === 1) {
          return <MiniMovieEmbed key={idx} slug={part.trim()} />;
        }
        return <span key={idx} className="whitespace-pre-wrap">{part}</span>;
      })}
    </div>
  );
};

const AIChatBot = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSessionsList, setShowSessionsList] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Save chat sessions when they change (only save to local storage if user is logged in)
  const saveSessions = (updated: ChatSession[]) => {
    setSessions(updated);
    if (user) {
      localStorage.setItem('phimphiec_chatsessions', JSON.stringify(updated));
    }
  };

  const createNewSession = (autoSelect = true, currentSessions = sessions) => {
    const id = Date.now().toString();
    const newSession: ChatSession = {
      id,
      title: user ? `Phiên tư vấn #${currentSessions.length + 1}` : `Phiên tư vấn khách`,
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: user
            ? 'Xin chào! Tôi là Trợ lý AI PhimPhiếc. Bạn cần tôi tư vấn phim gì hôm nay? Hãy nhập tên phim, thể loại hoặc tâm trạng để tôi gợi ý cho bạn bộ phim đỉnh cao nhất nhé!'
            : 'Xin chào khách quý! Tôi là Trợ lý AI PhimPhiếc. Bạn cần tôi tư vấn phim gì hôm nay? Hãy nhập câu hỏi, và đừng quên đăng nhập để lưu trữ lịch sử chat nhé!',
          timestamp: Date.now()
        }
      ],
      createdAt: Date.now()
    };

    const updated = [newSession, ...currentSessions];
    saveSessions(updated);
    if (autoSelect) {
      setActiveSessionId(id);
      setShowSessionsList(false);
    }
  };

  // Sync sessions based on user auth state
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem('phimphiec_chatsessions');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSessions(parsed);
          if (parsed.length > 0) {
            setActiveSessionId(parsed[0].id);
          } else {
            createNewSession(true, []);
          }
        } catch (e) {
          createNewSession(true, []);
        }
      } else {
        createNewSession(true, []);
      }
    } else {
      // Guest: clear persistent state and start a fresh volatile session
      const tempId = Date.now().toString();
      const guestSession: ChatSession = {
        id: tempId,
        title: `Phiên tư vấn khách`,
        messages: [
          {
            id: 'welcome',
            role: 'assistant',
            content: 'Xin chào khách quý! Tôi là Trợ lý AI PhimPhiếc. Bạn cần tôi tư vấn phim gì hôm nay? Đăng nhập để lưu lại lịch sử trò chuyện nhé!',
            timestamp: Date.now()
          }
        ],
        createdAt: Date.now()
      };
      setSessions([guestSession]);
      setActiveSessionId(tempId);
    }
  }, [user]);

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    saveSessions(updated);

    if (activeSessionId === id) {
      if (updated.length > 0) {
        setActiveSessionId(updated[0].id);
      } else {
        const tempId = Date.now().toString();
        const newSession: ChatSession = {
          id: tempId,
          title: user ? `Phiên tư vấn #1` : `Phiên tư vấn khách`,
          messages: [
            {
              id: 'welcome',
              role: 'assistant',
              content: user
                ? 'Xin chào! Tôi là Trợ lý AI PhimPhiếc. Bạn cần tôi tư vấn phim gì hôm nay? Hãy nhập tên phim, thể loại hoặc tâm trạng để tôi gợi ý cho bạn bộ phim đỉnh cao nhất nhé!'
                : 'Xin chào khách quý! Tôi là Trợ lý AI PhimPhiếc. Bạn cần tôi tư vấn phim gì hôm nay? Đăng nhập để lưu lại lịch sử trò chuyện nhé!',
              timestamp: Date.now()
            }
          ],
          createdAt: Date.now()
        };
        saveSessions([newSession]);
        setActiveSessionId(tempId);
      }
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, loading]);

  const handleSend = async () => {
    if (!inputValue.trim() || loading || !activeSessionId) return;

    const userText = inputValue.trim();
    setInputValue('');
    setLoading(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: Date.now()
    };

    // Update session locally with user message
    let updatedSessions = sessions.map(s => {
      if (s.id === activeSessionId) {
        // Set dynamic title based on first query if title is generic
        const title = s.messages.length === 1 ? (userText.length > 20 ? userText.substring(0, 17) + '...' : userText) : s.title;
        return {
          ...s,
          title,
          messages: [...s.messages, userMessage]
        };
      }
      return s;
    });
    saveSessions(updatedSessions);

    // Prepare message payload for Nvidia NIM API
    const session = updatedSessions.find(s => s.id === activeSessionId);
    if (!session) return;

    // We only send the last few messages for context to keep API payload small
    const apiMessages = session.messages
      .filter(m => m.id !== 'welcome')
      .slice(-10)
      .map(m => ({
        role: m.role,
        content: m.content
      }));

    try {
      const res = await axios.post('/api/ai/chat', { messages: apiMessages });
      const reply = res.data?.choices?.[0]?.message?.content || 'Xin lỗi bạn, tôi không nhận được phản hồi chính xác từ API.';
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: Date.now()
      };

      updatedSessions = updatedSessions.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [...s.messages, assistantMessage]
          };
        }
        return s;
      });
      saveSessions(updatedSessions);
    } catch (e: any) {
      console.error(e);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Hệ thống AI gặp sự cố kết nối. Hãy thử lại sau giây lát hoặc liên hệ ban quản trị!',
        timestamp: Date.now()
      };

      updatedSessions = updatedSessions.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [...s.messages, assistantMessage]
          };
        }
        return s;
      });
      saveSessions(updatedSessions);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleClearChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeSessionId) return;

    const updated = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          messages: [
            {
              id: 'welcome',
              role: 'assistant',
              content: 'Đã dọn dẹp cuộc trò chuyện này. Tôi sẵn sàng hỗ trợ tư vấn phim mới từ đầu!',
              timestamp: Date.now()
            }
          ]
        };
      }
      return s;
    });
    saveSessions(updated);
  };

  const suggestions = [
    "Gợi ý cho tôi phim tình cảm lãng mạn Hàn Quốc hot nhất",
    "Tìm phim hành động chiếu rạp Mỹ gay cấn, cháy nổ mãn nhãn",
    "Phim cổ trang Trung Quốc Mộng Hoa Lục xem có hay không?",
    "Hôm nay tâm trạng tôi hơi buồn, nên xem phim gì cho vui?"
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end pointer-events-none select-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="w-[360px] sm:w-[400px] h-[550px] rounded-[2rem] bg-[#0b0f19]/93 backdrop-blur-md border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.65)] flex flex-col overflow-hidden mb-4 pointer-events-auto select-text relative"
          >
            {/* Top metallic glow border line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1.5px] bg-gradient-to-r from-transparent via-sky-400/40 to-transparent pointer-events-none" />

            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-white/[0.03] flex justify-between items-center relative shrink-0">
              <div 
                className="flex items-center gap-2.5 cursor-pointer select-none group"
                onClick={() => setShowSessionsList(!showSessionsList)}
              >
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">Trợ Lý AI(BETA))</span>
                    <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showSessionsList ? 'rotate-90' : ''}`} />
                  </div>
                  <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Llama 3.1 NIM Online
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button 
                  onClick={handleClearChat}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                  title="Dọn dẹp phiên này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sessions List overlay panel */}
            <AnimatePresence>
              {showSessionsList && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-[69px] inset-x-0 bottom-0 bg-[#0f172a]/95 backdrop-blur-3xl z-40 p-4 flex flex-col border-b border-white/5"
                >
                  <div className="flex justify-between items-center mb-4 shrink-0">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phiên Trò Chuyện</h3>
                    <button
                      onClick={() => createNewSession(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 text-xs font-bold border border-sky-500/20 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Phiên Mới
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {sessions.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setActiveSessionId(s.id);
                          setShowSessionsList(false);
                        }}
                        className={`flex justify-between items-center p-3 rounded-2xl border transition-all cursor-pointer ${
                          activeSessionId === s.id
                            ? 'bg-white/[0.06] border-sky-500/40 text-white'
                            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] text-gray-300 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <MessageSquare className="w-4 h-4 text-sky-400 shrink-0" />
                          <span className="text-xs font-bold truncate">{s.title}</span>
                        </div>
                        <button
                          onClick={(e) => deleteSession(s.id, e)}
                          className="p-1 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeSession?.messages.map((msg) => {
                const isAssistant = msg.role === 'assistant';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} animate-fadeIn`}
                  >
                    <div className={`flex gap-2 max-w-[85%] ${isAssistant ? 'flex-row' : 'flex-row-reverse'}`}>
                      {isAssistant && (
                        <div className="w-7 h-7 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <div
                          className={`p-3.5 rounded-[1.25rem] text-xs sm:text-sm shadow-md border ${
                            isAssistant
                              ? 'bg-white/[0.03] border-white/10 text-gray-200 rounded-tl-none'
                              : 'bg-sky-600/25 border-sky-500/30 text-white rounded-tr-none'
                          }`}
                        >
                          <ChatMessageContent content={msg.content} />
                        </div>
                        <span className="text-[9px] text-gray-500 font-medium mt-1 block px-1.5">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex justify-start animate-fadeIn">
                  <div className="flex gap-2 max-w-[80%] items-start">
                    <div className="w-7 h-7 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 animate-bounce" />
                    </div>
                    <div className="p-3.5 rounded-[1.25rem] bg-white/[0.03] border border-white/10 rounded-tl-none text-xs text-gray-400 flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                      <span>Trợ lý AI đang suy nghĩ đề xuất...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions (Rendered when conversation has only welcome message) */}
            {activeSession?.messages.length === 1 && (
              <div className="px-4 pb-2 pt-1 shrink-0">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1 select-none">
                  <Sparkles className="w-3 h-3 text-sky-400 animate-pulse" />
                  Gợi Ý Câu Hỏi Nhanh
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputValue(s);
                        setTimeout(() => handleSend(), 50);
                      }}
                      className="text-[10px] sm:text-xs font-semibold text-gray-400 hover:text-white bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 px-3 py-1.5 rounded-full transition-all text-left truncate max-w-full cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Guest notice banner */}
            {!user && (
              <div className="text-[10px] text-amber-400 bg-amber-500/10 border-t border-white/5 py-1.5 px-4 text-center shrink-0 font-medium select-none">
                Lịch sử chat sẽ không được lưu trừ khi bạn <Link to="/login" className="underline hover:text-amber-300 font-bold">đăng nhập</Link>.
              </div>
            )}

            {/* Input Form */}
            <div className="p-4 border-t border-white/10 bg-white/[0.02] shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Gợi ý phim hoặc đặt câu hỏi..."
                  disabled={loading}
                  className="flex-1 bg-white/[0.04] border border-white/10 hover:border-white/15 focus:border-sky-500/40 rounded-2xl py-2.5 px-4 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500/20 transition-all placeholder:text-gray-500 disabled:opacity-50 font-medium"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || loading}
                  className="p-2.5 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 hover:from-sky-500 hover:to-blue-700 text-white disabled:opacity-50 shadow-md shadow-sky-500/10 flex items-center justify-center shrink-0 transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Trigger Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 flex items-center justify-center text-white border border-white/20 shadow-[0_8px_30px_rgba(14,165,233,0.4)] pointer-events-auto relative cursor-pointer group"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-sky-500 border-2 border-slate-900 flex items-center justify-center text-[8px] font-black text-white">AI</span>
            </span>
          </>
        )}
      </motion.button>
    </div>
  );
};

export default AIChatBot;
