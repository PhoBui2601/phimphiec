import React, { useState } from 'react';
import { X, Copy, Facebook, Twitter, Check } from 'lucide-react';

interface ShareModalProps {
  movieName: string;
  movieSlug: string;
  isOpen: boolean;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ movieName, movieSlug, isOpen, onClose }) => {
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const url = `${window.location.origin}/watch/${movieSlug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-800 border border-white/10 rounded-[2rem] w-full max-w-md shadow-2xl transform transition-all relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <h3 className="text-xl font-bold text-white">Chia sẻ & Nhúng Nền Tảng</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Share Link */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Đường dẫn xem phim</label>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={url} 
                readOnly 
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none"
              />
              <button 
                onClick={handleCopyLink}
                className="bg-sky-500 hover:bg-sky-600 text-white p-3 rounded-xl transition-colors shrink-0"
                title="Copy Link"
              >
                {copiedLink ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Link này khi chèn (nhúng) vào các nền tảng chat như Facebook Facebook, Discord, Twitter... sẽ tự động lấy thông tin mô tả và banner của phim hiển thị thật đẹp.
            </p>
          </div>

          {/* Social Share */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">Chia sẻ lên mạng xã hội</label>
            <div className="flex gap-4">
              <a 
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex justify-center items-center gap-2 py-3 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] font-semibold transition-colors border border-[#1877F2]/20"
              >
                <Facebook className="w-5 h-5" />
                Facebook
              </a>
              <a 
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Đang xem ${movieName} rât hay, vào xem cùng nhé!`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex justify-center items-center gap-2 py-3 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-[#1DA1F2] font-semibold transition-colors border border-[#1DA1F2]/20"
              >
                <Twitter className="w-5 h-5" />
                Twitter
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
