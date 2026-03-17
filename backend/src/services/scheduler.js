const cron = require('node-cron');
const db = require('../db');
const { sendTaskReminderEmail } = require('./email');

let currentJob = null;

function startScheduler() {
  scheduleFromSettings();
}

function scheduleFromSettings() {
  // Cancel existing job
  if (currentJob) {
    currentJob.stop();
    currentJob = null;
  }

  const timeSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('send_time');
  const time = timeSetting ? timeSetting.value : '09:00';
  const [hours, minutes] = time.split(':');

  // Schedule cron job: "MM HH * * *" = every day at HH:MM
  const cronExpr = `${parseInt(minutes)} ${parseInt(hours)} * * *`;
  console.log(`Scheduler: Daily email scheduled at ${time} (cron: ${cronExpr})`);

  currentJob = cron.schedule(cronExpr, () => {
    sendDailyEmail();
  });
}

async function sendDailyEmail() {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const tasks = db.prepare('SELECT * FROM tasks WHERE send_date = ?').all(today);

    if (tasks.length === 0) {
      console.log(`Scheduler: No tasks for ${today}, skipping email.`);
      return;
    }

    const recipientsSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('recipients');
    const recipients = recipientsSetting ? JSON.parse(recipientsSetting.value) : [];

    if (recipients.length === 0) {
      console.log('Scheduler: No recipients configured, skipping email.');
      return;
    }

    await sendTaskReminderEmail(recipients, tasks);
    console.log(`Scheduler: Sent reminder for ${tasks.length} tasks to ${recipients.length} recipients.`);
  } catch (err) {
    console.error('Scheduler: Failed to send daily email:', err.message);
  }
}

module.exports = { startScheduler, scheduleFromSettings };
