import React from 'react';
import { Link } from 'react-router-dom';
import { Film, Github, Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t border-white/[0.06] mt-auto relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-sky-500/5 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2.5 mb-4 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg">
                <Film className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
                Phim Phiếc
              </span>
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              Xem phim miễn phí chất lượng cao. Cập nhật nhanh nhất các bộ phim mới nhất từ khắp nơi trên thế giới.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Khám Phá</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Phim Lẻ', path: '/category/phim-le' },
                { name: 'Phim Bộ', path: '/category/phim-bo' },
                { name: 'Hoạt Hình', path: '/category/hoat-hinh' },
                { name: 'TV Shows', path: '/category/tv-shows' },
                { name: 'Chiếu Rạp', path: '/category/phim-chieu-rap' },
                { name: 'Hành Động', path: '/genre/hanh-dong' },
              ].map(link => (
                <Link 
                  key={link.path} 
                  to={link.path} 
                  className="text-gray-500 hover:text-sky-400 text-sm transition-colors py-1"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Thông Tin</h3>
            <div className="flex flex-col gap-2">
              <a href="#" className="text-gray-500 hover:text-sky-400 text-sm transition-colors py-1">DMCA</a>
              <a href="#" className="text-gray-500 hover:text-sky-400 text-sm transition-colors py-1">Liên Hệ</a>
              <a href="#" className="text-gray-500 hover:text-sky-400 text-sm transition-colors py-1">Điều Khoản Sử Dụng</a>
              <a href="#" className="text-gray-500 hover:text-sky-400 text-sm transition-colors py-1">Chính Sách Bảo Mật</a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-gray-600 text-xs">
            &copy; {new Date().getFullYear()} Phim Phiếc. All rights reserved.
          </p>
          <p className="text-gray-600 text-xs flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-rose-500/60 fill-current" /> by <span className="text-sky-500/70 font-medium">Phong</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
