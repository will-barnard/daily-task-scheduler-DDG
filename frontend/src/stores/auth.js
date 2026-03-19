import { defineStore } from 'pinia';
import api from '../api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    loaded: false,
  }),
  getters: {
    isLoggedIn: (state) => !!state.user,
    isSuperAdmin: (state) => state.user?.role === 'superadmin',
  },
  actions: {
    async fetchUser() {
      try {
        const { data } = await api.get('/auth/me');
        this.user = data;
      } catch {
        this.user = null;
      } finally {
        this.loaded = true;
      }
    },
    logout() {
      this.user = null;
      // Redirect to brew-auth login after clearing state
      window.location.href = 'https://auth.drugansdrums.com/login?return_url=' + encodeURIComponent(window.location.origin);
    },
  },
});
