import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Send, Image as ImageIcon, Trash2, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Comment {
  id: number;
  content: string;
  image_url: string | null;
  created_at: string;
  username: string;
  avatar_url: string | null;
  role: string;
}

interface CommentSectionProps {
  slug: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ slug }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchComments();
  }, [slug]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/comments/${slug}`);
      setComments(res.data);
    } catch (error) {
      console.error("Failed to fetch comments", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !image) return;
    if (!user) return;

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('movie_slug', slug);
      if (content.trim()) formData.append('content', content);
      if (image) formData.append('image', image);

      const res = await axios.post('/api/comments', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setComments([res.data, ...comments]);
      setContent('');
      removeImage();
    } catch (error) {
      console.error("Failed to post comment", error);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (deletingId === null) return;
    try {
      await axios.delete(`/api/comments/${deletingId}`);
      setComments(comments.filter(c => c.id !== deletingId));
    } catch (error) {
      console.error("Failed to delete comment", error);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="mt-8 bg-slate-800/50 rounded-2xl p-6 border border-white/5">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center">
        <span className="w-1 h-6 bg-sky-500 rounded-full mr-3"></span>
        Bình Luận ({comments.length})
      </h3>

      {/* Comment Input */}
      {user ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.username} className="w-10 h-10 rounded-full object-cover border border-white/10" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-sky-600 flex items-center justify-center text-white font-bold text-lg">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-grow">
              <div className="relative">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Viết bình luận của bạn..."
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 transition-all resize-none min-h-[100px]"
                />

                {/* Image Preview */}
                <AnimatePresence>
                  {imagePreview && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-4 left-4"
                    >
                      <div className="relative group">
                        <img src={imagePreview} alt="Preview" className="h-20 w-auto rounded-lg border border-white/20" />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-100 transition-opacity shadow-lg"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Thêm ảnh</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || (!content.trim() && !image)}
                  className="flex items-center gap-2 px-6 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-gray-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-sky-600/20"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Gửi</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-slate-900/50 rounded-xl p-6 text-center mb-8 border border-white/5 border-dashed">
          <p className="text-gray-400 mb-4">Vui lòng đăng nhập hoặc đăng ký để sử dụng chức năng bình luận</p>
          <div className="flex justify-center gap-4">
            <Link to="/login" className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-medium transition-colors">
              Đăng nhập
            </Link>
            <Link to="/register" className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors border border-white/10">
              Đăng ký
            </Link>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4 group"
            >
              <div className="flex-shrink-0">
                {comment.avatar_url ? (
                  <img src={comment.avatar_url} alt={comment.username} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-sm border border-white/5">
                    {comment.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-grow">
                <div className="bg-slate-900/50 rounded-2xl rounded-tl-none p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sky-400">{comment.username}</span>
                      {comment.role === 'admin' && (
                        <span className="px-1.5 py-0.5 rounded-md bg-yellow-500/20 text-yellow-500 text-[10px] font-bold uppercase tracking-wider border border-yellow-500/30">
                          Admin
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                  </div>
                  {comment.content && (
                    <p className="text-gray-300 whitespace-pre-wrap mb-2">{comment.content}</p>
                  )}
                  {comment.image_url && (
                    <div className="mt-2">
                      <img
                        src={comment.image_url}
                        alt="Comment attachment"
                        className="max-h-60 rounded-lg border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(comment.image_url!, '_blank')}
                      />
                    </div>
                  )}
                </div>
                {user && (user.username === comment.username || user.role === 'admin') && (
                  <div className="flex justify-end mt-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setDeletingId(comment.id)}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-2 py-1 rounded-md active:bg-red-500/10"
                    >
                      <Trash2 className="w-3 h-3" />
                      Xóa
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            Chưa có bình luận nào. Hãy là người đầu tiên!
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeletingId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full border border-white/10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-2">Xóa bình luận?</h3>
              <p className="text-gray-400 mb-6">Bạn có chắc chắn muốn xóa bình luận này không? Hành động này không thể hoàn tác.</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeletingId(null)}
                  className="px-4 py-2 rounded-xl text-gray-300 hover:bg-white/5 transition-colors font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors font-medium shadow-lg shadow-red-500/20"
                >
                  Xóa
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CommentSection;
