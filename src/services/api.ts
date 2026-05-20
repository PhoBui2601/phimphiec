import axios from 'axios';

export const getActiveSource = (): 'ophim' | 'kkphim' | 'nguonc' => {
  if (typeof window === 'undefined') return 'ophim';
  const source = localStorage.getItem('phimphiec_source');
  if (source === 'kkphim' || source === 'nguonc') return source;
  return 'ophim';
};

export const getMovieImageUrl = (url: string | undefined | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
  const source = getActiveSource();
  if (source === 'kkphim') return `https://phimimg.com/${cleanUrl}`;
  if (source === 'nguonc') return `https://phim.nguonc.com/${cleanUrl}`;
  return `https://img.ophim.live/uploads/movies/${cleanUrl}`; // Default Ophim
};

export const getBaseURL = () => {
  const source = getActiveSource();
  if (source === 'kkphim') return 'https://phimapi.com';
  if (source === 'nguonc') return 'https://phim.nguonc.com';
  return 'https://ophim1.com';
};

// Create axios instance with interceptor to update baseURL dynamically
export const api = axios.create();

api.interceptors.request.use((config) => {
  config.baseURL = getBaseURL();
  return config;
});

// Normalizer for poster_url vs thumb_url
export const normalizeMovie = (movie: any, source = getActiveSource()): any => {
  if (!movie) return movie;
  
  let normalized = { ...movie };
  
  // Normalized standard: poster_url is ALWAYS landscape banner, thumb_url is ALWAYS portrait poster.
  // Ophim: poster_url (landscape banner), thumb_url (portrait poster) => matches standard, do nothing.
  // NguonC: poster_url (landscape banner), thumb_url (portrait poster) => matches standard, do nothing.
  // KKPhim: poster_url (portrait poster), thumb_url (landscape banner) => swapped, so swap them.
  if (source === 'kkphim') {
    const originalPoster = movie.poster_url;
    const originalThumb = movie.thumb_url;
    normalized.poster_url = originalThumb || originalPoster || '';
    normalized.thumb_url = originalPoster || originalThumb || '';
  }
  
  return normalized;
};

// Normalizers for NguonC
const normalizeNguonCMovie = (movie: any) => {
  if (!movie) return null;
  return {
    ...movie,
    origin_name: movie.original_name || movie.origin_name || '',
    episode_current: movie.current_episode || movie.episode_current || '',
    episode_total: movie.total_episodes || movie.episode_total || '',
    lang: movie.language || movie.lang || '',
    year: movie.year || (movie.created ? new Date(movie.created).getFullYear() : 2026),
  };
};

const normalizeNguonCList = (data: any) => {
  if (!data) return { items: [] };
  const items = (data.items || data.films || []).map((item: any) => normalizeMovie(normalizeNguonCMovie(item), 'nguonc'));
  return {
    ...data,
    items,
  };
};

const normalizeNguonCDetail = (data: any) => {
  if (!data || !data.movie) return data;
  const movie = data.movie;
  
  // Normalize category
  let categoryArray: any[] = [];
  if (movie.category) {
    if (Array.isArray(movie.category)) {
      categoryArray = movie.category;
    } else if (typeof movie.category === 'object') {
      categoryArray = Object.entries(movie.category).map(([id, cat]: any) => ({
        id,
        name: cat.name,
        slug: cat.slug,
      }));
    }
  }

  // Normalize country
  let countryArray: any[] = [];
  if (movie.country) {
    if (Array.isArray(movie.country)) {
      countryArray = movie.country;
    } else if (typeof movie.country === 'object') {
      countryArray = Object.entries(movie.country).map(([id, c]: any) => ({
        id,
        name: c.name,
        slug: c.slug,
      }));
    }
  } else if (movie.quoc_gia) {
    if (typeof movie.quoc_gia === 'object') {
      countryArray = Object.entries(movie.quoc_gia).map(([id, c]: any) => ({
        id,
        name: c.name,
        slug: c.slug,
      }));
    }
  }

  const normalizedMovie = {
    ...movie,
    origin_name: movie.original_name || movie.origin_name || '',
    episode_current: movie.current_episode || movie.episode_current || '',
    episode_total: movie.total_episodes || movie.episode_total || '',
    lang: movie.language || movie.lang || '',
    content: movie.description || movie.content || '',
    year: movie.year || (movie.created ? new Date(movie.created).getFullYear() : 2026),
    category: categoryArray,
    country: countryArray.length > 0 ? countryArray : [{ name: 'N/A', slug: 'na' }],
  };

  // Normalize episodes
  const normalizedEpisodes = (movie.episodes || data.episodes || []).map((server: any) => ({
    server_name: server.server_name,
    server_data: (server.items || server.server_data || []).map((item: any) => ({
      name: item.name,
      slug: item.slug,
      filename: item.filename || `${movie.name} Tập ${item.name}`,
      link_embed: item.embed || item.link_embed || '',
      link_m3u8: item.m3u8 || item.link_m3u8 || '',
    })),
  }));

  return {
    status: true,
    movie: normalizedMovie,
    episodes: normalizedEpisodes,
  };
};

export const getNewMovies = async (page = 1) => {
  const source = getActiveSource();
  if (source === 'nguonc') {
    const response = await axios.get(`https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=${page}`);
    return normalizeNguonCList(response.data);
  }
  const response = await api.get(`/danh-sach/phim-moi-cap-nhat?page=${page}`);
  const data = response.data;
  if (data && data.items) {
    data.items = data.items.map((item: any) => normalizeMovie(item, source));
  }
  return data;
};

