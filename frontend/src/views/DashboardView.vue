<template>
  <div>
    <h1 style="margin-bottom: 24px;">Dashboard</h1>

    <div class="card">
      <h2>Welcome, {{ auth.user?.name }}</h2>
      <p style="color: #6b7280; margin-top: 8px;">
        Role: <strong>{{ auth.user?.role === 'superadmin' ? 'Super Admin' : 'User' }}</strong>
      </p>
    </div>

    <div class="stats-grid">
      <div class="card stat-card">
        <div class="stat-number">{{ todayTasks.length }}</div>
        <div class="stat-label">Tasks Today</div>
      </div>
      <div class="card stat-card">
        <div class="stat-number">{{ upcomingTasks.length }}</div>
        <div class="stat-label">Upcoming Tasks</div>
      </div>
      <div class="card stat-card">
        <div class="stat-number">{{ recipientCount }}</div>
        <div class="stat-label">Recipients</div>
      </div>
    </div>

    <div class="card" v-if="todayTasks.length">
      <h2>Today's Tasks</h2>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="task in todayTasks" :key="task.id">
            <td>{{ task.title }}</td>
            <td>{{ task.description || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import api from '../api';

const auth = useAuthStore();
const tasks = ref([]);
const recipientCount = ref(0);

const today = new Date().toISOString().split('T')[0];

const todayTasks = computed(() => tasks.value.filter((t) => t.send_date === today));
const upcomingTasks = computed(() => tasks.value.filter((t) => t.send_date > today));

onMounted(async () => {
  try {
    const [tasksRes, settingsRes] = await Promise.all([
      api.get('/tasks'),
      api.get('/settings'),
    ]);
    tasks.value = tasksRes.data;
    const recipients = JSON.parse(settingsRes.data.recipients || '[]');
    recipientCount.value = recipients.length;
  } catch {
    // Silently handle – data will just show 0
  }
});
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  text-align: center;
  padding: 24px;
}

.stat-number {
  font-size: 36px;
  font-weight: 700;
  color: #2563eb;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  margin-top: 4px;
}
</style>
