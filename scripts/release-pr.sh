#!/bin/bash

# Exit on error
set -e

# Function to print colored output
print_info() {
    echo -e "\033[0;36m$1\033[0m"
}

print_success() {
    echo -e "\033[0;32m$1\033[0m"
}

print_error() {
    echo -e "\033[0;31m$1\033[0m"
}

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    print_error "GitHub CLI (gh) is not installed. Please install it first:"
    echo "  brew install gh"
    exit 1
fi

# Check if authenticated with GitHub
if ! gh auth status &> /dev/null; then
    print_error "Not authenticated with GitHub. Please run:"
    echo "  gh auth login"
    exit 1
fi

# Get release type from argument
RELEASE_TYPE=$1

if [ -z "$RELEASE_TYPE" ]; then
    print_error "Please specify release type: patch, minor, or major"
    echo "Usage: npm run release:patch|minor|major"
    exit 1
fi

# Validate release type
if [ "$RELEASE_TYPE" != "patch" ] && [ "$RELEASE_TYPE" != "minor" ] && [ "$RELEASE_TYPE" != "major" ]; then
    print_error "Invalid release type: $RELEASE_TYPE"
    echo "Valid types: patch, minor, major"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    print_error "You have uncommitted changes. Please commit or stash them first."
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
print_info "Current version: $CURRENT_VERSION"

# Create release branch
BRANCH_NAME="release-$RELEASE_TYPE-$(date +%Y%m%d-%H%M%S)"
print_info "Creating release branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME"

# Bump version
print_info "Bumping $RELEASE_TYPE version..."
npm version "$RELEASE_TYPE" --no-git-tag-version

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
print_success "New version: $NEW_VERSION"

# Commit version bump
git add package.json package-lock.json
git commit -m "chore: release v$NEW_VERSION"

# Push branch to remote
print_info "Pushing branch to remote..."
git push -u origin "$BRANCH_NAME"

# Create pull request
print_info "Creating pull request..."
PR_TITLE="Release v$NEW_VERSION"
PR_BODY="## 🚀 Release v$NEW_VERSION

This PR bumps the version from $CURRENT_VERSION to $NEW_VERSION ($RELEASE_TYPE release).

### Checklist
- [ ] All tests pass
- [ ] Changelog updated (if applicable)
- [ ] Documentation updated (if needed)

### Release Notes
_Please add release notes here before merging_

---
**Note:** Merging this PR will trigger the automatic release workflow."

PR_URL=$(gh pr create \
    --title "$PR_TITLE" \
    --body "$PR_BODY" \
    --base main \
    --head "$BRANCH_NAME")

print_success "✅ Pull request created successfully!"
print_info "PR URL: $PR_URL"
print_info ""
print_info "Next steps:"
print_info "1. Review the pull request"
print_info "2. Add release notes to the PR description"
print_info "3. Merge the PR to trigger the release"
print_info "4. The GitHub Actions workflow will automatically:"
print_info "   - Create a GitHub release"
print_info "   - Build and publish artifacts"
print_info "   - Create a git tag"

# Return to main branch
git checkout main