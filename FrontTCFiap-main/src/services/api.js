import axios from 'axios';

// O endereço pode ser substituído em produção com VITE_API_URL.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3003',
  timeout: 10000, 
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url === '/login';
    if (error.response?.status === 401 && !isLoginRequest && localStorage.getItem('authToken')) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

export default api;