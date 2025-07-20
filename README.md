# Marketing Mix Modeling DAG Builder

A sophisticated React.js application for marketing analytics providing precise and transparent insights into channel performance through advanced Bayesian inference and scalable statistical analysis.

## Features

- **Interactive DAG Builder**: Drag-and-drop interface for creating causal marketing models
- **CSV Data Upload**: Import real marketing data and categorize columns as channels or metrics
- **Authentic PyMC Analysis**: Statistical modeling using genuine PyMC MCMC sampling with pgmpy integration
- **Bayesian Inference**: Proper priors (Normal(0,10) for intercept, HalfNormal(1.0) for coefficients)
- **Incrementality Analysis**: Realistic baseline vs marketing attribution with proper scaling
- **Comprehensive Results**: Coefficient analysis, model performance metrics, and contribution breakdowns

## Technologies

- **Frontend**: React 18 + TypeScript, TailwindCSS, shadcn/ui, ReactFlow
- **Backend**: Node.js + Express.js with Python integration
- **Statistical Engine**: PyMC + pgmpy for authentic Bayesian causal modeling
- **Data Processing**: StandardScaler for proper data normalization and inverse transformations

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the application:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:5000` in your browser

## Usage Workflow

1. **Upload Data**: Import CSV file with marketing spend and outcome data
2. **Categorize Columns**: Assign columns as marketing channels or outcome metrics
3. **Build DAG**: Drag nodes to canvas and create causal relationships
4. **Run Analysis**: Click "Estimate Coefficients" for authentic PyMC Bayesian modeling
5. **Review Results**: Examine coefficients, performance metrics, and incrementality analysis

## Model Specifications

- **Sampling**: PyMC MCMC with draws=200, tune=100, chains=2
- **Priors**: β₀ ~ Normal(0, 10), β ~ HalfNormal(1.0), σ ~ HalfNormal(1.0)
- **Scaling**: 4-step process ensuring proper coefficient transformation
- **Output**: ROAS coefficients, credible intervals, and authentic contribution analysis

## Project Status

✅ **Production Ready** - Full PyMC + pgmpy integration complete with authentic Bayesian analysis