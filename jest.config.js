module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/apps/*/tests/**/*.test.ts', '<rootDir>/apps/*/tests/**/*.spec.ts'],
  moduleNameMapper: {
    '^@commerce-ai/shared$': '<rootDir>/packages/shared/dist/index.js',
    '^@commerce-ai/database$': '<rootDir>/packages/database/dist/index.js'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/apps/api/tsconfig.test.json'
    }]
  }
};
