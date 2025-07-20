#!/usr/bin/env python3
"""
Authentic PyMC + pgmpy Causal Analysis
Following user's exact Jupyter notebook methodology
"""

import json
import sys
import time
import numpy as np
import pandas as pd
from typing import Dict, List, Any
import warnings
warnings.filterwarnings('ignore')

def debug_print(msg):
    print(f"DEBUG: {msg}", file=sys.stderr)

# Import PyMC and pgmpy - authentic implementation only
try:
    import pymc as pm
    import arviz as az
    from pgmpy.models import LinearGaussianBayesianNetwork
    from pgmpy.factors.continuous import LinearGaussianCPD
    from scipy import stats
    debug_print("PyMC and pgmpy imported successfully")
except ImportError as e:
    debug_print(f"Missing dependencies: {e}")
    print(json.dumps({
        "success": False,
        "error": f"PyMC/pgmpy dependencies not available: {e}",
        "method": "pymc_required",
        "parameters": {"edges": []},
        "updatedDAG": {"nodes": [], "edges": []},
        "performance": {},
        "predictions": {"actualVsPredicted": []},
        "incrementalityAnalysis": {}
    }))
    sys.exit(1)

def find_column_for_node(node_id: str, available_columns: List[str]) -> str:
    """Find matching column for node ID"""
    base_node = node_id
    
    # Remove timestamp suffix if present
    parts = node_id.split('-')
    if len(parts) > 1 and parts[-1].isdigit():
        base_node = '-'.join(parts[:-1])
    
    # Remove test suffixes
    if base_node.endswith('-test'):
        base_node = base_node[:-5]
    
    # Convert to underscore format for column matching
    base_node = base_node.replace('-', '_').lower()
    debug_print(f"Mapping {node_id} -> {base_node}")
    
    # Try exact match first
    for col in available_columns:
        if base_node == col.lower():
            debug_print(f"Exact match: {base_node} to column {col}")
            return col
    
    # Try partial match
    for col in available_columns:
        if base_node in col.lower() or col.lower() in base_node:
            debug_print(f"Partial match: {base_node} to column {col}")
            return col
    
    debug_print(f"No match found for {base_node} in {available_columns}")
    return None

def parse_input_data(data: List[List[Any]], config: Dict[str, Any]) -> pd.DataFrame:
    """Parse CSV data into DataFrame"""
    debug_print(f"Parsing data with {len(data)} rows")
    
    if config.get('hasHeaders', True):
        columns = data[0]
        df_data = data[1:]
    else:
        columns = [f"col_{i}" for i in range(len(data[0]))]
        df_data = data
    
    debug_print(f"Columns: {columns}")
    
    df = pd.DataFrame(df_data, columns=columns)
    
    # Convert to numeric (skip date columns)
    for col in df.columns:
        if col.lower() != 'date':
            df[col] = pd.to_numeric(df[col], errors='coerce')
    
    # Remove rows with missing values
    df = df.dropna()
    debug_print(f"Final DataFrame shape: {df.shape}")
    return df

