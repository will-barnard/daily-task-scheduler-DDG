const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL || 'noreply@drugansdrums.com';

async function sendTaskReminderEmail(recipients, tasks) {
  if (!recipients.length || !tasks.length) return;

  const taskListHtml = tasks
    .map(
      (t) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong>${escapeHtml(t.title)}</strong>
          ${t.description ? `<br><span style="color: #6b7280;">${escapeHtml(t.description)}</span>` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; white-space: nowrap;">${t.send_date}</td>
      </tr>`
    )
    .join('');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1f2937;">Daily Task Reminder</h2>
      <p style="color: #4b5563;">You have <strong>${tasks.length}</strong> task${tasks.length > 1 ? 's' : ''} scheduled for today:</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 12px; text-align: left;">Task</th>
            <th style="padding: 12px; text-align: left;">Date</th>
          </tr>
        </thead>
        <tbody>
          ${taskListHtml}
        </tbody>
      </table>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">Sent by Daily Task Scheduler</p>
    </div>
  `;

  await resend.emails.send({
    from: `Daily Task Scheduler <${FROM}>`,
    to: recipients,
    subject: `Task Reminder - ${tasks.length} task${tasks.length > 1 ? 's' : ''} for today`,
    html,
  });
}

async function sendTestEmail(recipients) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1f2937;">Test Email</h2>
      <p style="color: #4b5563;">This is a test email from the Daily Task Scheduler.</p>
      <p style="color: #4b5563;">If you received this, your email configuration is working correctly!</p>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">Sent by Daily Task Scheduler</p>
    </div>
  `;

  await resend.emails.send({
    from: `Daily Task Scheduler <${FROM}>`,
    to: recipients,
    subject: 'Test Email - Daily Task Scheduler',
    html,
  });
}

function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(str).replace(/[&<>"']/g, (c) => map[c]);
}

module.exports = { sendTaskReminderEmail, sendTestEmail };
