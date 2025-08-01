# Testing GitHub Workflows Locally

This guide explains how to test GitHub Actions workflows locally before pushing them.

## Setup

1. **Install act** (GitHub Actions local runner):

   ```bash
   # macOS
   brew install act

   # Linux
   curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

   # Or download from: https://github.com/nektos/act/releases
   ```

2. **Configure secrets**:

   ```bash
   # Copy the secrets template
   cp .secrets.act .secrets.act.local

   # Edit .secrets.act.local with your credentials
   # Required for workflows that use secrets like PAT_TOKEN
   ```

3. **Configure environment** (optional):

   ```bash
   # Copy the environment template
   cp .env.act .env.act.local

   # Edit .env.act.local with additional variables
   ```

## Quick Commands

```bash
# Test all workflows
act

# Test specific workflow
act -W .github/workflows/ci.yml

# Test specific event
act push
act pull_request
act release

# List all jobs without running
act -l

# Test with specific platform
act -P macos-latest=catthehacker/macos:12

# Use the helper script
./scripts/test-workflows.sh
```

## Workflow-Specific Testing

### CI Workflow

```bash
# Test the CI checks
act -W .github/workflows/ci.yml push
```

### Release Workflow

```bash
# Test release build (requires credentials in .env.act.local)
act -W .github/workflows/release.yml push --tag v1.0.0
```

### CodeQL Analysis

```bash
# Test security scanning
act -W .github/workflows/codeql.yml push
```

### Dependency Review

```bash
# Test dependency checks (PR event)
act -W .github/workflows/dependency-review.yml pull_request
```

## Limitations

- **macOS builds**: Docker containers can't fully emulate macOS, so notarization won't work
- **Windows builds**: Limited functionality in Docker containers
- **Secrets**: Must be provided via `.env.act.local` or command line
- **Some Actions**: GitHub-specific actions may not work (e.g., `actions/create-release`)

## Tips

1. **Use dry run** to see what would execute:

   ```bash
   act -n
   ```

2. **Debug mode** for troubleshooting:

   ```bash
   act -v
   ```

3. **Specific job** testing:

   ```bash
   act -j job-name
   ```

4. **Custom event payload**:
   ```bash
   act push -e event.json
   ```

## Common Issues

- **Missing tools**: Use the catthehacker images specified in `.actrc`
- **Network issues**: The `.actrc` configures `--network host`
- **Large downloads**: First run downloads Docker images (~1-3GB each)
- **Missing secrets**: Copy `.secrets.act` to `.secrets.act.local` and add your tokens
- **PAT_TOKEN error**: The enforce-branch-protection workflow needs a GitHub Personal Access Token with repo permissions

## Alternative: GitHub CLI

For simpler validation without running:

```bash
# Validate workflow syntax
gh workflow view ci.yml
gh workflow list
```
