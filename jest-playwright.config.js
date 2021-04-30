module.exports = {
  launchOptions: {headless: process.env.CI === 'true'},
  serverOptions: {
    command: 'npm run web',
    port: 3000,
    usedPortAction: 'kill',
  },
}
