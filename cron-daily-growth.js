// cron-daily-growth.js
// Triggers POST /api/cron/daily-growth using environment URL if provided.

const fetchFn = (typeof fetch !== 'undefined') ? fetch : require('node-fetch');

const API_URL =
  process.env.RENDER_EXTERNAL_URL
    ? `${process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '')}/api/cron/daily-growth`
    : process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/cron/daily-growth`
      : 'http://localhost:5000/api/cron/daily-growth';

(async function runDailyGrowth() {
  try {
    console.log('Starting daily growth process...');
    console.log('Calling:', API_URL);

    const response = await fetchFn(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    const data = await response.json();
    console.log('Daily growth completed successfully:', data);
  } catch (err) {
    console.error('Daily growth failed:', err.message);
    process.exit(1);
  }
})();
