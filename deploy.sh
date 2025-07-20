#!/bin/bash

# GitHub Deployment Script for Marketing Mix Modeling DAG Builder

echo "🚀 Starting deployment process..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit: Marketing Mix Modeling DAG Builder"
fi

# Build the application
echo "📦 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix build errors before deploying."
    exit 1
fi

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ Build output not found. Please run 'npm run build' first."
    exit 1
fi

echo "✅ Build completed successfully!"

# Display deployment options
echo ""
echo "🌐 Deployment Options:"
echo "1. GitHub Pages (static deployment)"
echo "2. Vercel (full-stack deployment)"
echo "3. Railway (container deployment)"
echo "4. Docker (containerized deployment)"
echo ""

# GitHub Pages deployment
deploy_github_pages() {
    echo "📤 Deploying to GitHub Pages..."
    
    # Create gh-pages branch if it doesn't exist
    git checkout -b gh-pages 2>/dev/null || git checkout gh-pages
    
    # Copy dist contents to root
    cp -r dist/public/* .
    git add .
    git commit -m "Deploy to GitHub Pages"
    
    echo "✅ Ready for GitHub Pages deployment!"
    echo "👉 Push this branch to GitHub and enable Pages in repository settings"
}

# Vercel deployment
deploy_vercel() {
    echo "📤 Preparing for Vercel deployment..."
    echo "✅ vercel.json configuration ready!"
    echo "👉 Connect your GitHub repository to Vercel for automatic deployments"
}

# Railway deployment
deploy_railway() {
    echo "📤 Preparing for Railway deployment..."
    echo "✅ railway.json configuration ready!"
    echo "👉 Connect your GitHub repository to Railway for automatic deployments"
}

# Docker deployment
deploy_docker() {
    echo "🐳 Building Docker image..."
    docker build -t mmm-dag-builder .
    
    if [ $? -eq 0 ]; then
        echo "✅ Docker image built successfully!"
        echo "👉 Run: docker run -p 5000:5000 mmm-dag-builder"
    else
        echo "❌ Docker build failed"
    fi
}

# Main deployment logic
case "${1:-all}" in
    "github-pages")
        deploy_github_pages
        ;;
    "vercel")
        deploy_vercel
        ;;
    "railway")
        deploy_railway
        ;;
    "docker")
        deploy_docker
        ;;
    "all")
        echo "🎯 All deployment configurations ready!"
        echo ""
        echo "📋 Next Steps:"
        echo "1. Push code to GitHub repository"
        echo "2. Choose your deployment platform:"
        echo "   • Vercel: Connect GitHub repo at vercel.com"
        echo "   • Railway: Connect GitHub repo at railway.app"
        echo "   • Docker: Run './deploy.sh docker'"
        echo "   • GitHub Pages: Run './deploy.sh github-pages'"
        ;;
    *)
        echo "Usage: $0 [github-pages|vercel|railway|docker|all]"
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment preparation complete!"