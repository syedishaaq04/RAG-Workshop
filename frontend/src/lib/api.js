import axios from 'axios';

// In dev: VITE_API_URL is empty, so relative URLs work via the Vite proxy (vite.config.js)
// In production: set VITE_API_URL=https://your-backend.onrender.com in your frontend's env vars
const BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: BASE_URL,
});

// Automatically attach the JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
