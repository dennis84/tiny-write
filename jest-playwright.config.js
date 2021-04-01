module.exports = {
  launchOptions: {headless: false},
  serverOptions: {
    command: 'npm run web',
    port: 3000,
    usedPortAction: 'kill',
  },
}
