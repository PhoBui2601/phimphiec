import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer Configuration (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Database setup
const dbPath = path.join(process.cwd(), 'phimphiec.db');
const db = new Database(dbPath);

// Migration: Add avatar_url if not exists
try {
  db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT');
} catch (e) {
  // Column likely already exists
}

// Migration: Add duration to history if not exists
try {
  db.exec('ALTER TABLE history ADD COLUMN duration INTEGER');
} catch (e) {
  // Column likely already exists
}

// Migration: Add role to users if not exists
try {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
} catch (e) {
  // Column likely already exists
}

// Migration: Add latest_episode to follows
try {
  db.exec('ALTER TABLE follows ADD COLUMN latest_episode TEXT');
} catch (e) {
}

// Create notifications table
db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    movie_slug TEXT NOT NULL,
    movie_name TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Seed Database with Default Admin
try {
  const adminExists = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
  if (!adminExists) {
    const defaultPasswordHash = bcrypt.hashSync('admin123', 10);
    db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, 'admin')").run('admin', defaultPasswordHash);
    console.log("Seeded default admin user: admin / admin123");
  }
} catch (err) {
  console.error("Failed to seed admin user:", err);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS follows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    movie_slug TEXT NOT NULL,
    movie_name TEXT,
    poster_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    UNIQUE(user_id, movie_slug)
  );

  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    movie_slug TEXT NOT NULL,
    movie_name TEXT,
    poster_url TEXT,
    episode_slug TEXT,
    episode_name TEXT,
    timestamp INTEGER, -- seconds watched
    duration INTEGER, -- total duration
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    UNIQUE(user_id, movie_slug)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    movie_slug TEXT NOT NULL,
    content TEXT,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

app.use(express.json());
app.use(cookieParser());

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);

    // Verify user exists in database (handles stale tokens after DB reset)
    try {
      const stmt = db.prepare('SELECT id, username, avatar_url, role FROM users WHERE id = ?');
      const dbUser = stmt.get(user.id);

      if (!dbUser) {
        return res.sendStatus(403);
      }

      req.user = dbUser;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.sendStatus(500);
    }
  });
};

// API Routes

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    const info = stmt.run(username, hashedPassword);

    const token = jwt.sign({ id: info.lastInsertRowid, username }, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: true, // Required for SameSite=None
      sameSite: 'none', // Required for iframe
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    res.json({ user: { id: info.lastInsertRowid, username, role: 'user' } });
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  const user = stmt.get(username) as any;

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Sai mật khẩu hoặc tên đăng nhập, hoặc chưa có tài khoản.' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: true, // Required for SameSite=None
    sameSite: 'none', // Required for iframe
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
  res.json({ user: { id: user.id, username: user.username, avatar_url: user.avatar_url, role: user.role } });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });
  res.json({ message: 'Logged out' });
});

// Me
app.get('/api/auth/me', authenticateToken, (req: any, res) => {
  res.json({ user: req.user });
});

