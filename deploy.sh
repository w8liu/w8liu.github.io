#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Checkout to main branch
git checkout main

# Build the project
npm run build

# Ask for the commit message for the first commit
read -p "Enter commit message for main branch: " commit_message

# Stage changes and commit
git add .
git commit -m "$commit_message"
git push origin main

# Prepare for deployment
mkdir -p ../temp_gh_pages
cp -r dist/* ../temp_gh_pages/

# Checkout to gh-pages branch
git checkout gh-pages

# Clean up the current gh-pages directory
rm -rf *

# Copy the built files to the gh-pages branch
cp -r ../temp_gh_pages/* .

# Ask for confirmation to push to gh-pages
read -p "Do you want to push to gh-pages? (y/n): " confirm_push

if [[ "$confirm_push" == "y" || "$confirm_push" == "Y" ]]; then
    # Stage changes and commit
    git add .
    git commit -m "Deploy to gh-pages"
    git push origin gh-pages
else
    echo "Skipping push to gh-pages."
fi

# Clean up temporary files
rm -rf ../temp_gh_pages

# Checkout back to main branch
git checkout main