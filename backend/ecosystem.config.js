module.exports = {
  apps: [{
    name: 'calorie-tracker-api',
    script: 'server.js',
    cwd: '/var/www/calorie-tracker/backend',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: '/var/www/calorie-tracker/backend/logs/combined.log',
    out_file: '/var/www/calorie-tracker/backend/logs/out.log',
    error_file: '/var/www/calorie-tracker/backend/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z'
  }]
};