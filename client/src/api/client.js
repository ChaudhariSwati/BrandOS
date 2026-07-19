import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Track if we're already refreshing to avoid infinite loops
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

// Check if current session is a demo session
function isDemoSession() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return !!user.isDemo;
  } catch {
    return false;
  }
}

// Demo mode URL rewrites — maps regular endpoints to demo endpoints
const DEMO_REWRITES = [
  { from: '/orgs/current', to: '/demo/org' },
  { from: '/orgs/stats', to: '/demo/stats' },
  { from: '/orgs/members', to: '/demo/members' },
  { from: '/brandkits', to: '/demo/brandkits' },
  { from: '/assets', to: '/demo/assets' },
];

// Attach access token to every request; rewrite URLs in demo mode
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Rewrite URL for demo mode
  if (isDemoSession()) {
    const fullPath = config.url;
    for (const rule of DEMO_REWRITES) {
      if (fullPath === rule.from || fullPath.startsWith(rule.from + '/')) {
        config.url = rule.to;
        break;
      }
    }
  }

  return config;
});

// Handle 401 — attempt silent refresh, fall back to logout
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (
      err.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/signup')
    ) {
      return Promise.reject(err);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err2) => Promise.reject(err2));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );

      const { accessToken } = data;
      localStorage.setItem('accessToken', accessToken);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      processQueue(null, accessToken);

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);

      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
