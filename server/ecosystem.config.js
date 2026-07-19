/**
 * PM2 Ecosystem File — Load-balanced cluster mode for production.
 *
 * Usage:
 *   pm2 start ecosystem.config.js          # Start cluster
 *   pm2 start ecosystem.config.js --env production
 *   pm2 reload ecosystem.config.js         # Zero-downtime reload
 *   pm2 logs brandos-api                   # View logs
 *   pm2 monit                             # Monitor
 *
 * Auto-scales to all available CPU cores by default.
 */
module.exports = {
  apps: [
    {
      name: 'brandos-api',
      script: 'src/index.js',

      // Cluster mode: one process per CPU core
      exec_mode: 'cluster',
      instances: process.env.PM2_INSTANCES || 'max', // 'max' = all CPUs

      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      time: true,

      // Process management
      max_restarts: 10,
      restart_delay: 5000,
      min_uptime: 10000,
      listen_timeout: 10000,
      kill_timeout: 5000,
      shutdown_with_message: true,

      // Watch & reload on file changes (dev only)
      watch: process.env.NODE_ENV !== 'production',
      ignore_watch: ['node_modules', 'logs', '.git'],

      // Resource limits
      max_memory_restart: process.env.MAX_MEMORY || '500M',

      // Graceful shutdown — PM2 will send SIGINT, which our app handles
      kill_signal: 'SIGINT',
    },
  ],
};
