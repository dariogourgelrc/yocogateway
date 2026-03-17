import type { Config } from "jest";

const config: Config = {
  projects: [
    {
      displayName: "unit",
      testEnvironment: "jsdom",
      testMatch: [
        "<rootDir>/src/lib/**/*.test.ts",
        "<rootDir>/src/components/**/*.test.tsx",
      ],
      transform: {
        "^.+\\.tsx?$": [
          "ts-jest",
          { tsconfig: "tsconfig.test.json" },
        ],
      },
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "^nanoid$": "<rootDir>/src/__mocks__/nanoid.ts",
      },
      setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
      transformIgnorePatterns: [
        "node_modules/(?!(slugify)/)",
      ],
    },
    {
      displayName: "api",
      testEnvironment: "node",
      testMatch: [
        "<rootDir>/src/app/api/**/*.test.ts",
      ],
      transform: {
        "^.+\\.tsx?$": [
          "ts-jest",
          { tsconfig: "tsconfig.json" },
        ],
      },
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "^nanoid$": "<rootDir>/src/__mocks__/nanoid.ts",
      },
      transformIgnorePatterns: [
        "node_modules/(?!(slugify)/)",
      ],
    },
  ],
};

export default config;
