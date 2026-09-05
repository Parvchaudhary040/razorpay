const fs = require('fs');
const content = module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setupEnv.js'],
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.spec.ts'],
  moduleNameMapper: {
    '^@commerce-ai/shared$': '<rootDir>/../../packages/shared/dist',
    '^@commerce-ai/database$': '<rootDir>/../../packages/database/dist',
    '^@commerce-ai/catalog$': '<rootDir>/../../packages/catalog/dist',
    '^@commerce-ai/cart$': '<rootDir>/../../packages/cart/dist',
    '^@commerce-ai/tools$': '<rootDir>/../../packages/tools/dist',
    '^@commerce-ai/ai$': '<rootDir>/../../packages/ai/dist'
  }
};
;
fs.writeFileSync('C:/Users/mrabh/OneDrive/Desktop/razorpay/apps/api/jest.config.js', content);