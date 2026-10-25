// Conquest — the production front door.
//
// Serves src/server.ts (the exchange). CDHQ Agent Valuation integrated.
// Same shape as the WardByWard ecosystem.

module.exports = {
  apps: [
    {
      name: 'conquest-venue',
      script: 'bun',
      args: 'src/server.ts --port 3500',
      interpreter: 'none',
      cwd: __dirname,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      max_memory_restart: '320M',
      kill_timeout: 8000,
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: '3500',
      },
    },
  ],
}
