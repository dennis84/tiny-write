module.exports = {
  bail: 1,
  collectCoverageFrom: ['**/*.ts', '!**/*.d.ts'],
  transform: {
    '\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['**/test/*.test.ts'],
  modulePathIgnorePatterns: ['dist'],
}
