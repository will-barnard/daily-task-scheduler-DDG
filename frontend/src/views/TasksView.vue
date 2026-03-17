<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <h1>Tasks</h1>
      <button class="btn btn-primary" @click="showForm = !showForm">
        {{ showForm ? 'Cancel' : '+ New Task' }}
      </button>
    </div>

    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="success" class="alert alert-success">{{ success }}</div>

    <!-- New Task Form -->
    <div v-if="showForm" class="card">
      <h2>{{ editingTask ? 'Edit Task' : 'New Task Reminder' }}</h2>
      <form @submit.prevent="handleSave">
        <div class="form-group">
          <label for="title">Title</label>
          <input id="title" v-model="form.title" type="text" required placeholder="Task title" />
        </div>
        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description" v-model="form.description" placeholder="Optional description"></textarea>
        </div>
        <div class="form-group">
          <label for="send_date">Send Date</label>
          <input id="send_date" v-model="form.send_date" type="date" required />
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'Saving...' : (editingTask ? 'Update' : 'Create Task') }}
          </button>
          <button v-if="editingTask" type="button" class="btn btn-secondary" @click="cancelEdit">Cancel</button>
        </div>
      </form>
    </div>

    <!-- Tasks Table -->
    <div class="card">
      <p v-if="loading" style="color: #6b7280;">Loading tasks...</p>
      <p v-else-if="!tasks.length" style="color: #6b7280;">No tasks yet. Create your first task reminder.</p>
      <table v-else>
        <thead>
          <tr>
            <th>Title</th>
            <th>Description</th>
            <th>Send Date</th>
            <th>Created By</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="task in tasks" :key="task.id" :class="{ 'past-task': isPast(task.send_date) }">
            <td>{{ task.title }}</td>
            <td>{{ task.description || '—' }}</td>
            <td>{{ task.send_date }}</td>
            <td>{{ task.created_by_name }}</td>
            <td>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary btn-sm" @click="startEdit(task)">Edit</button>
                <button class="btn btn-danger btn-sm" @click="deleteTask(task.id)">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../api';

const tasks = ref([]);
const loading = ref(true);
const showForm = ref(false);
const saving = ref(false);
const error = ref('');
const success = ref('');
const editingTask = ref(null);

const form = ref({
  title: '',
  description: '',
  send_date: '',
});

function clearMessages() {
  setTimeout(() => {
    error.value = '';
    success.value = '';
  }, 3000);
}

async function loadTasks() {
  try {
    const { data } = await api.get('/tasks');
    tasks.value = data;
  } catch {
    error.value = 'Failed to load tasks';
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  saving.value = true;
  error.value = '';
  try {
    if (editingTask.value) {
      await api.put(`/tasks/${editingTask.value.id}`, form.value);
      success.value = 'Task updated';
    } else {
      await api.post('/tasks', form.value);
      success.value = 'Task created';
    }
    resetForm();
    await loadTasks();
    clearMessages();
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to save task';
  } finally {
    saving.value = false;
  }
}

function startEdit(task) {
  editingTask.value = task;
  form.value = { title: task.title, description: task.description, send_date: task.send_date };
  showForm.value = true;
}

function cancelEdit() {
  resetForm();
}

function resetForm() {
  form.value = { title: '', description: '', send_date: '' };
  editingTask.value = null;
  showForm.value = false;
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  try {
    await api.delete(`/tasks/${id}`);
    success.value = 'Task deleted';
    await loadTasks();
    clearMessages();
  } catch {
    error.value = 'Failed to delete task';
  }
}

function isPast(dateStr) {
  return dateStr < new Date().toISOString().split('T')[0];
}

onMounted(loadTasks);
</script>

<style scoped>
.past-task {
  opacity: 0.5;
}
</style>
