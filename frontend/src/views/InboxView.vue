<template>
  <div>
    <h1 style="margin-bottom: 8px;">Shopify Flow Inbox</h1>
    <p style="color: #6b7280; font-size: 14px; margin-bottom: 24px;">
      Incoming listings from Shopify Flow. Approve to schedule a task reminder, or dismiss to ignore.
    </p>

    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="success" class="alert alert-success">{{ success }}</div>

    <div v-if="loading" class="card" style="color: #6b7280;">Loading...</div>

    <div v-else-if="!items.length" class="card">
      <p style="color: #6b7280;">No items in the inbox. Incoming Shopify Flow requests will appear here.</p>
    </div>

    <div v-else>
      <div v-for="item in items" :key="item.id" class="card inbox-card">
        <div class="inbox-header">
          <div>
            <div class="inbox-product-name">{{ item.product_name }}</div>
            <div class="inbox-meta">
              Received {{ formatDate(item.received_at) }}
              <span v-if="item.condition" class="condition-badge">{{ item.condition }}</span>
            </div>
            <a v-if="item.product_url" :href="item.product_url" target="_blank" rel="noopener" class="inbox-edit-link">
              Open in Shopify →
            </a>
          </div>
          <button class="btn btn-danger btn-sm" @click="dismiss(item.id)">Dismiss</button>
        </div>

        <!-- Approval Form -->
        <div class="approve-form">
          <div class="form-row">
            <div class="form-group" style="flex: 1;">
              <label>Task Title</label>
              <input v-model="drafts[item.id].title" type="text" />
            </div>
          </div>

          <div class="form-group">
            <label>Description</label>
            <textarea v-model="drafts[item.id].description"></textarea>
          </div>

          <div class="form-group">
            <label>Send Reminder</label>
            <div class="time-buttons">
              <button
                v-for="preset in presets"
                :key="preset.label"
                class="btn btn-secondary"
                :class="{ active: drafts[item.id].activePreset === preset.label }"
                @click="applyPreset(item.id, preset)"
              >
                {{ preset.label }}
              </button>
              <button
                class="btn btn-secondary"
                :class="{ active: drafts[item.id].activePreset === 'custom' }"
                @click="drafts[item.id].activePreset = 'custom'"
              >
                Custom
              </button>
            </div>
            <input
              v-if="drafts[item.id].activePreset === 'custom'"
              v-model="drafts[item.id].send_date"
              type="date"
              style="margin-top: 8px; width: 200px;"
            />
            <div v-else-if="drafts[item.id].send_date" style="margin-top: 6px; font-size: 13px; color: #6b7280;">
              Scheduled for: <strong>{{ drafts[item.id].send_date }}</strong>
            </div>
          </div>

          <button
            class="btn btn-primary"
            :disabled="!drafts[item.id].send_date || approving[item.id]"
            @click="approve(item.id)"
          >
            {{ approving[item.id] ? 'Scheduling...' : 'Approve & Schedule' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import api from '../api';

const items = ref([]);
const drafts = reactive({});
const approving = reactive({});
const loading = ref(true);
const error = ref('');
const success = ref('');

const presets = [
  { label: '1 Month',  months: 1 },
  { label: '3 Months', months: 3 },
  { label: '6 Months', months: 6 },
];

function clearMessages() {
  setTimeout(() => { error.value = ''; success.value = ''; }, 3000);
}

function addMonths(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

function daysSince(dateStr) {
  const ms = Date.now() - new Date(dateStr + 'Z').getTime();
  const days = Math.floor(ms / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

function formatDate(dateStr) {
  return new Date(dateStr + 'Z').toLocaleString();
}

function initDraft(item) {
  const age = daysSince(item.received_at);
  drafts[item.id] = {
    title: item.product_name,
    description: `change price, listing was made ${formatDate(item.received_at)}`,
    send_date: '',
    activePreset: null,
  };
}

function applyPreset(id, preset) {
  drafts[id].activePreset = preset.label;
  drafts[id].send_date = addMonths(preset.months);
}

async function loadItems() {
  loading.value = true;
  try {
    const { data } = await api.get('/inbox');
    items.value = data;
    for (const item of data) {
      if (!drafts[item.id]) initDraft(item);
    }
  } catch {
    error.value = 'Failed to load inbox';
  } finally {
    loading.value = false;
  }
}

async function dismiss(id) {
  if (!confirm('Dismiss this item? It will not become a task.')) return;
  try {
    await api.delete(`/inbox/${id}`);
    items.value = items.value.filter((i) => i.id !== id);
    success.value = 'Item dismissed';
    clearMessages();
  } catch {
    error.value = 'Failed to dismiss item';
  }
}

async function approve(id) {
  approving[id] = true;
  error.value = '';
  try {
    await api.post(`/inbox/${id}/approve`, {
      title: drafts[id].title,
      description: drafts[id].description,
      send_date: drafts[id].send_date,
    });
    items.value = items.value.filter((i) => i.id !== id);
    success.value = 'Task scheduled!';
    clearMessages();
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to approve item';
  } finally {
    approving[id] = false;
  }
}

onMounted(loadItems);
</script>

<style scoped>
.inbox-card {
  margin-bottom: 20px;
}

.inbox-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.inbox-product-name {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.inbox-meta {
  font-size: 13px;
  color: #9ca3af;
  margin-bottom: 4px;
}

.inbox-edit-link {
  font-size: 13px;
  color: #2563eb;
  text-decoration: none;
}

.inbox-edit-link:hover {
  text-decoration: underline;
}

.condition-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 1px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: #fef3c7;
  color: #92400e;
}

.approve-form {
  border-top: 1px solid #e5e7eb;
  padding-top: 16px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.time-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.time-buttons .btn.active {
  background: #2563eb;
  color: white;
}
</style>
