module.exports = {
    apps : [{
      name: 'MyNestApp',
      script: 'dist/main.js',
      instances: 'max',
      exec_mode : 'cluster',
      wait_ready: true,
      listen_timeout: 50000,
      kill_timeout: 5000
    }]
  };
  