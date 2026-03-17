<template>
  <div class="login-wrapper">
    <div class="card login-card">
      <h2>Create Your Account</h2>
      <p class="subtitle">You've been invited to join the Daily Task Scheduler</p>

      <div v-if="error" class="alert alert-error">{{ error }}</div>
      <div v-if="success" class="alert alert-success">{{ success }}</div>

      <div v-if="!validToken && !loading" class="alert alert-error">
        Invalid or expired invite link.
      </div>

      <form v-if="validToken" @submit.prevent="handleRegister">
        <div class="form-group">
          <label>Email</label>
          <input :value="inviteEmail" disabled />
        </div>
        <div class="form-group">
          <label for="name">Name</label>
          <input id="name" v-model="name" type="text" required placeholder="Your name" />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input id="password" v-model="password" type="password" required placeholder="At least 6 characters" />
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%" :disabled="submitting">
          {{ submitting ? 'Creating account...' : 'Create Account' }}
        </button>
      </form>

      <p style="text-align: center; margin-top: 16px; font-size: 14px;">
        <router-link to="/login" style="color: #2563eb;">Back to login</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api';

const route = useRoute();
const router = useRouter();

const inviteEmail = ref('');
const name = ref('');
const password = ref('');
const error = ref('');
const success = ref('');
const loading = ref(true);
const validToken = ref(false);
const submitting = ref(false);

onMounted(async () => {
  const token = route.query.token;
  if (!token) {
    loading.value = false;
    return;
  }
  try {
    const { data } = await api.get(`/auth/invite/${token}`);
    inviteEmail.value = data.email;
    validToken.value = true;
  } catch {
    validToken.value = false;
  } finally {
    loading.value = false;
  }
});

async function handleRegister() {
  error.value = '';
  submitting.value = true;
  try {
    await api.post('/auth/register', {
      token: route.query.token,
      name: name.value,
      password: password.value,
    });
    success.value = 'Account created! Redirecting to login...';
    setTimeout(() => router.push('/login'), 2000);
  } catch (err) {
    error.value = err.response?.data?.error || 'Registration failed';
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.login-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

.login-card {
  width: 100%;
  max-width: 400px;
}

.login-card h2 {
  text-align: center;
  margin-bottom: 4px;
}

.subtitle {
  text-align: center;
  color: #6b7280;
  font-size: 14px;
  margin-bottom: 24px;
}
</style>