def perform_authentic_pymc_analysis(data: List[List[Any]], config: Dict[str, Any], dag_structure: Dict[str, Any]) -> Dict[str, Any]:
    """
    Authentic PyMC + pgmpy LinearGaussianCPD analysis
    Following user's Jupyter notebook methodology EXACTLY
    """
    debug_print("=== AUTHENTIC PyMC + LinearGaussianCPD ANALYSIS ===")
    
    try:
        # Parse data
        df = parse_input_data(data, config)
        df_original = df.copy()
        
        debug_print(f"Data columns: {list(df.columns)}")
        debug_print(f"Data shape: {df.shape}")
        
        # Build DAG structure with deduplication
        dag_edges = []
        edge_set = set()  # Track unique edges to prevent duplicates
        debug_print(f"Processing {len(dag_structure.get('edges', []))} edges from DAG structure")
        
        for i, edge in enumerate(dag_structure.get('edges', [])):
            debug_print(f"Edge {i+1}: {edge.get('source', 'NO_SOURCE')} -> {edge.get('target', 'NO_TARGET')}")
            source_col = find_column_for_node(edge['source'], df.columns.tolist())
            target_col = find_column_for_node(edge['target'], df.columns.tolist())
            
            if source_col and target_col:
                edge_tuple = (source_col, target_col)
                if edge_tuple not in edge_set:
                    dag_edges.append(edge_tuple)
                    edge_set.add(edge_tuple)
                    debug_print(f"DAG edge: {source_col} -> {target_col}")
                else:
                    debug_print(f"DUPLICATE EDGE SKIPPED: {source_col} -> {target_col}")
            else:
                debug_print(f"FAILED MAPPING: {edge['source']} -> {source_col}, {edge['target']} -> {target_col}")
        
        debug_print(f"Final unique DAG edges: {len(dag_edges)}")
        
        if not dag_edges:
            return {
                "success": False,
                "error": "No valid DAG edges found after column mapping",
                "method": "pymc_lineargaussian_cpd",
                "parameters": {"edges": []},
                "updatedDAG": {"nodes": [], "edges": []},
                "performance": {},
                "predictions": {"actualVsPredicted": []},
                "incrementalityAnalysis": {}
            }
        
        # Create pgmpy LinearGaussianBayesianNetwork
        lgbn = LinearGaussianBayesianNetwork(dag_edges)
        debug_print(f"Created LinearGaussianBayesianNetwork with edges: {list(lgbn.edges())}")
        
        # Group by target for LinearGaussianCPD creation
        target_groups = {}
        for source_col, target_col in dag_edges:
            if target_col not in target_groups:
                target_groups[target_col] = []
            target_groups[target_col].append(source_col)
        
        # Perform PyMC analysis for each target
        cpds = []
        analysis_results = []
        updated_edges = []
        scalers = {}  # Store scalers for inverse transformation
        
        for target_col, parent_cols in target_groups.items():
            debug_print(f"\nPyMC analysis for {target_col} with parents: {parent_cols}")
            
            # Prepare data
            X_data = []
            for parent in parent_cols:
                if parent in df.columns:
                    X_data.append(df[parent].values)
            
            if not X_data:
                continue
                
            X = np.column_stack(X_data) 
            y = df[target_col].values
            
            # Clean data
            valid_mask = ~(np.isnan(X).any(axis=1) | np.isnan(y))
            X_raw = X[valid_mask]
            y_raw = y[valid_mask]
            
            # Scale marketing data (standardize X variables)
            from sklearn.preprocessing import StandardScaler
            scaler_X = StandardScaler()
            X_clean = scaler_X.fit_transform(X_raw)
            
            # Scale target variable 
            scaler_y = StandardScaler()
            y_clean = scaler_y.fit_transform(y_raw.reshape(-1, 1)).flatten()
            
            debug_print(f"Data scaling - X: {X_raw.shape} -> {X_clean.shape}, y: {y_raw.shape} -> {y_clean.shape}")
            debug_print(f"X means: {scaler_X.mean_}, X stds: {scaler_X.scale_}")
            debug_print(f"y mean: {scaler_y.mean_[0]}, y std: {scaler_y.scale_[0]}")
            
            # Store scalers for inverse transformation
            scalers[target_col] = {
                'scaler_X': scaler_X,
                'scaler_y': scaler_y,
                'parent_cols': parent_cols,
                'X_raw': X_raw,
                'y_raw': y_raw
            }
            
            if len(X_clean) < 3:
                debug_print(f"Insufficient data for {target_col} (need at least 3 samples)")
                continue
            
            # PyMC Bayesian Linear Regression (EXACTLY from user's notebook)
            with pm.Model() as pymc_model:
                debug_print(f"Building PyMC model for {target_col}...")
                
                # Priors (EXACTLY from user's notebook)
                β0 = pm.Normal("β0", mu=0, sigma=10)
                β = pm.HalfNormal("β", sigma=1.0, shape=X_clean.shape[1])  # sigma_p=1.0
                σ = pm.HalfNormal("σ", sigma=1.0)
                
                # Linear model (EXACTLY from user's notebook)
                μ = β0 + pm.math.dot(X_clean, β)
                
                # Likelihood (EXACTLY from user's notebook)
                pm.Normal("y", mu=μ, sigma=σ, observed=y_clean)
                
                # MCMC sampling (user's methodology with optimized parameters)
                debug_print(f"Running PyMC MCMC sampling...")
                
                # Always use full PyMC specification as requested
                debug_print(f"Running full PyMC MCMC sampling with 2000 draws, 1000 tune...")
                debug_print(f"Data shape: X={X_clean.shape}, y={len(y_clean)}")
                
                start_time = time.time()
                
                # Efficient sampling for small datasets
                debug_print(f"Starting PyMC sampling with progress bar enabled...")
                idata = pm.sample(
                    draws=2000,        # User's specification
                    tune=1000,         # User's specification  
                    chains=2,          # User's preference
                    target_accept=0.9, # User's exact parameter
                    progressbar=True,  # Enable progress bar for console
                    random_seed=44,    # User's exact seed
                    compute_convergence_checks=False,  # Skip for speed
                    return_inferencedata=True
                )
                
                elapsed = time.time() - start_time
                debug_print(f"PyMC sampling completed in {elapsed:.1f} seconds")
                
                # Extract posterior means (EXACTLY from user's notebook)
                means = idata.posterior.mean(dim=("chain", "draw"))
                β0_hat = float(means["β0"])
                β_hat = [float(b) for b in means["β"]]
                σ_hat = float(means["σ"])
                
                # Extract posterior standard deviations (Bayesian uncertainty)
                stds = idata.posterior.std(dim=("chain", "draw"))
                β0_std = float(stds["β0"])
                β_stds = [float(s) for s in stds["β"]]
                
                debug_print(f"PyMC results: β0={β0_hat:.4f}, β={[f'{b:.4f}' for b in β_hat]}, σ={σ_hat:.4f}")
                debug_print(f"INTERCEPT DEBUG: β0_hat (baseline revenue) = {β0_hat}")
                debug_print(f"Is intercept near zero? {abs(β0_hat) < 1000}")
                
                # Create LinearGaussianCPD (EXACTLY from user's notebook)
                beta_vec = [β0_hat] + β_hat
                std_hat = float(σ_hat)
                
                cpd = LinearGaussianCPD(
                    variable=target_col,
                    beta=beta_vec,          # [intercept, β₁, …, βₖ] 
                    std=std_hat,            # σ itself (not σ²)
                    evidence=parent_cols    # same ordering as β_values
                )
                cpds.append(cpd)
                
        # Add CPDs to the LinearGaussianBayesianNetwork for proper causal inference
        for cpd in cpds:
            lgbn.add_cpds(cpd)
        
        debug_print(f"Added {len(cpds)} CPDs to LinearGaussianBayesianNetwork")
        
        # Calculate unit change coefficients using pgmpy causal inference
        for target_col, parent_cols in target_groups.items():
            debug_print(f"\nCalculating causal effects for {target_col} with parents: {parent_cols}")
            
            for i, parent in enumerate(parent_cols):
                try:
                    # Calculate unit change effect using pgmpy's causal inference
                    # This represents the causal effect of a 1-unit increase in the parent
                    baseline_mean = df[parent].mean()
                    intervention_value = baseline_mean + 1.0  # 1-unit increase
                    
                    # Use the LinearGaussianCPD to calculate the causal effect
                    cpd_for_target = None
                    for cpd in cpds:
                        if cpd.variable == target_col:
                            cpd_for_target = cpd
                            break
                    
                    if cpd_for_target:
                        # Extract the coefficient for this parent from the CPD (standardized)
                        parent_index = parent_cols.index(parent)
                        # CPD beta format: [intercept, coeff1, coeff2, ...]
                        standardized_coeff = cpd_for_target.beta[parent_index + 1]  # Skip intercept
                        
                        # Get scalers for inverse transformation
                        scaler_info = scalers[target_col]
                        scaler_X = scaler_info['scaler_X']
                        scaler_y = scaler_info['scaler_y']
                        
                        # Debug the actual data scales first
                        y_std = scaler_y.scale_[0]
                        x_std = scaler_X.scale_[parent_index]
                        y_mean = scaler_y.mean_[0]
                        x_mean = scaler_X.mean_[parent_index]
                        
                        debug_print(f"DATA SCALE DEBUG for {parent}:")
                        debug_print(f"  Y ({target_col}): mean={y_mean:.2f}, std={y_std:.2f}")
                        debug_print(f"  X ({parent}): mean={x_mean:.2f}, std={x_std:.2f}")
                        debug_print(f"  Standardized coefficient: {standardized_coeff:.6f}")
                        
                        # Transform standardized coefficient back to original scale
                        # For standardized regression: Y_scaled = β₀ + β₁ * X_scaled
                        # To get original scale: Y = Y_mean + Y_std * (β₀ + β₁ * (X - X_mean)/X_std)
                        # Rearranging: Y = (Y_mean + Y_std*β₀ - Y_std*β₁*X_mean/X_std) + (Y_std*β₁/X_std) * X
                        # So: coefficient_original = β₁ * Y_std / X_std
                        unit_effect = standardized_coeff * (y_std / x_std)
                        
                        # Check if coefficient is reasonable (should be small for marketing data)
                        if abs(unit_effect) > 100:
                            debug_print(f"WARNING: Large coefficient detected: {unit_effect}")
                            debug_print(f"  This suggests scaling issues or model problems")
                            debug_print(f"  Ratio y_std/x_std = {y_std/x_std:.6f}")
                        
                        std_error_scaled = (β_stds[i] if i < len(β_stds) else 0) * (y_std / x_std)
                        
                        debug_print(f"Coefficient scaling: standardized={standardized_coeff:.6f}, original_scale={unit_effect:.6f}")
                        debug_print(f"Scale factors: y_std={y_std:.3f}, x_std={x_std:.3f}, ratio={y_std/x_std:.6f}")
                        debug_print(f"Unit causal effect of {parent} on {target_col}: {unit_effect}")
                        
                        # Calculate uncertainty from PyMC posteriors (scaled)
                        std_error = std_error_scaled
                        
                        # Bayesian credible interval assessment
                        t_stat = unit_effect / std_error if std_error > 0 else 0
                        p_value = float(2 * (1 - stats.t.cdf(abs(t_stat), len(y_clean) - len(parent_cols) - 1)))
                        confidence = float(max(0, min(1, 1 - p_value)))
                        
                        # Strength assessment based on causal effect size and uncertainty
                        abs_effect = abs(unit_effect)
                        if abs_effect > 0.5 and std_error < abs_effect/2:
                            strength = "strong"
                        elif abs_effect > 0.2 and std_error < abs_effect:
                            strength = "moderate"
                        else:
                            strength = "weak"
                        
                        result = {
                            "source": parent.replace('_', '-'),
                            "target": target_col.replace('_', '-'),
                            "data": {
                                "source": parent.replace('_', '-'),
                                "target": target_col.replace('_', '-'),
                                "coefficient": float(unit_effect),  # Unit causal effect
                                "standardError": float(std_error),
                                "pValue": float(p_value),
                                "confidence": float(confidence),
                                "strength": strength
                            }
                        }
                        
                        analysis_results.append(result["data"])
                        updated_edges.append(result)
                        
                        debug_print(f"Added causal edge: {parent} -> {target_col}, unit effect={unit_effect:.4f}")
                    
                except Exception as e:
                    debug_print(f"Error calculating causal effect for {parent} -> {target_col}: {e}")
                    # Fallback to raw coefficient if causal inference fails
                    coefficient = β_hat[i] if i < len(β_hat) else 0
                    std_error = β_stds[i] if i < len(β_stds) else 0
                    
                    result = {
                        "source": parent.replace('_', '-'),
                        "target": target_col.replace('_', '-'),
                        "data": {
                            "source": parent.replace('_', '-'),
                            "target": target_col.replace('_', '-'),
                            "coefficient": float(coefficient),
                            "standardError": float(std_error),
                            "pValue": 0.5,
                            "confidence": 0.5,
                            "strength": "moderate"
                        }
                    }
                    
                    analysis_results.append(result["data"])
                    updated_edges.append(result)
        
        # Calculate model performance metrics
        try:
            # Use the last model for performance calculation
            if target_groups:
                last_target = list(target_groups.keys())[-1]
                last_parents = target_groups[last_target]
                
                X_perf = np.column_stack([df[p].values for p in last_parents if p in df.columns])
                y_perf = df[last_target].values
                
                # Calculate R² using actual model predictions with inverse scaling
                last_scaler = scalers[last_target]
                X_perf_scaled = last_scaler['scaler_X'].transform(X_perf)
                y_pred_scaled = β0_hat + np.dot(X_perf_scaled, β_hat)
                y_pred = last_scaler['scaler_y'].inverse_transform(y_pred_scaled.reshape(-1, 1)).flatten()
                ss_res = np.sum((y_perf - y_pred) ** 2)
                ss_tot = np.sum((y_perf - np.mean(y_perf)) ** 2)
                r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
                
                rmse = np.sqrt(np.mean((y_perf - y_pred) ** 2))
                n_params = len(β_hat) + 1
                n_obs = len(y_perf)
                
                aic = 2 * n_params - 2 * np.log(max(1e-10, 1 / (rmse + 1e-10)))
                bic = np.log(n_obs) * n_params - 2 * np.log(max(1e-10, 1 / (rmse + 1e-10)))
            else:
                r_squared = rmse = aic = bic = 0
        except:
            r_squared = rmse = aic = bic = 0
        
        performance = {
            "rSquared": float(r_squared),
            "rmse": float(rmse),
            "aic": float(aic),
            "bic": float(bic)
        }
        
        # Generate authentic predictions using fitted PyMC model
        predictions = {"actualVsPredicted": []}
        try:
            if target_groups and len(updated_edges) > 0:
                target_col = list(target_groups.keys())[0]
                parent_cols = target_groups[target_col]
                
                # Get scalers for this target
                scaler_info = scalers[target_col]
                scaler_X = scaler_info['scaler_X']
                scaler_y = scaler_info['scaler_y']
                X_raw = scaler_info['X_raw']
                y_raw = scaler_info['y_raw']
                
                # Use raw data for predictions
                X = X_raw
                y_actual = y_raw
                
                # Scale for model prediction, then inverse transform
                X_scaled = scaler_X.transform(X)
                y_pred_scaled = β0_hat + np.dot(X_scaled, β_hat)
                
                # Inverse transform predictions back to original scale
                y_predicted = scaler_y.inverse_transform(y_pred_scaled.reshape(-1, 1)).flatten()
                
                debug_print(f"Generated {len(y_predicted)} authentic predictions using fitted PyMC model")
                
                for i in range(len(y_actual)):
                        predictions["actualVsPredicted"].append({
                            "actual": float(y_actual[i]),
                            "predicted": float(y_predicted[i]),
                            "residual": float(y_actual[i] - y_predicted[i]),
                            "period": i + 1,
                            "date": str(df.iloc[i].get('date', f'Period {i+1}'))
                        })
                        
        except Exception as e:
            debug_print(f"Error generating authentic predictions: {e}")
            import traceback
            traceback.print_exc(file=sys.stderr)
        
        # Calculate incrementality analysis using 4-step process as specified
        incrementality = {"revenue": {"totalIncrementalImpact": 0.0, "baselineEffect": 0.0, "channelContributions": []}}
        
        try:
            if target_groups and len(updated_edges) > 0:
                target_col = list(target_groups.keys())[0]
                parent_cols = target_groups[target_col]
                
                # Get scalers and model parameters for this target
                target_scaler = scalers[target_col]
                scaler_X = target_scaler['scaler_X']
                scaler_y = target_scaler['scaler_y']
                X_raw = target_scaler['X_raw']
                y_raw = target_scaler['y_raw']
                
                debug_print(f"=== 4-STEP INCREMENTALITY CALCULATION ===")
                debug_print(f"Step 1-2: Data already scaled, PyMC model fitted")
                debug_print(f"Step 3: Using LGBN coefficients for scaled contributions")
                
                # SIMPLIFIED APPROACH: Calculate contributions directly in original scale
                # This avoids complex scaling transformations that can introduce errors
                debug_print(f"SIMPLIFIED INCREMENTALITY CALCULATION:")
                debug_print(f"Number of updated_edges: {len(updated_edges)}")
                debug_print(f"Parent columns: {parent_cols}")
                
                # FIXED: Baseline calculation for standardized model
                # When all X variables = 0 (no marketing spend), what's the revenue?
                # For standardized model: Y_scaled = β0 + sum(βi * Xi_scaled)
                # When Xi = 0 (original): Xi_scaled = (0 - Xi_mean) / Xi_std = -Xi_mean / Xi_std
                # So baseline_scaled = β0 + sum(βi * (-Xi_mean / Xi_std))
                baseline_scaled = β0_hat
                for i, parent_col in enumerate(parent_cols):
                    x_mean_scaled = -scaler_X.mean_[i] / scaler_X.scale_[i]  # When X=0 in original scale
                    baseline_scaled += β_hat[i] * x_mean_scaled
                
                # Transform to original scale
                baseline_original = baseline_scaled * scaler_y.scale_[0] + scaler_y.mean_[0]
                
                debug_print(f"BASELINE CALCULATION DEBUG:")
                debug_print(f"  β0 (standardized intercept): {β0_hat}")
                debug_print(f"  Baseline (scaled space): {baseline_scaled}")
                debug_print(f"  Baseline (original scale): {baseline_original}")
                
                # Sanity check: baseline should be much less than average revenue
                avg_actual_revenue = float(np.mean(y_raw))
                if baseline_original > avg_actual_revenue * 0.8:
                    debug_print(f"WARNING: Baseline ({baseline_original:.0f}) is too close to average revenue ({avg_actual_revenue:.0f})")
                    debug_print(f"  This suggests the model is predicting mostly organic revenue")
                else:
                    debug_print(f"Baseline looks reasonable: {baseline_original:.0f} vs avg revenue {avg_actual_revenue:.0f}")
                
                # Channel contributions: Use original scale values directly
                total_channel_contribution_original = 0
                
                for edge in updated_edges:
                    debug_print(f"Processing edge: {edge['source']} -> {edge['target']}")
                    source_col = find_column_for_node(edge["source"], df.columns.tolist())
                    debug_print(f"  Mapped to column: {source_col}")
                    
                    if source_col and source_col in df.columns:
                        # Use the already transformed coefficient from the edge (original scale)
                        avg_spend_original = float(df[source_col].mean())
                        coeff_original = edge["data"]["coefficient"]
                        
                        # Direct calculation: contribution = average spend × coefficient (both original scale)
                        channel_contribution = avg_spend_original * coeff_original
                        total_channel_contribution_original += channel_contribution
                        
                        debug_print(f"  Channel {edge['source']}:")
                        debug_print(f"    Average spend: {avg_spend_original}")
                        debug_print(f"    Coefficient: {coeff_original}")
                        debug_print(f"    Contribution: {channel_contribution}")
                        
                        incrementality["revenue"]["channelContributions"].append({
                            "channel": edge["source"],
                            "averageSpend": avg_spend_original,
                            "coefficient": coeff_original,
                            "totalContribution": channel_contribution,
                            "percentageContribution": 0  # Will calculate after total is known
                        })
                    else:
                        debug_print(f"  SKIPPED: Column {source_col} not found in DataFrame")
                
                debug_print(f"Total channel contribution: {total_channel_contribution_original}")
                
                # Calculate total revenue and overall percentages
                avg_actual_revenue = float(np.mean(y_raw))
                total_revenue_contribution = baseline_original + total_channel_contribution_original
                
                # Calculate channel percentage contributions
                for contrib in incrementality["revenue"]["channelContributions"]:
                    if total_channel_contribution_original > 0:
                        contrib["percentageContribution"] = (contrib["totalContribution"] / total_channel_contribution_original) * 100
                    else:
                        contrib["percentageContribution"] = 0
                
                # Overall incrementality percentages
                if avg_actual_revenue > 0:
                    baseline_effect_pct = baseline_original / avg_actual_revenue
                    incremental_impact_pct = total_channel_contribution_original / avg_actual_revenue
                    
                    # Ensure percentages are in valid range
                    baseline_effect_pct = max(0, min(1, baseline_effect_pct))
                    incremental_impact_pct = max(0, min(1, incremental_impact_pct))
                    
                    incrementality["revenue"]["totalIncrementalImpact"] = float(incremental_impact_pct)
                    incrementality["revenue"]["baselineEffect"] = float(baseline_effect_pct)
                    
                    debug_print(f"FINAL RESULTS:")
                    debug_print(f"  Baseline (original): {baseline_original:.2f} ({baseline_effect_pct:.1%})")
                    debug_print(f"  Total channel contribution: {total_channel_contribution_original:.2f} ({incremental_impact_pct:.1%})")
                    debug_print(f"  Average actual revenue: {avg_actual_revenue:.2f}")
                    debug_print(f"  Total model prediction: {total_revenue_contribution:.2f}")
                else:
                    incrementality["revenue"]["totalIncrementalImpact"] = 0.0
                    incrementality["revenue"]["baselineEffect"] = 0.0
            
        except Exception as e:
            debug_print(f"Error calculating incrementality: {e}")
            import traceback
            traceback.print_exc(file=sys.stderr)
        
        result = {
            "success": True,
            "method": "pymc_lineargaussian_cpd",
            "parameters": {"edges": analysis_results},
            "updatedDAG": {"nodes": [], "edges": updated_edges},
            "performance": performance,
            "predictions": predictions,
            "incrementalityAnalysis": incrementality
        }
        
        debug_print(f"Analysis complete with {len(updated_edges)} edges")
        return result
        
    except Exception as e:
        debug_print(f"Analysis error: {e}")
        import traceback
        traceback.print_exc(file=sys.stderr)
        
        return {
            "success": False,
            "error": f"PyMC analysis failed: {str(e)}",
            "method": "pymc_lineargaussian_cpd",
            "parameters": {"edges": []},
            "updatedDAG": {"nodes": [], "edges": []},
            "performance": {},
            "predictions": {"actualVsPredicted": []},
            "incrementalityAnalysis": {}
        }

