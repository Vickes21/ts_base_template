module.exports = {
  apps: [{
    name: 'graph_api',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'cluster',
    node_args: '--env-file=.env',
    env: {
      NODE_ENV: 'production'
    },
    watch: false,
    time: true,
    merge_logs: true,
    kill_timeout: 3000
  }]
}