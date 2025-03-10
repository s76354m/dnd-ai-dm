# Configuration Files

This directory contains configuration files for the D&D AI Dungeon Master project. This document provides an overview of all configuration files in the project, including those in the root directory.

## TypeScript Configuration

### `tsconfig.json` (Root)
- Main TypeScript configuration for the project
- Specifies compilation options, output directory, and module resolution
- Used for building the production version of the application

### `tsconfig.test.json` (Root)
- TypeScript configuration specifically for tests
- Extends the main `tsconfig.json`
- Relaxes certain type constraints to make testing easier:
  - Disables `noImplicitAny`
  - Disables `strict` mode
  - Disables `strictNullChecks`
  - Disables `strictPropertyInitialization`
- Adds Jest and Node types

## Jest Configuration

### `jest.config.js` (Root)
- Main Jest configuration file
- Configures TypeScript support via ts-jest
- Sets up test patterns, module resolution, and test environment
- Performs full type checking during tests

### `jest.skip-typecheck.config.js` (Root)
- Alternative Jest configuration that skips type checking
- Uses `isolatedModules: true` to bypass type checking for faster test execution
- Useful during development for quicker feedback
- Otherwise identical to `jest.config.js`

## Environment Configuration

### `.env.example` (Root)
- Template for environment variables
- Contains placeholders for API keys and configuration values
- Should be copied to `.env` and customized

### `.env` (Root)
- Local environment configuration (not version controlled)
- Contains API keys and other sensitive configuration
- Used at runtime by the application

## Test Scripts

### `test-character-creation.js` (Root)
- Standalone test script for the character creation system
- Compiles TypeScript code and runs specific tests
- Can be executed directly: `node test-character-creation.js`

## Other Configuration

### `config/*.json`
- Additional configuration files for specific features
- Each file contains settings for a particular subsystem

## Usage Guidelines

1. **For Development:**
   - Use `tsconfig.json` for compiling code
   - Use `jest.skip-typecheck.config.js` for faster tests during development

2. **For Production:**
   - Ensure all tests pass with the standard configuration (`jest.config.js`)
   - Use the main TypeScript configuration for building

3. **For Environment Setup:**
   - Copy `.env.example` to `.env`
   - Update values in `.env` with your actual API keys

## Adding New Configuration

When adding new configuration files:

1. Follow the naming convention of existing files
2. Document the purpose of the configuration in this README
3. Provide example values where appropriate
4. Ensure sensitive values are not committed to the repository 