// Update Profile
app.post('/api/auth/profile', authenticateToken, upload.single('avatar'), async (req: any, res) => {
  const { username, password, oldPassword } = req.body;
  const userId = req.user.id;
  const file = req.file;

  try {
    const updates: string[] = [];
    const params: any[] = [];

    if (username) {
      updates.push('username = ?');
      params.push(username);
    }

    if (password) {
      if (!oldPassword) {
        return res.status(400).json({ error: 'Vui lòng nhập mật khẩu cũ' });
      }

      // Verify old password
      const stmt = db.prepare('SELECT password FROM users WHERE id = ?');
      const user = stmt.get(userId) as any;

      if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
        return res.status(400).json({ error: 'Mật khẩu cũ không chính xác' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      params.push(hashedPassword);
    }

    if (file) {
      // Upload to Cloudinary
      const b64 = Buffer.from(file.buffer).toString('base64');
      let dataURI = "data:" + file.mimetype + ";base64," + b64;

      const uploadResponse = await cloudinary.uploader.upload(dataURI, {
        folder: 'avatars',
        public_id: `user_${userId}_avatar`,
        overwrite: true,
        resource_type: 'auto'
      });

      updates.push('avatar_url = ?');
      params.push(uploadResponse.secure_url);
    }

    if (updates.length === 0) {
      return res.json({ success: true, user: req.user });
    }

    params.push(userId);
    const stmt = db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...params);

    // Fetch updated user
    const userStmt = db.prepare('SELECT id, username, avatar_url, role FROM users WHERE id = ?');
    const updatedUser = userStmt.get(userId);

    res.json({ success: true, user: updatedUser });
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Follows
app.get('/api/follows', authenticateToken, (req: any, res) => {
  const stmt = db.prepare('SELECT * FROM follows WHERE user_id = ? ORDER BY created_at DESC');
  const follows = stmt.all(req.user.id);
  res.json(follows);
});

// Notifications
app.get('/api/notifications', authenticateToken, (req: any, res) => {
  try {
    const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/notifications/read', authenticateToken, (req: any, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Cron Check
const checkNewEpisodes = async () => {
  try {
    const response = await fetch('https://ophim1.com/danh-sach/phim-moi-cap-nhat');
    if (!response.ok) return;
    const data = await response.json();
    const latestMovies = data.items || [];
    const followedMovies = db.prepare('SELECT DISTINCT movie_slug FROM follows').all().map((r: any) => r.movie_slug);

    for (const movie of latestMovies) {
      if (followedMovies.includes(movie.slug)) {
        const detailRes = await fetch(`https://ophim1.com/phim/${movie.slug}`);
        if (!detailRes.ok) continue;
        const detailData = await detailRes.json();
        const currentEp = detailData.movie?.episode_current || 'Tập mới';
        const followers = db.prepare('SELECT * FROM follows WHERE movie_slug = ?').all(movie.slug);

        for (const follower of followers) {
          if (follower.latest_episode !== currentEp) {
            const message = `Phim ${follower.movie_name || detailData.movie.name} vừa cập nhật ${currentEp}!`;
            db.prepare('INSERT INTO notifications (user_id, movie_slug, movie_name, message) VALUES (?, ?, ?, ?)').run(
              follower.user_id, follower.movie_slug, follower.movie_name || detailData.movie.name, message
            );
            db.prepare('UPDATE follows SET latest_episode = ? WHERE id = ?').run(currentEp, follower.id);
          }
        }
      }
    }
  } catch (error) {
    console.error("Cron error:", error);
  }
};
setInterval(checkNewEpisodes, 5 * 60 * 1000);
setTimeout(checkNewEpisodes, 10000);

app.post('/api/follows', authenticateToken, (req: any, res) => {
  const { movie_slug, movie_name, poster_url } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO follows (user_id, movie_slug, movie_name, poster_url) VALUES (?, ?, ?, ?)');
    stmt.run(req.user.id, movie_slug, movie_name, poster_url);
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      // Already followed, maybe unfollow? Or just return success
      const del = db.prepare('DELETE FROM follows WHERE user_id = ? AND movie_slug = ?');
      del.run(req.user.id, movie_slug);
      return res.json({ success: true, action: 'unfollowed' });
    }
    res.status(500).json({ error: 'Database error' });
  }
});

// History
app.get('/api/history', authenticateToken, (req: any, res) => {
  const stmt = db.prepare('SELECT * FROM history WHERE user_id = ? ORDER BY updated_at DESC');
  const history = stmt.all(req.user.id);
  res.json(history);
});

app.get('/api/history/:slug', authenticateToken, (req: any, res) => {
  const { slug } = req.params;
  const stmt = db.prepare('SELECT * FROM history WHERE user_id = ? AND movie_slug = ?');
  const history = stmt.get(req.user.id, slug);
  if (history) {
    res.json(history);
  } else {
    res.status(404).json({ error: 'History not found' });
  }
});

app.post('/api/history', authenticateToken, (req: any, res) => {
  const { movie_slug, movie_name, poster_url, episode_slug, episode_name, timestamp, duration } = req.body;

  if (!movie_slug) {
    return res.status(400).json({ error: 'movie_slug is required' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO history (user_id, movie_slug, movie_name, poster_url, episode_slug, episode_name, timestamp, duration, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, movie_slug) DO UPDATE SET
        episode_slug = excluded.episode_slug,
        episode_name = excluded.episode_name,
        timestamp = excluded.timestamp,
        duration = excluded.duration,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(
      req.user.id,
      movie_slug,
      movie_name || null,
      poster_url || null,
      episode_slug || null,
      episode_name || null,
      timestamp || 0,
      duration || 0
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.delete('/api/history/:slug', authenticateToken, (req: any, res) => {
  const { slug } = req.params;
  try {
    const stmt = db.prepare('DELETE FROM history WHERE user_id = ? AND movie_slug = ?');
    stmt.run(req.user.id, slug);
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }

});

// Comments
app.get('/api/comments/:slug', (req, res) => {
  const { slug } = req.params;
  const stmt = db.prepare(`
    SELECT 
      c.id, c.content, c.image_url, c.created_at,
      u.username, u.avatar_url, u.role
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.movie_slug = ?
    ORDER BY c.created_at DESC
  `);
  const comments = stmt.all(slug);
  res.json(comments);
});

app.post('/api/comments', authenticateToken, upload.single('image'), async (req: any, res) => {
  const { movie_slug, content } = req.body;
  const file = req.file;

  if (!movie_slug || (!content && !file)) {
    return res.status(400).json({ error: 'Movie slug and content (or image) are required' });
  }

  try {
    let imageUrl = null;

    if (file) {
      const b64 = Buffer.from(file.buffer).toString('base64');
      let dataURI = "data:" + file.mimetype + ";base64," + b64;

      const uploadResponse = await cloudinary.uploader.upload(dataURI, {
        folder: 'comments',
        resource_type: 'auto'
      });
      imageUrl = uploadResponse.secure_url;
    }

    const stmt = db.prepare('INSERT INTO comments (user_id, movie_slug, content, image_url) VALUES (?, ?, ?, ?)');
    const info = stmt.run(req.user.id, movie_slug, content, imageUrl);

    const newCommentStmt = db.prepare(`
      SELECT 
        c.id, c.content, c.image_url, c.created_at,
        u.username, u.avatar_url, u.role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `);
    const newComment = newCommentStmt.get(info.lastInsertRowid);

    res.json(newComment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

app.delete('/api/comments/:id', authenticateToken, (req: any, res) => {
  const { id } = req.params;

  // Check if comment belongs to user
  const checkStmt = db.prepare('SELECT user_id FROM comments WHERE id = ?');
  const comment = checkStmt.get(id) as any;

  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const delStmt = db.prepare('DELETE FROM comments WHERE id = ?');
  delStmt.run(id);

  res.json({ success: true });
});

// Helper function to search movie APIs and resolve title to slug
async function findSlugForTitle(title: string): Promise<string | null> {
  const cleanTitle = title.replace(/\([^)]*\)/g, '').trim(); // Remove parenthesized content
  if (!cleanTitle || cleanTitle.length < 2) return null;

  const trySearch = async (keyword: string) => {
    // Try Ophim first
    try {
      const res = await fetch(`https://ophim1.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        const slug = data?.data?.items?.[0]?.slug;
        if (slug) return slug;
      }
    } catch (e) {
      console.warn("Ophim search fail:", e);
    }

    // Try KKPhim second
    try {
      const res = await fetch(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        const slug = data?.data?.items?.[0]?.slug;
        if (slug) return slug;
      }
    } catch (e) {
      console.warn("KKPhim search fail:", e);
    }

    // Try NguonC third
    try {
      const res = await fetch(`https://phim.nguonc.com/api/films/search?keyword=${encodeURIComponent(keyword)}`);
      if (res.ok) {
        const data = await res.json();
        const slug = data?.items?.[0]?.slug;
        if (slug) return slug;
      }
    } catch (e) {
      console.warn("NguonC search fail:", e);
    }

    return null;
  };

  // Try the full name first
  let slug = await trySearch(cleanTitle);
  if (slug) return slug;

  // If there's parenthesized content, let's also try searching with that content
  const parenMatch = title.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1]) {
    slug = await trySearch(parenMatch[1].trim());
    if (slug) return slug;
  }

  return null;
}

// NVIDIA NIM Chatbot API Endpoint
app.post('/api/ai/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return res.json({
      choices: [{
        message: {
          role: 'assistant',
          content: "Xin chào! Rất tiếc hệ thống chưa cấu hình biến `NVIDIA_API_KEY` trong file `.env`. Vui lòng thêm khóa để bắt đầu trò chuyện trực tiếp cùng trợ lý AI của PhimPhiếc nhé!"
        }
      }]
    });
  }

  try {
    const systemPrompt = {
      role: 'system',
      content: `Bạn là một trợ lý AI thông minh tư vấn và tìm phim siêu cấp trên nền tảng PhimPhiếc. 
Nhiệm vụ và các quy tắc BẮT BUỘC của bạn là:
1. Giao tiếp thân thiện, cởi mở, chuyên nghiệp bằng tiếng Việt.
2. Tư vấn, gợi ý các bộ phim hay dựa trên lịch sử xem, sở thích hoặc yêu cầu cụ thể của người dùng.
3. Khi người dùng hỏi hoặc bạn đề xuất phim, bạn BẮT BUỘC phải đặt tag đặc biệt \`[MOVIE:slug-phim]\` ngay phía sau tên phim khi giới thiệu bất kỳ phim nào. Hệ thống sẽ tự động chuyển đổi tag này thành một khung xem trước phim cực đẹp (embed phim) giúp người xem click vào xem ngay.
4. Slug của phim phải là slug viết thường, không dấu, ngăn cách bởi dấu gạch ngang (ví dụ: 'nguoi-than-yeu', 'mong-hoa-luc', 'tham-tu-lung-danh-conan', 'tran-tinh-lenh').
5. Tuyệt đối KHÔNG tự chế slug lung tung hoặc bỏ trống. Nếu bạn đề xuất phim, hãy cố gắng phán đoán hoặc tạo slug chuẩn xác nhất dựa trên tên tiếng Việt không dấu hoặc tên gốc tiếng Anh của phim. Ví dụ: "Vua Hải Tặc" -> [MOVIE:vua-hai-tac] hoặc [MOVIE:one-piece], "Mộng Hoa Lục" -> [MOVIE:mong-hoa-luc], "Conan" -> [MOVIE:tham-tu-lung-danh-conan] hoặc [MOVIE:conan], "Dữ Phượng Hành" -> [MOVIE:du-phuong-hanh].
6. Định dạng của thẻ tag BẮT BUỘC phải là: [MOVIE:slug-phim] (có thể viết thường là [movie:slug-phim], không bọc trong khối mã codeblock, không sử dụng markdown in đậm/in nghiêng bên trong tag).
VÍ DỤ CHỨ ĐỪNG LẤY LUÔN, NGƯỜI TA HỎI GÌ PHẢI TRẢ LỜI ĐÚNG: trả lời đúng tiêu chuẩn: "Nếu bạn thích phim tình cảm lãng mạn cổ trang, tôi đặc biệt đề xuất bộ phim Mộng Hoa Lục [MOVIE:mong-hoa-luc] với sự tham gia của Lưu Diệc Phi, hoặc bộ phim Dữ Phượng Hành [MOVIE:du-phuong-hanh] rất hấp dẫn!"`
    };

    const fewShotExamples = [
      {
        role: 'user',
        content: 'Tư vấn cho tôi vài bộ phim hoạt hình anime tình cảm học đường sâu sắc giống Clannad.'
      },
      {
        role: 'assistant',
        content: 'Chào bạn! Anime tình cảm học đường là một thể loại rất tuyệt vời. Nếu bạn yêu thích bộ phim Clannad [MOVIE:clannad] với câu chuyện đầy cảm động, bạn chắc chắn không nên bỏ qua các tác phẩm kinh điển và ngọt ngào sau:\n\n1. Toradora! [MOVIE:toradora] - Câu chuyện tình yêu học đường ngọt ngào và hài hước của Ryuji và Taiga.\n2. The Pet Girl of Sakurasou [MOVIE:the-pet-girl-of-sakurasou] (Mối Tình Ký Túc Xá Sakurasou) - Câu chuyện thanh xuân học đường đầy hoài bão và cảm xúc.\n3. Kimi no Todoke [MOVIE:kimi-no-todoke] (Gửi Đến Bạn Hiền) - Bộ phim học đường vô cùng nhẹ nhàng, đáng yêu và ấm áp.\n\nTất cả các phim này đều có trên PhimPhiếc, chúc bạn có những giây phút xem phim vui vẻ!'
      },
      {
        role: 'user',
        content: 'Tìm phim kiếm hiệp hay mới nhất.'
      },
      {
        role: 'assistant',
        content: 'Nếu bạn yêu thích thể loại kiếm hiệp cổ trang kỳ ảo, tôi đề xuất bộ phim cực hot Trần Tình Lệnh [MOVIE:tran-tinh-lenh] với nội dung sâu sắc và dàn diễn viên xuất sắc. Bên cạnh đó, bạn cũng có thể thưởng thức Mộng Hoa Lục [MOVIE:mong-hoa-luc] - một bộ phim cổ trang lãng mạn và đầy ý nghĩa!'
      }
    ];

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-8b-instruct',
        messages: [systemPrompt, ...fewShotExamples, ...messages],
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("NVIDIA NIM Error response:", errorText);
      return res.status(response.status).json({ error: `Nvidia API error: ${response.statusText}`, details: errorText });
    }

    const data = await response.json();
    let content = data?.choices?.[0]?.message?.content || '';

    // --- Dynamic Movie Tag Auto-Extraction & Injection ---
    const quoteRegex = /"([^"]+)"|'([^']+)'|“([^”]+)”|«([^»]+)»/g;
    let match;
    const foundTitles = new Set<string>();
    while ((match = quoteRegex.exec(content)) !== null) {
      const title = (match[1] || match[2] || match[3] || match[4] || '').trim();
      if (title.length >= 2 && title.length < 50) {
        foundTitles.add(title);
      }
    }

    if (foundTitles.size > 0) {
      for (const title of foundTitles) {
        const escapedTitle = title.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const tagRegex = new RegExp(`${escapedTitle}\\s*\\[(?:MOVIE|movie):[^\\]]+\\]`, 'i');
        if (!tagRegex.test(content)) {
          const resolvedSlug = await findSlugForTitle(title);
          if (resolvedSlug) {
            const quoteVariations = [
              `"${title}"`,
              `“${title}”`,
              `'${title}'`,
              `«${title}»`
            ];
            for (const variation of quoteVariations) {
              if (content.includes(variation)) {
                content = content.replace(variation, `${variation} [MOVIE:${resolvedSlug}]`);
              }
            }
          }
        }
      }
      if (data.choices?.[0]?.message) {
        data.choices[0].message.content = content;
      }
    }

    res.json(data);
  } catch (error: any) {
    console.error("Error in chatbot endpoint:", error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// Real AI Movie Recommendations Endpoint using NVIDIA NIM
app.post('/api/ai/recommendations', authenticateToken, async (req: any, res) => {
  const { candidates } = req.body;
  if (!candidates || !Array.isArray(candidates)) {
    return res.status(400).json({ error: 'Candidates array is required' });
  }

  const userId = req.user.id;
  try {
    // Retrieve user's watch history
    const historyList = db.prepare('SELECT movie_slug, movie_name FROM history WHERE user_id = ? ORDER BY updated_at DESC LIMIT 10').all(userId);

    if (historyList.length === 0) {
      return res.json({ success: false, error: 'no_history' });
    }

    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      // Fallback selection if API key is not configured
      return res.json({
        success: true,
        recommendations: candidates.slice(0, 8).map((c: any) => ({
          slug: c.slug,
          reason: `AI gợi ý phim ${c.year || ''}`
        }))
      });
    }

    const historyStr = historyList.map((h: any) => `- ${h.movie_name}`).join('\n');
    const candidatesStr = candidates.map((c: any) => `- [${c.slug}] ${c.name} (${c.origin_name || ''})`).join('\n');

    const prompt = `Bạn là một chuyên gia gợi ý phim AI sắc sảo trên nền tảng PhimPhiếc.
Lịch sử xem phim gần đây của người dùng:
${historyStr}

Danh sách phim ứng cử viên đang thịnh hành trên hệ thống:
${candidatesStr}

Nhiệm vụ bắt buộc của bạn:
1. Hãy lọc và chọn ra tối đa 8 bộ phim từ danh sách ứng cử viên trên mà bạn nhận thấy phù hợp nhất với gu và sở thích xem phim của người dùng dựa trên lịch sử xem của họ.
2. Với mỗi bộ phim được chọn, hãy cung cấp một lý do đề xuất cực kỳ ngắn gọn, hấp dẫn, mang tính thuyết phục cao (dưới 45 ký tự) bằng tiếng Việt.
3. Tuyệt đối chỉ được chọn phim có trong danh sách ứng cử viên được cung cấp bên trên. Không tự ý thêm phim ngoài danh sách này.

Trả về kết quả dưới dạng JSON duy nhất, có định dạng chính xác sau:
{
  "recommendations": [
    { "slug": "slug-phim-1", "reason": "Lý do đề xuất phim 1" },
    { "slug": "slug-phim-2", "reason": "Lý do đề xuất phim 2" }
  ]
}
Tuyệt đối không trả về bất kỳ văn bản giải thích hay lời mở đầu nào khác ngoài JSON trên.`;

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-8b-instruct',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      throw new Error(`NVIDIA NIM recommendations API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    
    // Extract JSON
    let jsonContent = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(jsonContent);
      return res.json({
        success: true,
        recommendations: parsed.recommendations || []
      });
    } catch (parseError) {
      console.error("Failed to parse AI recommendations JSON:", content);
      return res.json({
        success: true,
        recommendations: candidates.slice(0, 8).map((c: any) => ({
          slug: c.slug,
          reason: "AI gợi ý: Cực kỳ hấp dẫn và thịnh hành"
        }))
      });
    }

  } catch (error: any) {
    console.error("Error in AI recommendations endpoint:", error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// Helper to fetch metadata with fallback across three API sources
async function fetchMovieMeta(cleanSlug: string): Promise<{ name: string; episode_current?: string; content?: string; poster_url?: string; thumb_url?: string; source?: string } | null> {
  // Try Ophim first
  try {
    const res = await fetch(`https://ophim1.com/phim/${cleanSlug}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.movie) return { ...data.movie, source: 'ophim' };
    }
  } catch (e) {
    console.warn("Ophim meta fetch failed:", e);
  }

  // Try KKPhim second
  try {
    const res = await fetch(`https://phimapi.com/phim/${cleanSlug}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.movie) {
        const m = data.movie;
        const originalPoster = m.poster_url;
        const originalThumb = m.thumb_url;
        return {
          ...m,
          poster_url: originalThumb || originalPoster || '',
          thumb_url: originalPoster || originalThumb || '',
          source: 'kkphim'
        };
      }
    }
  } catch (e) {
    console.warn("KKPhim meta fetch failed:", e);
  }

  // Try NguonC third
  try {
    const res = await fetch(`https://phim.nguonc.com/api/film/${cleanSlug}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.movie) {
        const m = data.movie;
        return {
          name: m.name,
          episode_current: m.current_episode || '',
          content: m.description || m.content || '',
          poster_url: m.poster_url,
          thumb_url: m.thumb_url,
          source: 'nguonc'
        };
      }
    }
  } catch (e) {
    console.warn("NguonC meta fetch failed:", e);
  }

  return null;
}

// Helper function for Open Graph injection
async function injectMetaTags(template: string, slug: string, isWatchPage: boolean = false): Promise<string> {
  try {
    let cleanSlug = slug;
    let episodeNum = '';
    if (slug.includes('-tap-')) {
      const parts = slug.split('-tap-');
      cleanSlug = parts[0];
      episodeNum = parts[1];
    }

    const movie = await fetchMovieMeta(cleanSlug);
    if (movie) {
      let title = movie.name;
      if (isWatchPage && episodeNum) {
        title = `${movie.name} - Tập ${episodeNum}`;
      } else if (movie.episode_current) {
        title = `${movie.name} - ${movie.episode_current}`;
      }
      
      let description = (movie.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      description = description.length > 200 ? description.substring(0, 200) + '...' : description;
      
      let pUrl = movie.poster_url || movie.thumb_url || '';
      let imageUrl = pUrl;
      if (!pUrl.startsWith('http')) {
        const cleanUrl = pUrl.startsWith('/') ? pUrl.slice(1) : pUrl;
        if (movie.source === 'kkphim') {
          imageUrl = `https://phimimg.com/${cleanUrl}`;
        } else if (movie.source === 'nguonc') {
          imageUrl = `https://phim.nguonc.com/${cleanUrl}`;
        } else {
          imageUrl = `https://img.ophim.live/uploads/movies/${cleanUrl}`;
        }
      }

      let ogType = "website";
      let twitterCard = "summary_large_image";

      let newTemplate = template;
      newTemplate = newTemplate.replace(/<title>.*?<\/title>/, `<title>${title} - Phim Phiếc</title>`);
      newTemplate = newTemplate.replace(/<meta property="og:type" content=".*?" \/>/, `<meta property="og:type" content="${ogType}" />`);
      newTemplate = newTemplate.replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${title}" />`);
      newTemplate = newTemplate.replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${description}" />`);
      newTemplate = newTemplate.replace(/<meta property="og:image" content=".*?" \/>/, `<meta property="og:image" content="${imageUrl}" />`);

      newTemplate = newTemplate.replace(/<meta name="twitter:card" content=".*?" \/>/, `<meta name="twitter:card" content="${twitterCard}" />`);
      newTemplate = newTemplate.replace(/<meta name="twitter:title" content=".*?" \/>/, `<meta name="twitter:title" content="${title}" />`);
      newTemplate = newTemplate.replace(/<meta name="twitter:description" content=".*?" \/>/, `<meta name="twitter:description" content="${description}" />`);
      newTemplate = newTemplate.replace(/<meta name="twitter:image" content=".*?" \/>/, `<meta name="twitter:image" content="${imageUrl}" />`);

      return newTemplate;
    }
  } catch (err) {
    console.error(`Error fetching metadata for slug ${slug}:`, err);
  }
  return template;
}

// Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.get(['/movie/:slug', '/watch/:slug'], async (req, res, next) => {
      try {
        const url = req.originalUrl;
        const isWatchPage = url.startsWith('/watch');
        const slug = req.params.slug;
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        template = await injectMetaTags(template, slug, isWatchPage);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });

    app.use(vite.middlewares);
  } else {
    app.get(['/movie/:slug', '/watch/:slug'], async (req, res, next) => {
      try {
        const url = req.originalUrl;
        const isWatchPage = url.startsWith('/watch');
        const slug = req.params.slug;
        let template = fs.readFileSync(path.resolve(process.cwd(), 'dist/index.html'), 'utf-8');
        template = await injectMetaTags(template, slug, isWatchPage);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        next(e);
      }
    });

    // In production, serve static files from dist
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
