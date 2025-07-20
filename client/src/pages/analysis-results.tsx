import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter, ReferenceLine } from "recharts";
import { TrendingUp, Target, Zap, Award, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { CausalModelAnalysis, CausalAnalysisResponse } from "@/lib/causal-modeling";
import { useDAG } from "@/contexts/dag-context";
import { Link } from "wouter";

interface AnalysisState {
  lastAnalysis: CausalAnalysisResponse | null;
  timestamp: string | null;
}

export default function AnalysisResults() {
  const [analysisState, setAnalysisState] = useState<AnalysisState>({ lastAnalysis: null, timestamp: null });
  const { dagState, clearAnalysisResults } = useDAG();

  // Load data on component mount and listen for updates
  useEffect(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem("causal-analysis-results");
    if (stored) {
      try {
        const parsedState = JSON.parse(stored);
        setAnalysisState(parsedState);
      } catch (error) {
        console.error("Failed to parse stored analysis results:", error);
      }
    }

    // Listen for new analysis results
    const handleAnalysisUpdate = (event: CustomEvent<CausalAnalysisResponse>) => {
      const newState = {
        lastAnalysis: event.detail,
        timestamp: new Date().toISOString()
      };
      setAnalysisState(newState);
      localStorage.setItem("causal-analysis-results", JSON.stringify(newState));
    };

    window.addEventListener("causal-analysis-complete" as any, handleAnalysisUpdate);
    return () => window.removeEventListener("causal-analysis-complete" as any, handleAnalysisUpdate);
  }, []);

  // Also check for updates when the page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const stored = localStorage.getItem("causal-analysis-results");
        if (stored) {
          try {
            const parsedState = JSON.parse(stored);
            setAnalysisState(parsedState);
          } catch (error) {
            console.error("Failed to parse stored analysis results:", error);
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Check if analysis has actually been run - either in this session or from stored results
  const hasValidAnalysis = analysisState.lastAnalysis && (dagState.hasRunAnalysis || analysisState.timestamp);

  if (!hasValidAnalysis) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardHeader className="text-center">
            <TrendingUp className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <CardTitle>No Analysis Results</CardTitle>
            <CardDescription className="mb-4">
              You need to run coefficient estimation from the DAG Builder to see analysis results here.
            </CardDescription>
            <div className="flex flex-col space-y-3">
              <Link href="/dag-builder">
                <Button className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go to DAG Builder
                </Button>
              </Link>
              {analysisState.lastAnalysis && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // Only clear analysis results, not DAG state
                    setAnalysisState({ lastAnalysis: null, timestamp: null });
                    localStorage.removeItem("causal-analysis-results");
                    console.log('CLEAR CACHE: Analysis results cleared, DAG state preserved');
                  }}
                  className="w-full"
                >
                  Clear Cached Results
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const analysis = analysisState.lastAnalysis;
  const updatedDAG = analysisState.lastAnalysis?.updatedDAG;
  
  // Debug the structure we're receiving
  console.log('ANALYSIS RESULTS DEBUG: Full analysis state:', analysisState.lastAnalysis);
  console.log('ANALYSIS RESULTS DEBUG: updatedDAG:', updatedDAG);
  console.log('ANALYSIS RESULTS DEBUG: updatedDAG.edges length:', updatedDAG?.edges?.length);
  console.log('ANALYSIS RESULTS DEBUG: analysis.parameters.edges length:', analysis?.parameters?.edges?.length);
  console.log('ANALYSIS RESULTS DEBUG: updatedDAG.edges detail:', updatedDAG?.edges?.map((e: any) => `${e.source}->${e.target}`));
  console.log('ANALYSIS RESULTS DEBUG: DAG state nodes:', dagState.nodes.length);
  console.log('ANALYSIS RESULTS DEBUG: Raw updatedDAG.edges data:', JSON.stringify(updatedDAG?.edges, null, 2));
  
  // Debug localStorage to see what's stored - check BOTH possible keys
  const storedAnalysis1 = localStorage.getItem('causalAnalysisResults');
  const storedAnalysis2 = localStorage.getItem('causal-analysis-results');
  console.log('STORAGE DEBUG: causalAnalysisResults exists:', !!storedAnalysis1);
  console.log('STORAGE DEBUG: causal-analysis-results exists:', !!storedAnalysis2);
  
  // Check both keys for data
  [storedAnalysis1, storedAnalysis2].forEach((stored, index) => {
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log(`STORAGE DEBUG ${index + 1}: Edges in storage:`, parsed?.updatedDAG?.edges?.length);
        console.log(`STORAGE DEBUG ${index + 1}: Edge details:`, parsed?.updatedDAG?.edges?.map((e: any) => `${e.source}->${e.target}`));
        console.log(`STORAGE DEBUG ${index + 1}: Raw edges:`, JSON.stringify(parsed?.updatedDAG?.edges, null, 2));
      } catch (e) {
        console.log(`STORAGE DEBUG ${index + 1}: Parse error:`, e);
      }
    }
  });
  
  // Extract unique nodes from edges and DAG state
  const uniqueNodesFromEdges = new Set();
  updatedDAG?.edges?.forEach((edge: any) => {
    uniqueNodesFromEdges.add(edge.source);
    uniqueNodesFromEdges.add(edge.target);
  });
  const totalNodesInModel = Math.max(uniqueNodesFromEdges.size, dagState.nodes.length);
  console.log('ANALYSIS RESULTS DEBUG: Total nodes in model:', totalNodesInModel);
  
  // CRITICAL DEBUG: Trace where analysis data is coming from
  console.log('=== ANALYSIS RESULTS DATA SOURCE DEBUG ===');
  console.log('analysisState.lastAnalysis exists:', !!analysisState.lastAnalysis);
  console.log('analysisState.lastAnalysis?.updatedDAG exists:', !!analysisState.lastAnalysis?.updatedDAG);
  console.log('analysisState.lastAnalysis?.updatedDAG?.edges length:', analysisState.lastAnalysis?.updatedDAG?.edges?.length);
  console.log('updatedDAG source:', updatedDAG === analysisState.lastAnalysis?.updatedDAG ? 'localStorage' : 'other');
  console.log('updatedDAG edges source coefficients:', updatedDAG?.edges?.map(e => `${e.source}->${e.target}: ${e.data?.coefficient}`));
  
  // Prepare chart data with comprehensive deduplication
  const rawEdges = updatedDAG?.edges || [];
  console.log('DEDUP DEBUG: Raw edges from backend:', rawEdges.length, rawEdges.map(e => `${e.source}->${e.target}`));
  console.log('BACKEND COEFF DEBUG: Raw edge coefficients from backend:', rawEdges.map(e => `${e.source}->${e.target}: ${e.data?.coefficient}`));
  
  // Create a more robust deduplication that handles both clean and timestamped node names
  const uniqueEdgeMap = new Map();
  rawEdges.forEach((edge: any) => {
    // Normalize node names by removing timestamp suffixes
    const normalizeNode = (nodeId: string) => {
      // Remove timestamp pattern like -1752982835348
      return nodeId.replace(/-\d{13,}$/, '');
    };
    
    const normalizedSource = normalizeNode(edge.source);
    const normalizedTarget = normalizeNode(edge.target);
    const edgeKey = `${normalizedSource}->${normalizedTarget}`;
    
    // Only keep the first occurrence of each normalized edge
    if (!uniqueEdgeMap.has(edgeKey)) {
      uniqueEdgeMap.set(edgeKey, {
        ...edge,
        source: normalizedSource,
        target: normalizedTarget
      });
    }
  });
  
  const uniqueEdges = Array.from(uniqueEdgeMap.values());
  console.log('DEDUP DEBUG: Unique edges after deduplication:', uniqueEdges.length, uniqueEdges.map(e => `${e.source}->${e.target}`));
  console.log('COEFF DEBUG: Edge coefficients:', uniqueEdges.map(e => `${e.source}->${e.target}: ${e.data?.coefficient}`));
  
  const coefficientData = uniqueEdges.map((edge: any) => {
    console.log('COEFF MAP DEBUG:', {
      relationship: `${edge.source}->${edge.target}`,
      coefficient: edge.data?.coefficient,
      pValue: edge.data?.pValue,
      source: edge.source,
      target: edge.target,
      fullData: edge.data
    });
    
    return {
      relationship: `${edge.source.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} → ${edge.target.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
      coefficient: edge.data?.coefficient || 0,
      confidence: edge.data?.confidence || 0,
      pValue: edge.data?.pValue || 1,
      strength: edge.data?.strength || 'weak',
      errorBars: edge.data?.standardError || 0
    };
  });

  const performanceData = [
    { metric: "R²", value: (analysisState.lastAnalysis?.performance?.rSquared || 0.5) * 100, target: 80 },
    { metric: "RMSE", value: (1 - (analysisState.lastAnalysis?.performance?.rmse || 0.3)) * 100, target: 85 },
  ];

  const strengthColors = {
    strong: "#10b981",
    medium: "#f59e0b", 
    weak: "#ef4444"
  };

  return (
    <div className="h-full overflow-auto bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Causal Analysis Results</h1>
            <p className="text-gray-600 mt-1">
              Analysis completed on {new Date(analysisState.timestamp!).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => {
                console.log('=== COMPREHENSIVE CACHE CLEAR ===');
                // Clear all possible cache keys
                ['causal-analysis-results', 'causalAnalysisResults', 'dagState'].forEach(key => {
                  const stored = localStorage.getItem(key);
                  if (stored) {
                    console.log(`Clearing ${key}:`, stored.length, 'chars');
                    localStorage.removeItem(key);
                  }
                });
                
                // Force analysis state reset
                setAnalysisState({ lastAnalysis: null, timestamp: null });
                
                // Force page reload to ensure clean state
                console.log('Forcing page reload for clean state...');
                window.location.reload();
              }}
              className="text-sm"
            >
              Debug & Clear Cache
            </Button>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-600">Analysis Complete</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="coefficients">Coefficients</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
            <TabsTrigger value="performance">Model Performance</TabsTrigger>
            <TabsTrigger value="incrementality">Incrementality</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Nodes</CardTitle>
                  <Target className="h-4 w-4 ml-auto text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalNodesInModel}</div>
                  <p className="text-xs text-muted-foreground">
                    Variables in model
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Model R²</CardTitle>
                  <TrendingUp className="h-4 w-4 ml-auto text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {((analysisState.lastAnalysis?.performance?.rSquared || 0.5) * 100).toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Variance explained
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Causal Relationships</CardTitle>
                  <Zap className="h-4 w-4 ml-auto text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{uniqueEdges.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Causal edges analyzed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Significant Relationships</CardTitle>
                  <Award className="h-4 w-4 ml-auto text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {uniqueEdges.filter((e: any) => e.data.pValue < 0.05).length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    p-value &lt; 0.05
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Coefficient Strength Overview Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Relationship Strength Distribution</CardTitle>
                <CardDescription>Overview of causal relationship strengths across your model</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={coefficientData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="relationship" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar 
                      dataKey="coefficient" 
                      fill="#8884d8"
                      name="Coefficient"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coefficients Tab */}
          <TabsContent value="coefficients" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Estimated Coefficients</CardTitle>
                <CardDescription>Statistical estimates for each causal relationship in your DAG</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {uniqueEdges.map((edge: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">
                          {edge.source.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} → {edge.target.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div className="text-sm text-gray-600">
                          Standard Error: {edge.data?.standardError?.toFixed(3) || 'N/A'}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <Badge variant={edge.data?.strength === 'strong' ? 'default' : 
                                      edge.data?.strength === 'medium' ? 'secondary' : 'outline'}>
                          {edge.data?.strength || 'medium'}
                        </Badge>
                        
                        <div className="text-right">
                          <div className="font-bold text-lg">
                            {edge.data?.coefficient?.toFixed(3) || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-600">
                            p = {edge.data?.pValue?.toFixed(3) || 'N/A'}
                          </div>
                        </div>
                        
                        <div className="w-16">
                          {(edge.data?.pValue !== undefined && edge.data.pValue < 0.05) ? 
                            <CheckCircle className="w-5 h-5 text-green-500" /> :
                            <AlertCircle className="w-5 h-5 text-yellow-500" />
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Coefficient vs P-value Scatter */}
            <Card>
              <CardHeader>
                <CardTitle>Coefficient Significance Plot</CardTitle>
                <CardDescription>Relationship between coefficient magnitude and statistical significance</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart data={coefficientData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="coefficient" name="Coefficient" />
                    <YAxis dataKey="pValue" name="P-value" />
                    <Tooltip 
                      formatter={(value, name) => [
                        typeof value === 'number' ? value.toFixed(3) : value, 
                        name
                      ]}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Scatter dataKey="pValue" fill="#8884d8" />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Relationships Tab - Parent-Child Relationships */}
          <TabsContent value="relationships" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Node Relationships</CardTitle>
                <CardDescription>Parent-child relationships in your causal DAG with estimated coefficients</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Create parent-child relationship mapping */}
                  {(() => {
                    // Group edges by target to show parent relationships
                    const nodeRelationships = new Map();
                    
                    console.log('DEBUG: Building relationships from uniqueEdges:', uniqueEdges);
                    console.log('DEBUG: Number of unique edges found:', uniqueEdges.length);
                    
                    // Initialize all unique nodes
                    const allNodes = new Set([
                      ...(uniqueEdges.map((e: any) => e.source) || []),
                      ...(uniqueEdges.map((e: any) => e.target) || [])
                    ]);
                    
                    console.log('DEBUG: All unique nodes:', Array.from(allNodes));
                    
                    allNodes.forEach(nodeId => {
                      nodeRelationships.set(nodeId, { parents: [], children: [] });
                    });
                    
                    // Populate relationships
                    uniqueEdges.forEach((edge, index) => {
                      console.log(`DEBUG: Processing edge ${index}:`, {
                        source: edge.source,
                        target: edge.target,
                        coefficient: edge.data?.coefficient,
                        pValue: edge.data?.pValue
                      });
                      
                      // Add parent relationship
                      const targetNode = nodeRelationships.get(edge.target);
                      if (targetNode) {
                        targetNode.parents.push({
                          nodeId: edge.source,
                          coefficient: edge.data.coefficient,
                          pValue: edge.data.pValue,
                          strength: edge.data.strength
                        });
                        console.log(`DEBUG: Added parent ${edge.source} to ${edge.target}`);
                      }
                      
                      // Add child relationship
                      const sourceNode = nodeRelationships.get(edge.source);
                      if (sourceNode) {
                        sourceNode.children.push({
                          nodeId: edge.target,
                          coefficient: edge.data.coefficient,
                          pValue: edge.data.pValue,
                          strength: edge.data.strength
                        });
                        console.log(`DEBUG: Added child ${edge.target} to ${edge.source}`);
                      }
                    });
                    
                    console.log('DEBUG: Final nodeRelationships:', nodeRelationships);
                    
                    return Array.from(nodeRelationships.entries()).map(([nodeId, relationships]) => (
                      <div key={nodeId} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="font-semibold text-lg">{nodeId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                          <Badge variant={nodeId.includes('spend') || nodeId.includes('search') || nodeId.includes('social') || 
                                         nodeId.includes('tv') || nodeId.includes('display') ? 'secondary' : 'default'}>
                            {nodeId.includes('spend') || nodeId.includes('search') || nodeId.includes('social') || 
                             nodeId.includes('tv') || nodeId.includes('display') ? 'Marketing Channel' : 'Outcome Metric'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Parent Nodes */}
                          <div>
                            <h4 className="font-medium text-sm text-gray-700 mb-2">Parent Nodes ({relationships.parents.length})</h4>
                            {relationships.parents.length > 0 ? (
                              <div className="space-y-2">
                                {relationships.parents.map((parent, index) => (
                                  <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded text-sm">
                                    <span className="font-medium">{parent.nodeId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                    <div className="text-right">
                                      <div className="font-semibold">β = {parent.coefficient?.toFixed(3) || 'N/A'}</div>
                                      <div className="text-xs text-gray-600">p = {parent.pValue?.toFixed(3) || 'N/A'}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-gray-400 text-sm py-2">No parent nodes</div>
                            )}
                          </div>
                          
                          {/* Child Nodes */}
                          <div>
                            <h4 className="font-medium text-sm text-gray-700 mb-2">Child Nodes ({relationships.children.length})</h4>
                            {relationships.children.length > 0 ? (
                              <div className="space-y-2">
                                {relationships.children.map((child, index) => (
                                  <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded text-sm">
                                    <span className="font-medium">{child.nodeId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                    <div className="text-right">
                                      <div className="font-semibold">β = {child.coefficient?.toFixed(3) || 'N/A'}</div>
                                      <div className="text-xs text-gray-600">p = {child.pValue?.toFixed(3) || 'N/A'}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-gray-400 text-sm py-2">No child nodes</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Model Fit Metrics</CardTitle>
                  <CardDescription>Statistical measures of model performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {performanceData.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{item.metric}</span>
                        <span>{item.value.toFixed(1)}%</span>
                      </div>
                      <Progress value={item.value} className="h-2" />
                    </div>
                  ))}
                  
                  <div className="pt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>AIC:</span>
                      <span>{analysisState.lastAnalysis?.performance?.aic?.toFixed(1) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>BIC:</span>
                      <span>{analysisState.lastAnalysis?.performance?.bic?.toFixed(1) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Log-Likelihood:</span>
                      <span>{analysisState.lastAnalysis?.performance?.logLikelihood?.toFixed(1) || 'N/A'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Model Quality Assessment</CardTitle>
                  <CardDescription>Interpretation of performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      {(analysisState.lastAnalysis?.performance?.r2 || 0) > 0.7 ? 
                        <CheckCircle className="w-5 h-5 text-green-500" /> :
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                      }
                      <div>
                        <div className="font-medium">Model Explanatory Power</div>
                        <div className="text-sm text-gray-600">
                          {(analysisState.lastAnalysis?.performance?.r2 || 0) > 0.7 ? "Excellent" : 
                           (analysisState.lastAnalysis?.performance?.r2 || 0) > 0.5 ? "Good" : "Needs improvement"}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {(analysisState.lastAnalysis?.performance?.rmse || 1) < 0.2 ? 
                        <CheckCircle className="w-5 h-5 text-green-500" /> :
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                      }
                      <div>
                        <div className="font-medium">Prediction Accuracy</div>
                        <div className="text-sm text-gray-600">
                          RMSE: {analysisState.lastAnalysis?.performance?.rmse?.toFixed(3) || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Actual vs Predicted Scatter Plot */}
            <Card>
              <CardHeader>
                <CardTitle>Actual vs Predicted</CardTitle>
                <CardDescription>
                  Scatter plot showing model accuracy - points closer to the diagonal line indicate better predictions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                      data={analysisState.lastAnalysis?.predictions?.actualVsPredicted?.map(p => ({
                        actual: p?.actual || 0,
                        predicted: p?.predicted || 0,
                        period: p?.period || '',
                        date: p?.date || ''
                      })) || []}
                      margin={{ top: 20, right: 30, bottom: 40, left: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="actual"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                        label={{ value: 'Actual Revenue', position: 'insideBottom', offset: -20 }}
                      />
                      <YAxis
                        dataKey="predicted"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                        label={{ value: 'Predicted Revenue', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        content={({ payload, label, active }) => {
                          if (active && payload && payload.length > 0) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border rounded-lg p-3 shadow-lg">
                                <p className="font-medium">{data.date}</p>
                                <p className="text-sm">
                                  <span className="text-blue-600">Actual:</span> ${data.actual?.toLocaleString()}
                                </p>
                                <p className="text-sm">
                                  <span className="text-orange-600">Predicted:</span> ${data.predicted?.toLocaleString()}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Residual: ${(data.actual - data.predicted)?.toLocaleString()}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter 
                        fill="#3b82f6" 
                        fillOpacity={0.6}
                        strokeWidth={1}
                        stroke="#1d4ed8"
                      />
                      {/* Perfect prediction line (y = x) */}
                      <ReferenceLine 
                        segment={[
                          { x: Math.min(...(analysis?.predictions?.actualVsPredicted?.map(p => p.actual) || [0])), 
                            y: Math.min(...(analysis?.predictions?.actualVsPredicted?.map(p => p.actual) || [0])) },
                          { x: Math.max(...(analysis?.predictions?.actualVsPredicted?.map(p => p.actual) || [1])), 
                            y: Math.max(...(analysis?.predictions?.actualVsPredicted?.map(p => p.actual) || [1])) }
                        ]}
                        stroke="#ef4444"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>• Red dashed line represents perfect prediction (actual = predicted)</p>
                  <p>• Points closer to the line indicate more accurate predictions</p>
                  <p>• R² = {analysis?.performance?.r2?.toFixed(3) || 'N/A'} indicates {(analysis?.performance?.r2 || 0) > 0.9 ? 'excellent' : (analysis?.performance?.r2 || 0) > 0.7 ? 'good' : 'moderate'} model fit</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incrementality Tab */}
          <TabsContent value="incrementality" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Incremental Impact</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {((analysisState.lastAnalysis?.incrementalityAnalysis?.revenue?.totalIncrementalImpact || 0) * 100).toFixed(1)}%
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    of outcomes attributable to marketing
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Baseline Effect</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-600">
                    {((analysisState.lastAnalysis?.incrementalityAnalysis?.revenue?.baselineEffect || 0) * 100).toFixed(1)}%
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    organic/baseline contribution
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Active Channels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">
                    {(analysisState.lastAnalysis?.incrementalityAnalysis?.revenue?.channelContributions || []).length}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    channels with significant impact
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Actual vs Predicted Over Time */}
            {analysis?.predictions?.actualVsPredicted && analysis.predictions.actualVsPredicted.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Actual vs Predicted Over Time</CardTitle>
                  <CardDescription>Model performance showing predicted vs actual outcomes from your data</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analysis?.predictions?.actualVsPredicted || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        fontSize={10}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          typeof value === 'number' ? value.toLocaleString() : value, 
                          name === 'actual' ? 'Actual' : name === 'predicted' ? 'Predicted' : name
                        ]}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="actual" 
                        stroke="#2563eb" 
                        strokeWidth={2}
                        name="Actual" 
                        dot={{ r: 3 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="predicted" 
                        stroke="#dc2626" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Predicted" 
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Channel Contributions */}
            <Card>
              <CardHeader>
                <CardTitle>Channel Contribution Analysis</CardTitle>
                <CardDescription>
                  Real contributions calculated as: Channel Spend × Model Coefficient
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(analysisState.lastAnalysis?.incrementalityAnalysis?.revenue?.channelContributions || []).map((data, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-semibold text-lg">{data.channel.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                        <Badge variant={data.percentageContribution > 50 ? 'default' : 
                                      data.percentageContribution > 25 ? 'secondary' : 'outline'}>
                          {data.percentageContribution > 50 ? 'High Impact' :
                           data.percentageContribution > 25 ? 'Medium Impact' : 'Low Impact'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Avg Spend</div>
                          <div className="font-semibold">${data.averageSpend?.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Coefficient</div>
                          <div className="font-semibold">{data.coefficient?.toFixed(3) || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Total Contribution</div>
                          <div className="font-semibold">${data.totalContribution?.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">% of Outcome</div>
                          <div className="font-semibold">{data.percentageContribution?.toFixed(1) || 'N/A'}%</div>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="text-xs text-gray-600 mb-1">Contribution Impact</div>
                        <Progress value={Math.min(data.percentageContribution, 100)} className="h-2" />
                      </div>
                    </div>
                  ))}
                  
                  {(analysisState.lastAnalysis?.incrementalityAnalysis?.revenue?.channelContributions || []).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No significant channel contributions found.</p>
                      <p className="text-sm">Channels need p-value &lt; 0.1 to show incrementality.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Model Interpretation */}
            <Card>
              <CardHeader>
                <CardTitle>Incremental Impact Interpretation</CardTitle>
                <CardDescription>Understanding your marketing effectiveness</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-medium">Strong Performers</h4>
                      {(analysisState.lastAnalysis?.incrementalityAnalysis?.revenue?.channelContributions || [])
                        .filter(channel => channel.coefficient > 1.0 && channel.percentageContribution > 10)
                        .map((channel, index) => (
                          <div key={index} className="flex items-center gap-3 p-2 bg-green-50 rounded">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{channel.channel.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                              <div className="text-xs text-gray-600">
                                β = {channel.coefficient?.toFixed(3) || 'N/A'}, Impact = {channel.percentageContribution?.toFixed(1) || 'N/A'}%
                              </div>
                            </div>
                          </div>
                        ))}
                      {(analysisState.lastAnalysis?.incrementalityAnalysis?.revenue?.channelContributions || [])
                        .filter(channel => channel.coefficient > 1.0 && channel.percentageContribution > 10).length === 0 && (
                        <div className="text-sm text-gray-500 italic">No strong performers identified</div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium">Needs Optimization</h4>
                      {(analysisState.lastAnalysis?.incrementalityAnalysis?.revenue?.channelContributions || [])
                        .filter(channel => channel.coefficient <= 1.0 || channel.percentageContribution <= 10)
                        .map((channel, index) => (
                          <div key={index} className="flex items-center gap-3 p-2 bg-yellow-50 rounded">
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{channel.channel.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                              <div className="text-xs text-gray-600">
                                β = {channel.coefficient?.toFixed(3) || 'N/A'}, Impact = {channel.percentageContribution?.toFixed(1) || 'N/A'}%
                              </div>
                            </div>
                          </div>
                        ))}
                      {(analysisState.lastAnalysis?.incrementalityAnalysis?.revenue?.channelContributions || [])
                        .filter(channel => channel.coefficient <= 1.0 || channel.percentageContribution <= 10).length === 0 && (
                        <div className="text-sm text-gray-500 italic">All channels performing well</div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}