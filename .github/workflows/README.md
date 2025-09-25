# GitHub Actions Workflows

This repository uses GitHub Actions for automated CI/CD pipelines. Here's how the workflows are structured:

## 🔄 Workflow Overview

### 1. **Auto PR to Staging** (`auto-pr-to-staging.yml`)
- **Trigger:** Push to `develop` branch
- **Action:** Automatically creates a PR from `develop` → `staging`
- **Features:**
  - Creates staging branch if it doesn't exist
  - Checks for existing PRs to avoid duplicates
  - Updates existing PRs with new changes
  - Includes commit information in PR description

### 2. **CI Pipeline** (`ci.yml`)
- **Trigger:** Push/PR to `develop`, `staging`, `main`
- **Actions:** 
  - Runs tests on Node.js 18 & 20
  - TypeScript compilation check
  - Linting and code quality
  - Security audit
  - Build verification

### 3. **Deploy to Staging** (`deploy-staging.yml`)
- **Trigger:** Push to `staging` or merged PR to `staging`
- **Action:** Deploys to staging environment on Render
- **Features:**
  - Runs full test suite
  - Builds application
  - Triggers Render deployment

### 4. **Production Deployment** (`deploy-production.yml`)
- **Trigger:** Push to `main` or manual workflow dispatch
- **Action:** Deploys to production with safety checks
- **Features:**
  - Full test suite + security audit
  - Pre/post deployment health checks
  - Creates release tags
  - Manual approval required (environment protection)

## 🚀 Deployment Flow

```
develop → [Auto PR] → staging → [Manual Merge] → main → production
   ↓                     ↓                        ↓
[CI Tests]         [Deploy Staging]        [Deploy Production]
```

## ⚙️ Setup Requirements

### 1. **GitHub Secrets**
Add these secrets in your GitHub repository settings:

```bash
RENDER_API_KEY=your_render_api_key
RENDER_STAGING_SERVICE_ID=your_staging_service_id
RENDER_PRODUCTION_SERVICE_ID=your_production_service_id
```

### 2. **Branch Protection**
Set up branch protection rules:

- **staging**: Require PR reviews, status checks
- **main**: Require PR reviews, status checks, restrict pushes

### 3. **Environment Protection**
Create a `production` environment in GitHub with:
- Required reviewers
- Deployment delays (optional)

## 📋 Branch Strategy

- **`develop`**: Development branch (default for new features)
- **`staging`**: Pre-production testing
- **`main`**: Production-ready code
- **`feature/*`**: Feature branches (merge to develop)
- **`hotfix/*`**: Emergency fixes (can go directly to main)

## 🔧 Workflow Customization

### Adding Render Deployment
Update the deployment steps with your actual Render service IDs:

```yaml
- name: Deploy to Render
  run: |
    curl -X POST "https://api.render.com/deploy/srv-YOUR_SERVICE_ID?key=$RENDER_API_KEY"
  env:
    RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}
```

### Adding Notifications
Add Slack/Discord notifications:

```yaml
- name: Notify deployment
  if: success()
  run: |
    curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"✅ Deployed to staging!"}' \
    ${{ secrets.SLACK_WEBHOOK_URL }}
```

## 📊 Monitoring

- **CI Status**: Check the Actions tab for build status
- **Deployment Status**: Monitor in Render dashboard
- **PR Status**: Auto-generated PRs include deployment checklists

## 🛠️ Troubleshooting

### Common Issues

1. **Auto PR Creation Fails**
   - Check GITHUB_TOKEN permissions
   - Ensure staging branch exists
   - Verify repository settings allow Actions

2. **Deployment Fails**
   - Verify Render API keys are correct
   - Check service IDs match your Render services
   - Review deployment logs in Render dashboard

3. **Tests Fail**
   - Ensure all dependencies are in package.json
   - Check test scripts are properly configured
   - Review test database configuration

## 🔄 Workflow Commands

### Manual Triggers
- Deploy to production: Go to Actions → Production Deployment → Run workflow
- Re-run failed workflows: Actions → Select workflow → Re-run jobs

### Local Testing
```bash
# Test the build process locally
npm ci
npm run build
npm test

# Check TypeScript compilation
npx tsc --noEmit

# Run linting
npm run lint
```

---

## 📝 Notes

- Auto PRs include commit information and deployment checklists
- All deployments create audit trails in GitHub Actions
- Production deployments create git tags for versioning
- Workflows can be customized based on your specific needs