/**
 * PM2 Ecosystem Configuration
 * Ensures the worker process runs continuously and auto-restarts
 * 
 * Install PM2: npm install -g pm2
 * Start: pm2 start ecosystem.config.js
 * Stop: pm2 stop all
 * Status: pm2 status
 * Logs: pm2 logs
 */

module.exports = {
  apps: [
    {
      name: 'oblicore-worker',
      script: 'npm',
      args: 'run worker',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};





