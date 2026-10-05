'use strict';

// PM2 process manager config: `npx pm2 start ecosystem.config.js`
// Keep instances at 1 while data lives in memory - each extra process would have its own copy.
// Once MongoDB is added, change to instances: 'max' with exec_mode: 'cluster'.
module.exports = {
  apps: [
    {
      name: 'taskdesk-api',
      script: 'src/server.js',
      instances: 1,
      env: { NODE_ENV: 'production' }
    }
  ]
};
