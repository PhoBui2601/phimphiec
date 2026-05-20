import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  User, Lock, Camera, Save, Loader2, AlertCircle, CheckCircle, 
  Eye, EyeOff, ArrowLeft, Database, Globe, Zap, ShieldCheck 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const Settings = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(user?.username || '');
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(user?.avatar_url || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Source Switcher State
  const [activeSource, setActiveSource] = useState<'ophim' | 'kkphim' | 'nguonc'>('ophim');
  const [sourceMessage, setSourceMessage] = useState<string | null>(null);

  useEffect(() => {
    const savedSource = localStorage.getItem('phimphiec_source') as any;
    if (savedSource === 'kkphim' || savedSource === 'nguonc' || savedSource === 'ophim') {
      setActiveSource(savedSource);
    }
  }, []);

  const handleSourceChange = (source: 'ophim' | 'kkphim' | 'nguonc') => {
    setActiveSource(source);
    localStorage.setItem('phimphiec_source', source);
    setSourceMessage(`Đã chuyển nguồn sang ${source.toUpperCase()}! Đang tải lại dữ liệu...`);
    
    // Smooth page reload to let api fetch from new source
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    if (password && password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp' });
      setLoading(false);
      return;
    }

    if (password && !oldPassword) {
      setMessage({ type: 'error', text: 'Vui lòng nhập mật khẩu cũ để thay đổi mật khẩu' });
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      let hasUpdates = false;

      if (username !== user?.username) { formData.append('username', username); hasUpdates = true; }
      if (password) { formData.append('password', password); formData.append('oldPassword', oldPassword); hasUpdates = true; }
      if (avatarFile) { formData.append('avatar', avatarFile); hasUpdates = true; }

      if (!hasUpdates) {
        setMessage({ type: 'success', text: 'Không có thay đổi nào' });
        setLoading(false);
        return;
      }

      const res = await axios.post('/api/auth/profile', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Cập nhật tài khoản thành công!' });
        login(res.data.user);
        setPassword(''); setOldPassword(''); setConfirmPassword(''); setAvatarFile(null);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Có lỗi xảy ra' });
    } finally {
      setLoading(false);
    }
  };

  const sources = [
    {
      id: 'ophim',
      name: 'Ophim',
      api: 'https://ophim1.com',
      desc: 'Kho phim đa dạng, tốc độ tải nhanh, cập nhật tập mới liên tục mỗi ngày.',
      badge: 'Mặc định',
      badgeColor: 'bg-sky-500/20 text-sky-400 border-sky-500/30'
    },
    {
      id: 'kkphim',
      name: 'KKPhim',
      api: 'https://phimapi.com',
      desc: 'Server chất lượng cao, độ ổn định tuyệt vời, hình ảnh sắc nét, ít giật lag.',
      badge: 'Premium',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    },
    {
      id: 'nguonc',
      name: 'NguonC',
      api: 'https://phim.nguonc.com',
      desc: 'Nguồn phim phong phú, hỗ trợ tốc độ cao, giao diện dữ liệu tập phim chuẩn.',
      badge: 'Độ trễ thấp',
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 pt-32 md:pt-40 pb-20 px-4 relative overflow-hidden select-none">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-start relative z-10">
        
        {/* Left Side: Dynamic Source Switcher with liquid glass design */}
        <div className="flex-1 w-full glass rounded-[2rem] p-6 md:p-8 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-[1.5px] bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />
          
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Database className="w-5 h-5 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
              Cấu Hình Nguồn Phim (Đổi Nguồn)
            </h2>
            <p className="text-gray-400 text-xs mt-1">Thay đổi nguồn API để tối ưu tốc độ xem và cập nhật dữ liệu phim mới nhất</p>
          </div>

          <AnimatePresence>
            {sourceMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-300 text-sm flex items-center gap-3"
              >
                <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                <span>{sourceMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            {sources.map((src) => {
              const isSelected = activeSource === src.id;
              return (
                <div
                  key={src.id}
                  onClick={() => handleSourceChange(src.id as any)}
                  className={`relative p-5 rounded-2xl border transition-all duration-300 cursor-pointer group flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                    isSelected 
                      ? 'bg-white/[0.06] border-sky-400/50 shadow-[0_10px_30px_rgba(14,165,233,0.15)] ring-1 ring-sky-400/30' 
                      : 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-base font-bold transition-colors ${isSelected ? 'text-sky-300' : 'text-white'}`}>
                        {src.name}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${src.badgeColor}`}>
                        {src.badge}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono block mt-1">{src.api}</span>
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed">{src.desc}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {isSelected ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-bold shadow-md shadow-sky-500/5">
                        <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
                        Đang kết nối
                      </div>
                    ) : (
                      <div className="text-[11px] text-gray-500 group-hover:text-white transition-colors px-3 py-1.5 rounded-xl border border-white/5 group-hover:border-white/10">
                        Chọn nguồn này
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Account Settings / Guest card */}
        <div className="w-full md:w-[380px] glass rounded-[2rem] p-6 sm:p-8 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative shrink-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
          
          {/* Back to Profile / Home */}
          <Link to={user ? "/profile" : "/"} className="inline-flex items-center gap-1.5 text-gray-500 hover:text-white text-xs mb-6 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            {user ? "Về Tủ Phim" : "Về Trang Chủ"}
          </Link>

          {user ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  Thông Tin Tài Khoản
                </h2>
                <p className="text-gray-400 text-xs mt-1">Cập nhật ảnh đại diện và bảo mật tài khoản</p>
              </div>

              {message && (
                <div className={`mb-5 p-3 rounded-2xl flex items-center gap-3 text-xs border ${
                  message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Avatar upload in rounded layout */}
                <div className="flex flex-col items-center mb-6">
                  <div className="relative group cursor-pointer">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg overflow-hidden border border-white/20">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        user?.username?.[0]?.toUpperCase()
                      )}
                    </div>
                    <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="w-6 h-6 text-white" />
                      <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    </label>
                  </div>
                  <p className="mt-2 text-[10px] text-gray-500">Nhấn ảnh đại diện để thay đổi</p>
                </div>

                {/* Username field */}
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Tên đăng nhập</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-gray-500" />
                    </div>
                    <input 
                      type="text" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white text-xs focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all font-semibold" 
                    />
                  </div>
                </div>

                {/* Passwords */}
                {[
                  { label: 'Mật khẩu cũ', value: oldPassword, setter: setOldPassword, show: showOldPassword, toggle: setShowOldPassword, hint: 'Khi đổi mật khẩu' },
                  { label: 'Mật khẩu mới', value: password, setter: setPassword, show: showPassword, toggle: setShowPassword, hint: 'Để trống nếu không đổi' },
                ].map((field) => (
                  <div key={field.label}>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                      {field.label} <span className="normal-case text-gray-500 font-normal">({field.hint})</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-gray-500" />
                      </div>
                      <input
                        type={field.show ? "text" : "password"}
                        value={field.value}
                        onChange={(e) => field.setter(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-10 pr-12 py-2 text-white text-xs focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:text-gray-700"
                      />
                      <button type="button" onClick={() => field.toggle(!field.show)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white transition-colors cursor-pointer">
                        {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}

                {password && (
                  <div className="animate-fadeIn">
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Xác nhận mật khẩu</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-gray-500" />
                      </div>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full bg-white/[0.03] border rounded-xl pl-10 pr-12 py-2 text-white text-xs focus:outline-none transition-all placeholder:text-gray-700 ${
                          confirmPassword && confirmPassword !== password ? 'border-red-500/40 focus:border-red-500/40 focus:ring-red-500/30' : 'border-white/10 focus:border-amber-500/50 focus:ring-amber-500/30'
                        } focus:ring-1`}
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white transition-colors cursor-pointer">
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && confirmPassword !== password && (
                      <p className="text-red-400 text-[10px] mt-1">Mật khẩu không khớp</p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold py-3 rounded-xl transition-all press disabled:opacity-50 shadow-lg shadow-orange-500/20 text-xs mt-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Lưu Thay Đổi
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 drop-shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Cá Nhân Hóa Trải Nghiệm</h3>
              <p className="text-gray-400 text-xs leading-relaxed mb-8">
                Đăng nhập hoặc đăng ký tài khoản miễn phí để lưu lịch sử xem phim, tạo tủ phim cá nhân, nhận thông báo tập phim mới, và lưu trữ lịch sử chat cùng AI thông minh!
              </p>
              <div className="w-full space-y-3.5">
                <Link
                  to="/login"
                  className="block w-full text-center bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold py-3 rounded-xl hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] text-xs"
                >
                  Đăng Nhập Ngay
                </Link>
                <Link
                  to="/register"
                  className="block w-full text-center bg-white/[0.03] hover:bg-white/[0.08] text-white font-bold py-3 rounded-xl border border-white/10 hover:border-white/20 transition-all hover:scale-[1.02] active:scale-[0.98] text-xs"
                >
                  Tạo Tài Khoản Mới
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
