# Deployment Guide

## Quick Deploy Commands

```bash
# Make deployment script executable (if not already)
chmod +x deploy.sh

# Build and prepare for all platforms
./deploy.sh

# Or deploy to specific platform
./deploy.sh vercel       # Vercel deployment
./deploy.sh railway      # Railway deployment  
./deploy.sh docker       # Docker container
./deploy.sh github-pages # Static GitHub Pages
```

## Platform-Specific Instructions

### 1. Vercel (Recommended for Full-Stack)

1. Push code to GitHub repository
2. Visit [vercel.com](https://vercel.com) and connect your GitHub account
3. Import your repository
4. Vercel will automatically detect the configuration from `vercel.json`
5. Add environment variables in Vercel dashboard if needed

### 2. Railway (Container Deployment)

1. Push code to GitHub repository
2. Visit [railway.app](https://railway.app) and connect your GitHub account
3. Create new project from GitHub repo
4. Railway will use `railway.json` configuration
5. Set environment variables in Railway dashboard

### 3. Docker (Local/Self-Hosted)

```bash
# Build Docker image
docker build -t mmm-dag-builder .

# Run container
docker run -p 5000:5000 mmm-dag-builder

# Or with environment variables
docker run -p 5000:5000 -e DATABASE_URL=your_db_url mmm-dag-builder
```

### 4. GitHub Pages (Frontend Only)

```bash
# Deploy static frontend to GitHub Pages
./deploy.sh github-pages

# Then push gh-pages branch to GitHub
git push origin gh-pages
```

## Environment Variables

Set these in your deployment platform:

- `NODE_ENV=production`
- `DATABASE_URL` (if using PostgreSQL)
- Any other API keys your app requires

## Build Process

The application uses a multi-stage build:

1. **Frontend Build**: Vite builds React app to `dist/public`
2. **Backend Build**: esbuild bundles Node.js server to `dist/index.js`
3. **Python Dependencies**: Poetry installs PyMC and statistical packages

## Requirements

- Node.js 20+
- Python 3.11+
- PostgreSQL (optional, uses in-memory storage by default)

## Troubleshooting

- **Build fails**: Ensure all dependencies are installed with `npm install`
- **Python errors**: Check Python dependencies with `poetry install`
- **Port issues**: Default port is 5000, configure with `PORT` environment variable