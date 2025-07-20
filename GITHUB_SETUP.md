# GitHub Repository Setup

## Quick Setup Commands

```bash
# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "feat: Marketing Mix Modeling DAG Builder with PyMC integration

- Interactive DAG builder with ReactFlow
- CSV data upload and column categorization  
- Authentic PyMC + pgmpy Bayesian analysis
- Comprehensive incrementality analysis dashboard
- Production-ready deployment configurations"

# Add GitHub remote (replace with your repository URL)
git remote add origin https://github.com/yourusername/mmm-dag-builder.git

# Push to GitHub
git push -u origin main
```

## Repository Configuration

### 1. Create GitHub Repository

1. Go to GitHub and create a new repository named `mmm-dag-builder`
2. Choose "Public" or "Private" as needed
3. Don't initialize with README (we already have one)

### 2. Repository Settings

After pushing code:

1. **Enable GitHub Actions**:
   - Go to Actions tab and enable workflows
   - The deployment workflow will run automatically on pushes

2. **Add Repository Secrets** (if needed):
   - Go to Settings → Secrets and variables → Actions
   - Add secrets like `VERCEL_TOKEN`, `DATABASE_URL`, etc.

3. **Branch Protection** (optional):
   - Go to Settings → Branches
   - Add rule for `main` branch requiring PR reviews

### 3. Deployment Platform Setup

#### Vercel
1. Go to [vercel.com](https://vercel.com)
2. Connect GitHub account
3. Import the `mmm-dag-builder` repository
4. Vercel automatically detects the configuration

#### Railway
1. Go to [railway.app](https://railway.app)
2. Connect GitHub account
3. Create new project from the repository
4. Add environment variables in Railway dashboard

#### GitHub Pages (Frontend Only)
1. Run: `./deploy.sh github-pages`
2. Push the `gh-pages` branch: `git push origin gh-pages`
3. Go to Settings → Pages in GitHub
4. Select `gh-pages` branch as source

## File Structure for Deployment

```
mmm-dag-builder/
├── .github/workflows/deploy.yml    # GitHub Actions workflow
├── client/                         # React frontend
├── server/                         # Node.js backend + Python
├── shared/                         # Shared TypeScript types
├── dist/                          # Built application
├── Dockerfile                     # Container configuration
├── vercel.json                    # Vercel deployment config
├── railway.json                   # Railway deployment config
├── deploy.sh                      # Deployment script
├── DEPLOYMENT.md                  # Deployment instructions
└── README.md                      # Project documentation
```

## Environment Variables

Set these in your deployment platform:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:port/db
PORT=5000
```

## Troubleshooting

- **Git errors**: Ensure you have write access to the repository
- **Build failures**: Check GitHub Actions logs for detailed error messages
- **Deployment issues**: Verify environment variables are set correctly
- **Python errors**: Ensure PyMC dependencies are properly installed in CI/CD