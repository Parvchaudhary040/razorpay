module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.spec.ts'],
  moduleNameMapper: {
    '^@commerce-ai/shared$': '<rootDir>/../../packages/shared/dist',
    '^@commerce-ai/database$': '<rootDir>/../../packages/database/dist'
  }
};
