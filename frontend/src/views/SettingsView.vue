<template>
  <div>
    <h1 style="margin-bottom: 24px;">Settings</h1>

    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="success" class="alert alert-success">{{ success }}</div>

    <!-- Recipients -->
    <div class="card">
      <h2>Email Recipients</h2>
      <p style="color: #6b7280; font-size: 14px; margin-bottom: 16px;">
        These email addresses will receive task reminders.
      </p>

      <div class="recipient-list">
        <div v-for="(r, i) in recipients" :key="i" class="recipient-row">
          <input v-model="recipients[i]" type="email" placeholder="email@example.com" />
          <button class="btn btn-danger btn-sm" @click="removeRecipient(i)">Remove</button>
        </div>
      </div>

      <div style="display: flex; gap: 8px; margin-top: 12px;">
        <button class="btn btn-secondary" @click="addRecipient">+ Add Recipient</button>
        <button class="btn btn-primary" @click="saveRecipients" :disabled="savingRecipients">
          {{ savingRecipients ? 'Saving...' : 'Save Recipients' }}
        </button>
      </div>
    </div>

    <!-- Send Time (Super Admin Only) -->
    <div v-if="auth.isSuperAdmin" class="card">
      <h2>Daily Send Time</h2>
      <p style="color: #6b7280; font-size: 14px; margin-bottom: 16px;">
        The time and timezone the reminder email will be sent each day.
      </p>
      <div style="display: flex; gap: 8px; align-items: end; flex-wrap: wrap;">
        <div class="form-group" style="margin-bottom: 0;">
          <label style="display:block; font-size:13px; color:#6b7280; margin-bottom:4px;">Time</label>
          <input v-model="sendTime" type="time" />
        </div>
        <div class="form-group" style="margin-bottom: 0; min-width: 260px;">
          <label style="display:block; font-size:13px; color:#6b7280; margin-bottom:4px;">Timezone</label>
          <select v-model="sendTimezone">
            <optgroup v-for="group in timezoneGroups" :key="group.label" :label="group.label">
              <option v-for="tz in group.zones" :key="tz.value" :value="tz.value">
                {{ tz.label }}
              </option>
            </optgroup>
          </select>
        </div>
        <button class="btn btn-primary" style="align-self: end;" @click="saveSendTime" :disabled="savingTime">
          {{ savingTime ? 'Saving...' : 'Save Time' }}
        </button>
      </div>
    </div>

    <!-- Test Email -->
    <div class="card">
      <h2>Test Email</h2>
      <p style="color: #6b7280; font-size: 14px; margin-bottom: 16px;">
        Send a test email to all configured recipients to verify the email setup.
      </p>
      <button class="btn btn-primary" @click="sendTestEmail" :disabled="sendingTest">
        {{ sendingTest ? 'Sending...' : 'Send Test Email' }}
      </button>
    </div>

    <!-- Invite User (Super Admin Only) -->
    <div v-if="auth.isSuperAdmin" class="card">
      <h2>Invite User</h2>
      <p style="color: #6b7280; font-size: 14px; margin-bottom: 16px;">
        Generate a signup link for a new user.
      </p>
      <div style="display: flex; gap: 8px; align-items: end;">
        <div class="form-group" style="margin-bottom: 0; flex: 1;">
          <input v-model="inviteEmail" type="email" placeholder="user@example.com" />
        </div>
        <button class="btn btn-primary" @click="createInvite" :disabled="inviting">
          {{ inviting ? 'Creating...' : 'Create Invite' }}
        </button>
      </div>
      <div v-if="inviteLink" class="invite-link-box">
        <p style="font-size: 13px; font-weight: 500; margin-bottom: 4px;">Share this link:</p>
        <code>{{ inviteLink }}</code>
        <button class="btn btn-secondary btn-sm" style="margin-top: 8px;" @click="copyLink">Copy</button>
      </div>
    </div>

    <!-- Users List (Super Admin Only) -->
    <div v-if="auth.isSuperAdmin" class="card">
      <h2>Users</h2>
      <table v-if="users.length">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.role === 'superadmin' ? 'Super Admin' : 'User' }}</td>
            <td>{{ user.created_at?.split('T')[0] || user.created_at }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else style="color: #6b7280;">No users found.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import api from '../api';

const auth = useAuthStore();

const recipients = ref([]);
const sendTime = ref('09:00');
const sendTimezone = ref(Intl.DateTimeFormat().resolvedOptions().timeZone);
const inviteEmail = ref('');

// Grouped IANA timezone list
const timezoneGroups = [
  {
    label: 'United States',
    zones: [
      { value: 'America/New_York',    label: 'Eastern Time (ET)' },
      { value: 'America/Chicago',     label: 'Central Time (CT)' },
      { value: 'America/Denver',      label: 'Mountain Time (MT)' },
      { value: 'America/Phoenix',     label: 'Mountain Time - Arizona (no DST)' },
      { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
      { value: 'America/Anchorage',   label: 'Alaska Time (AKT)' },
      { value: 'Pacific/Honolulu',    label: 'Hawaii Time (HT)' },
    ],
  },
  {
    label: 'Europe',
    zones: [
      { value: 'UTC',                   label: 'UTC' },
      { value: 'Europe/London',         label: 'London (GMT/BST)' },
      { value: 'Europe/Paris',          label: 'Central European (CET/CEST)' },
      { value: 'Europe/Helsinki',       label: 'Eastern European (EET/EEST)' },
      { value: 'Europe/Moscow',         label: 'Moscow (MSK)' },
    ],
  },
  {
    label: 'Asia & Pacific',
    zones: [
      { value: 'Asia/Dubai',      label: 'Gulf Standard Time (GST)' },
      { value: 'Asia/Karachi',    label: 'Pakistan (PKT)' },
      { value: 'Asia/Kolkata',    label: 'India (IST)' },
      { value: 'Asia/Dhaka',      label: 'Bangladesh (BST)' },
      { value: 'Asia/Bangkok',    label: 'Indochina (ICT)' },
      { value: 'Asia/Singapore',  label: 'Singapore/Malaysia (SGT)' },
      { value: 'Asia/Shanghai',   label: 'China (CST)' },
      { value: 'Asia/Tokyo',      label: 'Japan (JST)' },
      { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
      { value: 'Pacific/Auckland', label: 'New Zealand (NZST/NZDT)' },
    ],
  },
  {
    label: 'Americas',
    zones: [
      { value: 'America/Toronto',         label: 'Toronto (ET)' },
      { value: 'America/Vancouver',       label: 'Vancouver (PT)' },
      { value: 'America/Mexico_City',     label: 'Mexico City (CST/CDT)' },
      { value: 'America/Bogota',          label: 'Colombia (COT)' },
      { value: 'America/Lima',            label: 'Peru (PET)' },
      { value: 'America/Santiago',        label: 'Chile (CLT/CLST)' },
      { value: 'America/Sao_Paulo',       label: 'Brazil - São Paulo (BRT/BRST)' },
      { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (ART)' },
    ],
  },
  {
    label: 'Africa',
    zones: [
      { value: 'Africa/Cairo',        label: 'Egypt (EET)' },
      { value: 'Africa/Johannesburg', label: 'South Africa (SAST)' },
      { value: 'Africa/Lagos',        label: 'West Africa (WAT)' },
      { value: 'Africa/Nairobi',      label: 'East Africa (EAT)' },
    ],
  },
];
const inviteLink = ref('');
const users = ref([]);

const error = ref('');
const success = ref('');
const savingRecipients = ref(false);
const savingTime = ref(false);
const sendingTest = ref(false);
const inviting = ref(false);

function clearMessages() {
  setTimeout(() => {
    error.value = '';
    success.value = '';
  }, 3000);
}

async function loadSettings() {
  try {
    const { data } = await api.get('/settings');
    recipients.value = JSON.parse(data.recipients || '[]');
    if (recipients.value.length === 0) recipients.value = [''];
    sendTime.value = data.send_time || '09:00';
    if (data.send_timezone) sendTimezone.value = data.send_timezone;
  } catch {
    error.value = 'Failed to load settings';
  }
}

async function loadUsers() {
  if (!auth.isSuperAdmin) return;
  try {
    const { data } = await api.get('/auth/users');
    users.value = data;
  } catch {
    // Not critical
  }
}

function addRecipient() {
  recipients.value.push('');
}

function removeRecipient(i) {
  recipients.value.splice(i, 1);
  if (recipients.value.length === 0) recipients.value = [''];
}

async function saveRecipients() {
  savingRecipients.value = true;
  error.value = '';
  try {
    const filtered = recipients.value.filter((r) => r.trim());
    await api.put('/settings/recipients', { recipients: filtered });
    success.value = 'Recipients saved';
    clearMessages();
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to save recipients';
  } finally {
    savingRecipients.value = false;
  }
}

async function saveSendTime() {
  savingTime.value = true;
  error.value = '';
  try {
    await api.put('/settings/send-time', { time: sendTime.value, timezone: sendTimezone.value });
    success.value = 'Send time updated';
    clearMessages();
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to save time';
  } finally {
    savingTime.value = false;
  }
}

async function sendTestEmail() {
  sendingTest.value = true;
  error.value = '';
  try {
    await api.post('/settings/test-email');
    success.value = 'Test email sent!';
    clearMessages();
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to send test email';
  } finally {
    sendingTest.value = false;
  }
}

async function createInvite() {
  if (!inviteEmail.value) return;
  inviting.value = true;
  error.value = '';
  inviteLink.value = '';
  try {
    const { data } = await api.post('/auth/invite', { email: inviteEmail.value });
    inviteLink.value = data.link;
    inviteEmail.value = '';
    success.value = 'Invite created';
    await loadUsers();
    clearMessages();
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to create invite';
  } finally {
    inviting.value = false;
  }
}

function copyLink() {
  navigator.clipboard.writeText(inviteLink.value);
  success.value = 'Link copied to clipboard';
  clearMessages();
}

onMounted(() => {
  loadSettings();
  loadUsers();
});
</script>

<style scoped>
.recipient-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recipient-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.recipient-row input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.invite-link-box {
  margin-top: 16px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.invite-link-box code {
  display: block;
  word-break: break-all;
  font-size: 13px;
  color: #2563eb;
}
</style>
