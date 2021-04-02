module.exports = {
  launchOptions: {headless: true},
  serverOptions: {
    command: 'npm run web',
    port: 3000,
    usedPortAction: 'kill',
  },
}
