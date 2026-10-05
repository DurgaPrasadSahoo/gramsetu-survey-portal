import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gramsetu_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('gramsetu_token');
      localStorage.removeItem('gramsetu_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    // The developer has paused the portal — the session itself is still
    // valid, so don't log out, just park everyone else on a holding page.
    if (error.response?.status === 503 && !window.location.pathname.startsWith('/maintenance')) {
      window.location.href = '/maintenance';
    }
    return Promise.reject(error);
  }
);

export default api;
