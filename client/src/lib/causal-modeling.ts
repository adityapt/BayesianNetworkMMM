/**
 * Causal Modeling Integration
 * Interfaces for integrating with pgmpy and PyMC statistical modeling
 */

export interface CausalInferenceResult {
  nodeId: string;
  coefficient: number;
  confidence: number;
  pValue: number;
  confidenceInterval: [number, number];
}

export interface ParameterEstimationResult {
  edges: Array<{
    source: string;
    target: string;
    coefficient: number;
    standardError: number;
    pValue: number;
    confidenceInterval: [number, number];
  }>;
  method: 'linear_gaussian' | 'bayesian' | 'maximum_likelihood';
}

export interface ModelPerformance {
  rmse: number;
  r2: number;
  aic: number;
  bic: number;
  logLikelihood: number;
}

export interface CausalModelAnalysis {
  parameters: ParameterEstimationResult;
  nodeCoefficients: CausalInferenceResult[];
  performance: ModelPerformance;
  predictions: Record<string, number[]>;
  incrementalityAnalysis: {
    channelContributions: Record<string, number>;
    totalIncremental: number;
    baselineEffect: number;
  };
}

export interface DataUploadConfig {
  hasHeaders: boolean;
  dateColumn: string;
  targetColumns: string[];
  marketingColumns: string[];
  delimiter: string;
}

// API interfaces for backend integration
export interface CausalAnalysisRequest {
  data: any[][];
  config: DataUploadConfig;
  dagStructure: {
    nodes: Array<{ id: string; type: 'marketing' | 'outcome' }>;
    edges: Array<{ source: string; target: string }>;
  };
}

export interface CausalAnalysisResponse {
  analysis: CausalModelAnalysis;
  updatedDAG: {
    edges: Array<{ 
      source: string; 
      target: string; 
      data: { 
        coefficient: number; 
        strength: string; 
        confidence: number;
        pValue: number;
        standardError: number;
      } 
    }>;
  };
}

/**
 * Utility functions for causal modeling
 */
export class CausalModelingUtils {
  static strengthFromCoefficient(coefficient: number): 'weak' | 'medium' | 'strong' {
    const abs = Math.abs(coefficient);
    if (abs < 0.3) return 'weak';
    if (abs < 0.7) return 'medium';
    return 'strong';
  }

  static confidenceLevel(pValue: number): 'low' | 'medium' | 'high' {
    if (pValue > 0.1) return 'low';
    if (pValue > 0.05) return 'medium';
    return 'high';
  }

  static formatCoefficient(coef: number, decimals: number = 3): string {
    return coef.toFixed(decimals);
  }

  static interpretEffect(coefficient: number): string {
    if (coefficient > 0) {
      return coefficient > 0.5 ? 'Strong positive effect' : 'Positive effect';
    } else {
      return coefficient < -0.5 ? 'Strong negative effect' : 'Negative effect';
    }
  }
}