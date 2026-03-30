<template>
  <div class="auth-container">
    <div class="auth-card">
      <h1>Daily Task Scheduler</h1>
      <h2>Create Account</h2>

      <div v-if="error" class="alert alert-error">{{ error }}</div>

      <form @submit.prevent="handleSignup">
        <div class="form-group">
          <label>Name</label>
          <input v-model="name" type="text" placeholder="Your name" required />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input v-model="email" type="email" placeholder="you@example.com" required />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="password" type="password" placeholder="••••••••" required />
        </div>
        <button type="submit" class="btn btn-primary btn-block" :disabled="loading || !token">
          {{ loading ? 'Creating account...' : 'Create Account' }}
        </button>
      </form>

      <p v-if="!token" class="token-warning">
        A valid invite link is required to register.
      </p>

      <p style="margin-top: 16px; text-align: center; font-size: 14px; color: #6b7280;">
        Already have an account? <router-link to="/login">Sign in</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const name = ref('');
const email = ref('');
const password = ref('');
const token = ref('');
const error = ref('');
const loading = ref(false);

onMounted(() => {
  token.value = route.query.token || '';
});

async function handleSignup() {
  error.value = '';
  loading.value = true;
  try {
    const { data } = await (await import('../api')).default.post('/auth/register', {
      name: name.value,
      email: email.value,
      password: password.value,
      token: token.value,
    });
    auth.token = data.token;
    auth.user = data.user;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    router.push('/');
  } catch (err) {
    error.value = err.response?.data?.error || 'Registration failed';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
}

.auth-card {
  background: white;
  border-radius: 12px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
}

.auth-card h1 {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}

.auth-card h2 {
  font-size: 15px;
  font-weight: 400;
  color: #6b7280;
  margin-bottom: 28px;
}

.btn-block {
  width: 100%;
  margin-top: 8px;
}

.token-warning {
  margin-top: 12px;
  font-size: 13px;
  color: #ef4444;
  text-align: center;
}
</style>
