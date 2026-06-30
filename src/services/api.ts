import axios from 'axios';

// Detect if running inside a native mobile webview container
const isNativeMobile = window.location.hostname === 'localhost' && !window.location.port;

const api = axios.create({
  // 10.0.2.2 points securely from the internal Android container to your host machine IP
  baseURL: isNativeMobile 
    ? 'http://10.0.2.2:5000/api' 
    : 'http://localhost:5000/api', 
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('expense_tracker_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;