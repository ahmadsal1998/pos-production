#!/bin/bash

# Sync and push to GitHub
# This will merge remote changes and push your local commits

cd "$(dirname "$0")"

echo "🔄 Fetching latest changes from GitHub..."
git fetch origin main

echo ""
echo "📊 Current status:"
echo "Local commits to push:"
git log --oneline origin/main..HEAD 2>/dev/null || echo "  (checking...)"

echo ""
echo "Remote commits to merge:"
git log --oneline HEAD..origin/main 2>/dev/null || echo "  (none)"

echo ""
echo "🔄 Merging remote changes..."
git pull origin main --no-rebase --no-edit

echo ""
echo "📤 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Done! Your project is now on GitHub."
echo "🔗 https://github.com/ahmadsal1998/pos-production"
