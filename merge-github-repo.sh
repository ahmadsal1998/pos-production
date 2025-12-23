#!/bin/bash

# Safe GitHub Repository Merge Script
# This script helps merge files from a GitHub repository into your local project

set -e  # Exit on error

echo "=== Safe GitHub Repository Merge ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

# Show current status
echo -e "${YELLOW}Current Git Status:${NC}"
git status
echo ""

# Show current remotes
echo -e "${YELLOW}Current Remotes:${NC}"
git remote -v
echo ""

# Ask user which scenario
echo "Select merge scenario:"
echo "1) Merge from a different GitHub repository (provide URL)"
echo "2) Update from current origin (pull latest changes)"
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    # Scenario A: Different repository
    read -p "Enter GitHub repository URL: " repo_url
    read -p "Enter a name for this remote (default: github-source): " remote_name
    remote_name=${remote_name:-github-source}
    
    echo -e "${YELLOW}Adding remote repository...${NC}"
    git remote add "$remote_name" "$repo_url" 2>/dev/null || {
        echo -e "${YELLOW}Remote '$remote_name' already exists. Updating URL...${NC}"
        git remote set-url "$remote_name" "$repo_url"
    }
    
    echo -e "${YELLOW}Fetching from $remote_name...${NC}"
    git fetch "$remote_name"
    
    echo -e "${YELLOW}Available branches in $remote_name:${NC}"
    git branch -r | grep "$remote_name"
    echo ""
    
    read -p "Enter branch name to merge (default: main): " branch_name
    branch_name=${branch_name:-main}
    
    echo -e "${YELLOW}Merging $remote_name/$branch_name into current branch...${NC}"
    git merge "$remote_name/$branch_name" --no-ff -m "Merge from $remote_name/$branch_name"
    
elif [ "$choice" = "2" ]; then
    # Scenario B: Update from origin
    echo -e "${YELLOW}Pulling latest changes from origin...${NC}"
    git pull origin main
    
else
    echo -e "${RED}Invalid choice${NC}"
    exit 1
fi

# Check for conflicts
if [ -n "$(git ls-files -u)" ]; then
    echo -e "${RED}⚠️  MERGE CONFLICTS DETECTED!${NC}"
    echo ""
    echo "Conflicted files:"
    git diff --name-only --diff-filter=U
    echo ""
    echo -e "${YELLOW}To resolve conflicts:${NC}"
    echo "1. Open the conflicted files"
    echo "2. Look for conflict markers: <<<<<<<, =======, >>>>>>>"
    echo "3. Edit files to resolve conflicts"
    echo "4. Run: git add <resolved-files>"
    echo "5. Run: git commit"
    echo ""
    echo -e "${YELLOW}To abort merge:${NC}"
    echo "git merge --abort"
else
    echo -e "${GREEN}✅ Merge completed successfully!${NC}"
    echo ""
    echo -e "${YELLOW}Recent commits:${NC}"
    git log --oneline -5
fi

