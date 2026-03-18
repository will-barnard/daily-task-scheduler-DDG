<template>
  <div>
    <h1 style="margin-bottom: 8px;">Daily Roundup</h1>
    <p style="color: #6b7280; font-size: 14px; margin-bottom: 24px;">
      Check off tasks as you complete them.
    </p>

    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
      <input type="date" v-model="date" class="date-input" @change="loadTasks" />
    </div>

    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="loading" class="card" style="color: #6b7280;">Loading...</div>

    <div v-else-if="!regularTasks.length && !shopifyTasks.length" class="card">
      <p style="color: #6b7280;">No tasks scheduled for this date.</p>
    </div>

    <template v-else>
      <!-- Progress -->
      <div class="card progress-card">
        <div class="progress-label">{{ doneCount }} / {{ total }} completed</div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: progressPct + '%' }"></div>
        </div>
      </div>

      <!-- Regular tasks -->
      <div v-if="regularTasks.length" style="margin-top: 20px;">
        <h2 class="section-heading">Tasks</h2>
        <div class="card task-list">
          <div
            v-for="task in regularTasks"
            :key="task.id"
            class="roundup-row"
            :class="{ done: task.done, 'in-progress': task.in_progress && !task.done }"
            @click="toggle(task)"
          >
            <input type="checkbox" :checked="!!task.done" @click.stop="toggle(task)" />
            <div class="roundup-text">
              <div class="roundup-title">{{ task.title }}</div>
              <div v-if="task.description" class="roundup-desc">{{ task.description }}</div>
              <span v-if="task.in_progress && !task.done" class="in-progress-badge">
                In progress · {{ task.claimed_by_name }}
              </span>
            </div>
            <button
              class="btn btn-sm claim-btn"
              :class="{ 'claim-btn-active': task.in_progress }"
              @click.stop="claimTask(task)"
            >{{ task.in_progress ? 'Unclaim' : 'In Progress' }}</button>
          </div>
        </div>
      </div>

      <!-- Shopify tasks -->
      <div v-if="shopifyTasks.length" style="margin-top: 20px;">
        <h2 class="section-heading">Shopify Listings</h2>
        <div class="card task-list">
          <div
            v-for="task in shopifyTasks"
            :key="task.id"
            class="roundup-row"
            :class="{ done: task.done, 'in-progress': task.in_progress && !task.done }"
            @click="toggle(task)"
          >
            <input type="checkbox" :checked="!!task.done" @click.stop="toggle(task)" />
            <div class="roundup-text">
              <div class="roundup-title">{{ task.title }}</div>
              <div v-if="task.description" class="roundup-desc">{{ task.description }}</div>
              <span v-if="task.in_progress && !task.done" class="in-progress-badge">
                In progress · {{ task.claimed_by_name }}
              </span>
              <a
                v-if="task.product_url"
                :href="task.product_url"
                target="_blank"
                rel="noopener"
                class="roundup-link"
                @click.stop
              >Open in Shopify →</a>
            </div>
            <button
              class="btn btn-sm claim-btn"
              :class="{ 'claim-btn-active': task.in_progress }"
              @click.stop="claimTask(task)"
            >{{ task.in_progress ? 'Unclaim' : 'In Progress' }}</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import api from '../api';

const route = useRoute();
const auth = useAuthStore();

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

const date = ref(route.query.date || todayStr());
const tasks = ref([]);
const loading = ref(true);
const error = ref('');

const regularTasks = computed(() => tasks.value.filter((t) => !t.product_url));
const shopifyTasks = computed(() => tasks.value.filter((t) => t.product_url));
const total = computed(() => tasks.value.length);
const doneCount = computed(() => tasks.value.filter((t) => t.done).length);
const progressPct = computed(() => (total.value ? Math.round((doneCount.value / total.value) * 100) : 0));

async function loadTasks() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get(`/tasks/by-date/${date.value}`);
    // Normalise SQLite integer booleans
    tasks.value = data.map((t) => ({ ...t, done: !!t.done, in_progress: !!t.in_progress }));
  } catch {
    error.value = 'Failed to load tasks';
  } finally {
    loading.value = false;
  }
}

async function claimTask(task) {
  const newInProgress = !task.in_progress;
  const prevInProgress = task.in_progress;
  const prevName = task.claimed_by_name;

  // Optimistic update
  task.in_progress = newInProgress;
  task.claimed_by_name = newInProgress ? auth.user?.name : null;

  try {
    await api.patch(`/tasks/${task.id}/in-progress`, { in_progress: newInProgress });
  } catch {
    task.in_progress = prevInProgress;
    task.claimed_by_name = prevName;
    error.value = 'Failed to update task';
  }
}

async function toggle(task) {
  const newDone = !task.done;
  task.done = newDone; // optimistic
  try {
    await api.patch(`/tasks/${task.id}/done`, { done: newDone });
  } catch {
    task.done = !newDone; // revert on failure
    error.value = 'Failed to update task';
  }
}

onMounted(loadTasks);
</script>

<style scoped>
.date-input {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #1f2937;
  background: white;
}

.progress-card {
  padding: 16px 20px;
}

.progress-label {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 8px;
}

.progress-track {
  height: 8px;
  background: #e5e7eb;
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #2563eb;
  border-radius: 9999px;
  transition: width 0.3s ease;
}

.section-heading {
  font-size: 15px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 10px;
}

.task-list {
  padding: 0;
  overflow: hidden;
}

.roundup-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background 0.15s;
}

.roundup-row:last-child {
  border-bottom: none;
}

.roundup-row:hover {
  background: #f9fafb;
}

.roundup-row input[type='checkbox'] {
  margin-top: 3px;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  cursor: pointer;
  accent-color: #2563eb;
}

.roundup-text {
  flex: 1;
}

.roundup-title {
  font-size: 15px;
  font-weight: 500;
  color: #1f2937;
  transition: color 0.15s;
}

.roundup-desc {
  font-size: 13px;
  color: #6b7280;
  margin-top: 2px;
}

.roundup-link {
  font-size: 13px;
  color: #2563eb;
  text-decoration: none;
  margin-top: 4px;
  display: inline-block;
}

.roundup-link:hover {
  text-decoration: underline;
}

.roundup-row.done .roundup-title {
  color: #9ca3af;
  text-decoration: line-through;
}

.roundup-row.done .roundup-desc {
  color: #d1d5db;
}

.roundup-row.in-progress {
  background: #fffbeb;
}

.in-progress-badge {
  display: inline-block;
  margin-top: 4px;
  padding: 1px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: #fef3c7;
  color: #92400e;
}

.claim-btn {
  flex-shrink: 0;
  align-self: center;
  font-size: 12px;
  padding: 4px 10px;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
}

.claim-btn:hover {
  background: #f9fafb;
}

.claim-btn-active {
  border-color: #f59e0b;
  background: #fef3c7;
  color: #92400e;
}

.claim-btn-active:hover {
  background: #fde68a;
}
</style>
