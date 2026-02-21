module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.tsx', '**/*.spec.tsx'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          jsx: 'react',
          baseUrl: '.',
          paths: {
            '../../types': ['./src/types'],
            '../../database': ['./src/database'],
            '../types': ['./src/types'],
            '../database': ['./src/database'],
            '../protocols': ['./src/protocols']
          }
        }
      }
    ]
  },
  moduleDirectories: ['node_modules', '<rootDir>'],
  moduleNameMapper: {
    '^react-native-sqlite-storage$': '<rootDir>/__mocks__/react-native-sqlite-storage.js',
    '^@rnmapbox/maps$': '<rootDir>/__mocks__/@rnmapbox/maps.js',
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.tsx',
    '!src/**/*.spec.tsx',
  ],
  coverageDirectory: 'coverage',
  verbose: true
};
