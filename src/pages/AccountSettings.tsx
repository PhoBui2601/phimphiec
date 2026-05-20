import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { User, Lock, Camera, Save, Loader2, AlertCircle, CheckCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const AccountSettings = () => {
  const { user, login } = useAuth();
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
        setMessage({ type: 'success', text: 'Cập nhật thành công!' });
        login(res.data.user);
        setPassword(''); setOldPassword(''); setConfirmPassword(''); setAvatarFile(null);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Có lỗi xảy ra' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 pt-32 md:pt-40 pb-12 px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-md mx-auto glass-strong rounded-3xl overflow-hidden relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[2px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
        
        <div className="px-6 py-10 sm:p-10 relative z-10">
          {/* Back link */}
          <Link to="/profile" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Tủ Phim
          </Link>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white">Cài Đặt Tài Khoản</h2>
            <p className="text-gray-500 text-sm mt-1">Quản lý thông tin cá nhân</p>
          </div>

          {message && (
            <div className={`mb-6 p-3 rounded-xl flex items-center gap-3 text-sm border ${
              message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center">
              <div className="relative group cursor-pointer">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    user?.username?.[0]?.toUpperCase()
                  )}
                </div>
                <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-pointer active:opacity-80">
                  <Camera className="w-7 h-7 text-white" />
                  <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
              <p className="mt-2 text-[11px] text-gray-600">Nhấn để thay đổi</p>
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Tên đăng nhập</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all" />
              </div>
            </div>

            {/* Passwords */}
            {[
              { label: 'Mật khẩu cũ', value: oldPassword, setter: setOldPassword, show: showOldPassword, toggle: setShowOldPassword, hint: 'Bắt buộc khi đổi mật khẩu' },
              { label: 'Mật khẩu mới', value: password, setter: setPassword, show: showPassword, toggle: setShowPassword, hint: 'Để trống nếu không đổi' },
            ].map((field) => (
              <div key={field.label}>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  {field.label} <span className="normal-case text-gray-600 font-normal">({field.hint})</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-600" />
                  </div>
                  <input
                    type={field.show ? "text" : "password"}
                    value={field.value}
                    onChange={(e) => field.setter(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-12 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:text-gray-700"
                  />
                  <button type="button" onClick={() => field.toggle(!field.show)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-white transition-colors cursor-pointer">
                    {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}

            {password && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Xác nhận mật khẩu</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-600" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full bg-white/[0.04] border rounded-xl pl-10 pr-12 py-2.5 text-white text-sm focus:outline-none transition-all placeholder:text-gray-700 ${
                      confirmPassword && confirmPassword !== password ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/30' : 'border-white/10 focus:border-amber-500/50 focus:ring-amber-500/30'
                    } focus:ring-1`}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-white transition-colors cursor-pointer">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-red-400 text-xs mt-1">Mật khẩu không khớp</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold py-3 rounded-xl transition-all press disabled:opacity-50 shadow-lg shadow-orange-500/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Lưu Thay Đổi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
