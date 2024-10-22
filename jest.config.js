/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  testPathIgnorePatterns: ['<rootDir>/dist/'],
  setupFilesAfterEnv: ["jest-expect-message"],
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  },
};
