import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, UserPlus, Loader2, Check, X } from 'lucide-react';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const passwordChecks = useMemo(() => ([
    { label: 'Tối thiểu 8 ký tự', ok: password.length >= 8 },
    { label: 'Có chữ hoa', ok: /[A-Z]/.test(password) },
    { label: 'Có số', ok: /[0-9]/.test(password) },
  ]), [password]);

  const passwordStrength = passwordChecks.filter(c => c.ok).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/register', { username, password });
      login(res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Đăng ký thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="glass-strong px-8 py-10 md:p-12 rounded-3xl w-full max-w-md relative z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[2px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
        
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <UserPlus className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Đăng Ký</h2>
          <p className="text-gray-500 text-sm mt-1">Tạo tài khoản PhimPhiếc miễn phí</p>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-xl mb-4 text-sm border border-red-500/20">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">Tài khoản</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-all placeholder:text-gray-600"
              placeholder="Chọn tên đăng nhập"
              required
            />
          </div>
          <div>
            <label className="block text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">Mật khẩu</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-white focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-all placeholder:text-gray-600"
                placeholder="Tạo mật khẩu mạnh"
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-white transition-colors">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Password Strength */}
            {password.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      passwordStrength >= i 
                        ? i <= 1 ? 'bg-red-500' : i <= 2 ? 'bg-amber-500' : 'bg-emerald-500'
                        : 'bg-white/10'
                    }`} />
                  ))}
                </div>
                <div className="space-y-1">
                  {passwordChecks.map((check, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {check.ok 
                        ? <Check className="w-3 h-3 text-emerald-400" /> 
                        : <X className="w-3 h-3 text-gray-600" />
                      }
                      <span className={check.ok ? 'text-emerald-400' : 'text-gray-600'}>{check.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-blue-500/20 press disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Tạo Tài Khoản
          </button>
        </form>
        <p className="mt-6 text-center text-gray-500 text-sm">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-sky-400 hover:text-sky-300 font-semibold">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