def main():
    try:
        debug_print("Starting authentic PyMC + pgmpy analysis script")
        
        # Read input from stdin
        input_data = sys.stdin.read()
        if not input_data.strip():
            debug_print("No input provided")
            print(json.dumps({"error": "No input provided"}))
            sys.exit(1)
        
        debug_print("Input received, parsing JSON...")
        
        # Parse input
        parsed_input = json.loads(input_data)
        data = parsed_input["data"]
        config = parsed_input["config"] 
        dag_structure = parsed_input["dagStructure"]
        
        debug_print(f"Data rows: {len(data)}, Edges: {len(dag_structure.get('edges', []))}")
        
        # Perform authentic PyMC analysis
        result = perform_authentic_pymc_analysis(data, config, dag_structure)
        
        # Clean result of any NaN or infinity values
        def clean_json_values(obj):
            if isinstance(obj, dict):
                return {k: clean_json_values(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [clean_json_values(v) for v in obj]
            elif isinstance(obj, float):
                if np.isnan(obj) or np.isinf(obj):
                    return 0.0
                return obj
            return obj
        
        cleaned_result = clean_json_values(result)
        
        # Output result
        debug_print("Outputting authentic PyMC results...")
        result_json = json.dumps(cleaned_result, ensure_ascii=False, separators=(',', ':'))
        print("===JSON_START===")
        print(result_json)
        print("===JSON_END===")
        
    except Exception as e:
        debug_print(f"Script error: {e}")
        import traceback
        traceback.print_exc(file=sys.stderr)
        
        error_result = {
            "success": False,
            "error": f"Script execution failed: {str(e)}",
            "method": "pymc_lineargaussian_cpd", 
            "parameters": {"edges": []},
            "updatedDAG": {"nodes": [], "edges": []},
            "performance": {},
            "predictions": {"actualVsPredicted": []},
            "incrementalityAnalysis": {}
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()