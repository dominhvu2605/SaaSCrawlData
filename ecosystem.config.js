module.exports = {
  apps: [
    {
      name: 'crawdata-web',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      cwd: '/var/www/crawler',
      node_args: '--env-file=.env',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'crawdata-worker',
      script: 'node_modules/.bin/tsx',
      args: 'scripts/worker.js',
      cwd: '/var/www/crawler',
      node_args: '--env-file=.env',
      env: { NODE_ENV: 'production' },
    },
  ],
}