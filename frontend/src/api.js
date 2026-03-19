import axios from 'axios';

const AUTH_LOGIN_URL = 'https://auth.drugansdrums.com/login';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Redirect to brew-auth login, with return_url so it sends us back
      const returnUrl = window.location.href;
      window.location.href = `${AUTH_LOGIN_URL}?return_url=${encodeURIComponent(returnUrl)}`;
    }
    return Promise.reject(err);
  }
);

export default api;
