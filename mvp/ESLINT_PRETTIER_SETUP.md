# ESLint + Prettier + Husky Setup

## Overview
Comprehensive linting and code quality setup for React + TypeScript + Tailwind CSS project with pre-commit hooks.

## Installed Packages

### ESLint & Related Plugins
- `eslint` (v8.57.0) - Main linting tool
- `@typescript-eslint/parser` - TypeScript parser for ESLint
- `@typescript-eslint/eslint-plugin` - TypeScript-specific rules
- `eslint-plugin-react` - React-specific rules
- `eslint-plugin-react-hooks` - React Hooks rules
- `eslint-plugin-jsx-a11y` - Accessibility rules
- `eslint-config-prettier` - Disables conflicting Prettier rules
- `eslint-plugin-prettier` - Runs Prettier as ESLint rule

### Prettier & Tailwind
- `prettier` (v3.6.2) - Code formatter
- `prettier-plugin-tailwindcss` - Tailwind class sorting

### Git Hooks
- `husky` (v9.1.7) - Git hooks manager
- `lint-staged` (v16.2.6) - Run linters on staged files

## NPM Scripts

```bash
# Run ESLint
npm run lint

# Run ESLint with auto-fix
npm run lint:fix

# Run Prettier formatting
npm run format

# Check formatting without fixing
npm run format:check

# Run TypeScript type checking
npm run type-check
```

## How It Works

### Pre-commit Hook
1. When you commit code, Husky runs the pre-commit hook
2. Lint-staged runs on staged files only
3. ESLint autofixes issues and formats code
4. If there are unfixable errors, commit is blocked

### Editor Integration
- VSCode automatically formats code on save
- ESLint shows inline errors and warnings
- Auto-fixes are applied on save

## Configuration Files

- `.eslintrc.json` - ESLint rules for TypeScript, React, Accessibility
- `.prettierrc` - Prettier configuration with Tailwind plugin
- `.lintstagedrc.json` - Files to lint on pre-commit
- `.husky/pre-commit` - Pre-commit hook script
- `.vscode/settings.json` - VSCode workspace settings
- `.vscode/extensions.json` - Recommended extensions

## Summary

✅ **ESLint**: TypeScript, React, Accessibility rules  
✅ **Prettier**: Auto-formatting with Tailwind sorting  
✅ **Husky**: Pre-commit hooks  
✅ **VSCode**: Editor integration  
✅ **Git**: Automated quality checks