export const getMoviesByStatus = async (status: string, page = 1) => {
  const source = getActiveSource();
  
  if (source === 'nguonc') {
    let endpoint = `https://phim.nguonc.com/api/films/danh-sach/${status}?page=${page}`;
    if (status === 'phim-moi' || status === 'phim-moi-cap-nhat') {
      endpoint = `https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=${page}`;
    } else if (status === 'hoat-hinh') {
      endpoint = `https://phim.nguonc.com/api/films/the-loai/hoat-hinh?page=${page}`;
    }
    
    try {
      const response = await axios.get(endpoint);
      return normalizeNguonCList(response.data);
    } catch (error) {
      // Fallback
      const response = await axios.get(`https://phim.nguonc.com/api/films/the-loai/${status}?page=${page}`);
      return normalizeNguonCList(response.data);
    }
  }

  if (status === 'phim-moi' || status === 'phim-moi-cap-nhat') {
    const response = await api.get(`/danh-sach/phim-moi-cap-nhat?page=${page}`);
    const data = response.data;
    if (data && data.items) {
      data.items = data.items.map((item: any) => normalizeMovie(item, source));
    }
    return data; 
  }
  if (status === 'sap-chieu') {
    const response = await api.get(`/v1/api/danh-sach/phim-sap-chieu?page=${page}`);
    const data = response.data.data;
    if (data && data.items) {
      data.items = data.items.map((item: any) => normalizeMovie(item, source));
    }
    return data;
  }
  
  try {
    const response = await api.get(`/v1/api/danh-sach/${status}?page=${page}`);
    const data = response.data.data;
    if (data && data.items) {
      data.items = data.items.map((item: any) => normalizeMovie(item, source));
    }
    return data;
  } catch (error) {
    // Fallback if the endpoint is actually a genre (the-loai)
    const response = await api.get(`/v1/api/the-loai/${status}?page=${page}`);
    const data = response.data.data;
    if (data && data.items) {
      data.items = data.items.map((item: any) => normalizeMovie(item, source));
    }
    return data;
  }
};

export const getMoviesByGenre = async (slug: string, page = 1) => {
  const source = getActiveSource();
  if (source === 'nguonc') {
    const response = await axios.get(`https://phim.nguonc.com/api/films/the-loai/${slug}?page=${page}`);
    return normalizeNguonCList(response.data);
  }

  // Handle special cases where API treats genre as a list (danh-sach)
  if (slug === 'hoat-hinh' || slug === 'anime') {
    const response = await api.get(`/v1/api/danh-sach/hoat-hinh?page=${page}`);
    const data = response.data.data;
    if (data && data.items) {
      data.items = data.items.map((item: any) => normalizeMovie(item, source));
    }
    return data;
  }
  const response = await api.get(`/v1/api/the-loai/${slug}?page=${page}`);
  const data = response.data.data;
  if (data && data.items) {
    data.items = data.items.map((item: any) => normalizeMovie(item, source));
  }
  return data;
};

export const getMoviesByCountry = async (slug: string, page = 1) => {
  const source = getActiveSource();
  if (source === 'nguonc') {
    const response = await axios.get(`https://phim.nguonc.com/api/films/quoc-gia/${slug}?page=${page}`);
    return normalizeNguonCList(response.data);
  }

  const response = await api.get(`/v1/api/quoc-gia/${slug}?page=${page}`);
  const data = response.data.data;
  if (data && data.items) {
    data.items = data.items.map((item: any) => normalizeMovie(item, source));
  }
  return data;
};

export const getMovieDetail = async (slug: string) => {
  const activeSource = getActiveSource();
  const sources: ('ophim' | 'kkphim' | 'nguonc')[] = [activeSource];
  const allSources: ('ophim' | 'kkphim' | 'nguonc')[] = ['ophim', 'kkphim', 'nguonc'];
  allSources.forEach(s => {
    if (s !== activeSource) {
      sources.push(s);
    }
  });

  let lastError = null;
  for (const src of sources) {
    try {
      const data = await getMovieDetailFromSource(slug, src);
      if (data && data.movie) {
        return data;
      }
    } catch (err) {
      lastError = err;
      console.warn(`Failed to fetch movie detail for ${slug} from source ${src}:`, err);
    }
  }

  throw lastError || new Error(`Failed to load movie detail for slug ${slug} from any source`);
};

export const getMovieDetailFromSource = async (slug: string, source: 'ophim' | 'kkphim' | 'nguonc') => {
  if (source === 'nguonc') {
    const response = await axios.get(`https://phim.nguonc.com/api/film/${slug}`);
    return normalizeNguonCDetail(response.data);
  }
  
  const baseURL = source === 'kkphim' ? 'https://phimapi.com' : 'https://ophim1.com';
  const response = await axios.get(`${baseURL}/phim/${slug}`);
  const data = response.data;
  if (data && data.movie) {
    data.movie = normalizeMovie(data.movie, source);
  }
  return data;
};

export const searchMovies = async (keyword: string, limit: number = 24) => {
  const source = getActiveSource();
  if (source === 'nguonc') {
    const response = await axios.get(`https://phim.nguonc.com/api/films/search?keyword=${keyword}`);
    return {
      data: normalizeNguonCList(response.data)
    };
  }

  const response = await api.get(`/v1/api/tim-kiem?keyword=${keyword}&limit=${limit}`);
  const data = response.data;
  if (data && data.data && data.data.items) {
    data.data.items = data.data.items.map((item: any) => normalizeMovie(item, source));
  }
  return data;
};
