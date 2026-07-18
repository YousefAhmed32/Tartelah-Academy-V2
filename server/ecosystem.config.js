module.exports = {
  apps: [
    {
      name: 'tartelah-api',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      // All secrets (MONGO_URI, JWT_*, SMTP_*, etc.) come from server/.env via
      // dotenv, loaded at the top of server.js — never hardcode them here.
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      time: true,
    },
  ],
}
