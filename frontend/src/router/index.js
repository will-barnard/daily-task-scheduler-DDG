import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue'),
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: () => import('../views/TasksView.vue'),
  },
  {
    path: '/inbox',
    name: 'Inbox',
    component: () => import('../views/InboxView.vue'),
  },
  {
    path: '/roundup',
    name: 'Roundup',
    component: () => import('../views/RoundupView.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore();
  if (!auth.loaded) {
    await auth.fetchUser();
  }
  if (!auth.isLoggedIn) {
    // api.js interceptor will redirect on 401, but guard here as a fallback
    window.location.href = 'https://auth.drugansdrums.com/login?return_url=' + encodeURIComponent(window.location.href);
    return;
  }
  next();
});

export default router;
