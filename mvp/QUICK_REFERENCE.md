# Quick Reference - Project Checks & Commands

## 🔍 Check Project Flow

### 1. TypeScript Type Checking
```bash
npm run type-check
# Verifies all TypeScript types are correct
```

### 2. Code Quality (ESLint)
```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
```

### 3. Code Formatting
```bash
npm run format        # Format all files
npm run format:check  # Check formatting only
```

### 4. Run Development Server
```bash
npm run dev
# Opens at http://localhost:3000
```

### 5. Build Production
```bash
npm run build
# Creates optimized production build
```

## 📋 Health Check Workflow

```bash
# Complete check (run in order):
npm run type-check && npm run lint && npm run format:check && npm run build
```

## 🚨 If Issues Found

1. **Type Errors**: Check TypeScript configuration
2. **Lint Errors**: Run `npm run lint:fix`
3. **Format Issues**: Run `npm run format`
4. **Build Errors**: Check imports and dependencies

## ✅ Success Indicators

- ✅ TypeScript compilation succeeds
- ✅ ESLint has minimal errors/warnings
- ✅ Code is formatted consistently
- ✅ Build completes successfully
- ✅ Dev server starts without errors
