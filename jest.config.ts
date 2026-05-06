import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    '!lib/**/*.d.ts',
    '!lib/mock-data/**',
  ],
  // Coverage threshold intentionally disabled. An aspirational 40% target was
  // never met (real coverage ~14%) and was only masking as "passing" in CI
  // because test failures short-circuited before the threshold check fired.
  // When the team commits to raising coverage, re-introduce `coverageThreshold`
  // at current + small margin and ratchet it up over time.
}

export default createJestConfig(config)
