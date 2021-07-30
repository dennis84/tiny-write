module.exports = {
  preset: 'jest-playwright-preset',
  bail: 1,
  collectCoverageFrom: ['**/*.ts', '!**/*.d.ts'],
  transform: {
    '\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['**/test/integration/*.test.ts'],
  modulePathIgnorePatterns: ['dist'],
}
