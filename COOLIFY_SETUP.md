# Coolify Configuration Guide

This guide explains how to configure Coolify to use the pre-built Docker images from GitHub Container Registry instead of building on your VPS.

## What Changed

- **Before**: Coolify pulled your code and built it on the VPS (causing RAM spikes, disk usage, freezes)
- **After**: GitHub Actions builds Docker images → pushes to GHCR → Coolify pulls and runs them

## Setup Steps

### 1. Add GitHub Secrets

Go to your repo: `https://github.com/aldo-leka/blackjack.js/settings/secrets/actions`

Add these secrets:

- `COOLIFY_WEBHOOK_FRONTEND` - Get this from Coolify frontend app → Webhooks tab
- `COOLIFY_WEBHOOK_BACKEND` - Get this from Coolify backend app → Webhooks tab

### 2. Configure Frontend App in Coolify

1. Go to your frontend app in Coolify
2. **General Tab**:
   - **Build Pack**: Keep as Nixpacks (or change to Docker if you prefer)
   - **Docker Image**: Set to `ghcr.io/aldo-leka/blackjack.js-frontend:latest`
   - **Base Directory**: Remove `/front` (not needed anymore)
3. **Advanced Tab**:
   - **Uncheck "Auto Deploy"** (already done ✅)
4. **Source Tab** (if available):
   - Change from "Git Repository" to "Docker Image"
   - Image: `ghcr.io/aldo-leka/blackjack.js-frontend:latest`

### 3. Configure Backend App in Coolify

1. Go to your backend app in Coolify
2. **General Tab**:
   - **Build Pack**: Keep as Nixpacks (or change to Docker)
   - **Docker Image**: Set to `ghcr.io/aldo-leka/blackjack.js-backend:latest`
   - **Base Directory**: Remove `/back` (not needed anymore)
3. **Advanced Tab**:
   - **Uncheck "Auto Deploy"**
4. **Source Tab** (if available):
   - Change from "Git Repository" to "Docker Image"
   - Image: `ghcr.io/aldo-leka/blackjack.js-backend:latest`

### 4. Make Images Public (for easier pulling)

Go to: `https://github.com/aldo-leka?tab=packages`

For both packages (frontend & backend):
1. Click on the package
2. Click "Package settings"
3. Scroll down to "Danger Zone"
4. Click "Change visibility" → Make Public

### 5. Test the Workflow

1. Make a small change to `front/` or `back/`
2. Push to GitHub
3. Watch GitHub Actions build the image
4. Coolify should automatically deploy after the webhook is triggered

## Expected Behavior

- **Push to `/front`**: Only frontend workflow runs, only frontend deploys
- **Push to `/back`**: Only backend workflow runs, only backend deploys
- **VPS load**: Should stay low during deployments (no more builds!)
- **Disk usage**: Should stabilize (no more Docker build layers)

## Troubleshooting

### Image pull fails
Make sure the images are public, or configure Coolify with GHCR credentials.

### Webhook doesn't trigger
Check that the webhook URLs in GitHub Secrets match the ones in Coolify.

### Build fails on GitHub
Check the Actions tab in your repo for error logs.

## Benefits

- ✅ VPS never builds code again
- ✅ No more RAM spikes during deployment
- ✅ Disk usage stays clean
- ✅ Faster deployments
- ✅ Free GitHub Container Registry
- ✅ Smart CI (only builds what changed)