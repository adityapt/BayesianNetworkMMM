import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  NodeTypes,
  Background,
  Controls,
  MiniMap,
} from "reactflow";
import "reactflow/dist/style.css";

import { useDAG } from "@/contexts/dag-context";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type CausalModel, type DAGNode, type DAGEdge } from "@shared/schema";
import { validateDAG } from "@/lib/dag-validation";
import { getNodeTypeConfig } from "@/lib/node-types";

import NodePalette from "@/components/node-palette";
import PropertiesPanel from "@/components/properties-panel";
import DAGNode from "@/components/dag-node";
import NodeEditDialog from "@/components/node-edit-dialog";
import DataUploadDialog from "@/components/data-upload-dialog";

import { Download, Save, CheckCircle, Loader2, GripVertical } from "lucide-react";
import { CausalAnalysisResponse } from "@/lib/causal-modeling";

// Move nodeTypes outside component to prevent React Flow warning
const nodeTypes: NodeTypes = {
  dagNode: DAGNode,
};

export default function DAGBuilder() {
  const { toast } = useToast();
  const { dagState, setNodes: setContextNodes, setEdges: setContextEdges, setModelName: setContextModelName, setAvailableNodes: setContextAvailableNodes, setCsvData, markClean, markDirty, clearDAG, markAnalysisRun, setProcessingState } = useDAG();
  const [nodes, setNodes, onNodesChange] = useNodesState(dagState.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(dagState.edges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ x: 0, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPropertiesPanelCollapsed, setIsPropertiesPanelCollapsed] = useState(false);

  // Global mouse event handlers for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPanelPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);


  // Sync with context when state changes
  useEffect(() => {
    setContextNodes(nodes);
  }, [nodes, setContextNodes]);

  useEffect(() => {
    setContextEdges(edges);
  }, [edges, setContextEdges]);

  // Load persisted state on mount
  useEffect(() => {
    if (dagState.nodes.length > 0) {
      setNodes(dagState.nodes);
    }
    if (dagState.edges.length > 0) {
      setEdges(dagState.edges);
    }
  }, []);

  // Load models query
  const { data: models = [] } = useQuery<CausalModel[]>({
    queryKey: ["/api/models"],
  });

  // Save model mutation
  const saveModelMutation = useMutation({
    mutationFn: async (modelData: { name: string; nodes: DAGNode[]; edges: DAGEdge[] }) => {
      const response = await apiRequest("POST", "/api/models", modelData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
      markClean();
      toast({
        title: "Model Saved",
        description: "Your causal model has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Failed to save the model. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      
      // Get source node to determine edge color
      const sourceNode = nodes.find(n => n.id === params.source);
      const sourceConfig = sourceNode ? getNodeTypeConfig(sourceNode.data.nodeType) : null;
      
      // Extract color value from Tailwind class (e.g., 'bg-blue-500' -> '#3b82f6')
      const getColorFromTailwind = (colorClass: string) => {
        const colorMap: Record<string, string> = {
          'bg-blue-500': '#3b82f6',
          'bg-green-500': '#10b981',
          'bg-purple-500': '#8b5cf6',
          'bg-red-500': '#ef4444',
          'bg-yellow-500': '#eab308',
          'bg-indigo-500': '#6366f1',
          'bg-gray-600': '#4b5563',
        };
        return colorMap[colorClass] || '#3b82f6';
      };
      
      const edgeColor = sourceConfig ? getColorFromTailwind(sourceConfig.color) : '#3b82f6';
      
      const newEdge: Edge = {
        ...params,
        id: `${params.source}-${params.target}`,
        type: "bezier",
        data: { strength: "medium", coefficient: 0.5 },
        style: { 
          stroke: edgeColor,
          strokeWidth: 2,
          strokeDasharray: '8,4',
        },
        markerEnd: {
          type: "arrowclosed",
          color: edgeColor,
        },
      };
      
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, nodes]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData("application/reactflow");
      if (!nodeType) return;

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const nodeConfig = getNodeTypeConfig(nodeType);
      const newNode: Node = {
        id: `${nodeType}-${Date.now()}`,
        type: "dagNode",
        position,
        data: {
          nodeType,
          name: nodeConfig.name,
          spend: nodeConfig.isChannel ? 10000 : undefined,
          coefficient: 0.5,
          confidence: 75,
          saturation: "diminishing",
          adstock: 0.3,
          timeLag: 0,
          ...nodeConfig.defaultData,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setIsEditDialogOpen(true);
  }, []);

  const onDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  }, [setNodes, setEdges, selectedNode]);

  const updateNodeData = useCallback((nodeId: string, newData: Partial<Node["data"]>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
      )
    );
    if (selectedNode?.id === nodeId) {
      setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, ...newData } } : null);
    }
  }, [setNodes, selectedNode]);

  const validateModel = useCallback(() => {
    const dagNodes: DAGNode[] = nodes.map((node) => ({
      id: node.id,
      type: node.data.nodeType,
      position: node.position,
      data: node.data,
    }));

    const dagEdges: DAGEdge[] = edges.map((edge) => ({
      id: edge.id!,
      source: edge.source!,
      target: edge.target!,
      data: edge.data || { strength: "medium", coefficient: 0.5 },
    }));

    const validation = validateDAG(dagNodes, dagEdges);
    
    if (validation.isValid) {
      toast({
        title: "Model Valid",
        description: "Your causal model structure is valid with no circular dependencies.",
      });
    } else {
      toast({
        title: "Model Invalid",
        description: validation.errors.join(", "),
        variant: "destructive",
      });
    }
  }, [nodes, edges, toast]);

  const saveModel = useCallback(() => {
    const dagNodes: DAGNode[] = nodes.map((node) => ({
      id: node.id,
      type: node.data.nodeType,
      position: node.position,
      data: node.data,
    }));

    const dagEdges: DAGEdge[] = edges.map((edge) => ({
      id: edge.id!,
      source: edge.source!,
      target: edge.target!,
      data: edge.data || { strength: "medium", coefficient: 0.5 },
    }));

    saveModelMutation.mutate({
      name: dagState.modelName,
      nodes: dagNodes,
      edges: dagEdges,
    });
  }, [nodes, edges, dagState.modelName, saveModelMutation]);

  const exportModel = useCallback(() => {
    const modelData = {
      name: dagState.modelName,
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.data.nodeType,
        position: node.position,
        data: node.data,
      })),
      edges: edges.map((edge) => ({
        id: edge.id!,
        source: edge.source!,
        target: edge.target!,
        data: edge.data || { strength: "medium", coefficient: 0.5 },
      })),
    };

    const blob = new Blob([JSON.stringify(modelData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dagState.modelName.replace(/\s+/g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Model Exported",
      description: "Your model has been exported as a JSON file.",
    });
  }, [dagState.modelName, nodes, edges, toast]);

  const handleColumnsCategorized = useCallback((categories: {
    marketingChannels: string[];
    outcomeMetrics: string[];
  }) => {
    setContextAvailableNodes(categories);
    toast({
      title: "Columns Categorized",
      description: `${categories.marketingChannels.length} marketing channels and ${categories.outcomeMetrics.length} outcome metrics are now available in the node palette.`,
    });
  }, [toast, setContextAvailableNodes]);

  const handleCausalAnalysis = useCallback((response: CausalAnalysisResponse) => {
    console.log('HANDLECAUSALANALYSIS DEBUG: Processing response with', response.updatedDAG.edges.length, 'edges');
    console.log('HANDLECAUSALANALYSIS DEBUG: Current frontend edges:', edges.length);
    
    // Helper function to normalize node names (remove timestamps)
    const normalizeNodeId = (nodeId: string) => {
      return nodeId.replace(/-\d{13,}$/, '');
    };
    
    // Deduplicate backend edges first
    const uniqueBackendEdges = response.updatedDAG.edges.reduce((acc, edge) => {
      const normalizedSource = normalizeNodeId(edge.source);
      const normalizedTarget = normalizeNodeId(edge.target);
      const key = `${normalizedSource}->${normalizedTarget}`;
      
      if (!acc.some(e => {
        const eNormSource = normalizeNodeId(e.source);
        const eNormTarget = normalizeNodeId(e.target);
        return `${eNormSource}->${eNormTarget}` === key;
      })) {
        acc.push({
          ...edge,
          source: normalizedSource,
          target: normalizedTarget
        });
      }
      return acc;
    }, [] as any[]);
    
    console.log('HANDLECAUSALANALYSIS DEBUG: Unique backend edges after dedup:', uniqueBackendEdges.length);
    
    // Update existing frontend edges with backend analysis data
    const updatedEdges = edges.map(frontendEdge => {
      const normalizedFrontendSource = normalizeNodeId(frontendEdge.source);
      const normalizedFrontendTarget = normalizeNodeId(frontendEdge.target);
      
      // Find matching backend edge
      const matchingBackendEdge = uniqueBackendEdges.find(backendEdge => {
        const backendSource = normalizeNodeId(backendEdge.source);
        const backendTarget = normalizeNodeId(backendEdge.target);
        return backendSource === normalizedFrontendSource && backendTarget === normalizedFrontendTarget;
      });
      
      if (matchingBackendEdge) {
        console.log('HANDLECAUSALANALYSIS DEBUG: Updating edge with analysis data:', `${normalizedFrontendSource}->${normalizedFrontendTarget}`);
        return {
          ...frontendEdge,
          data: {
            ...frontendEdge.data,
            coefficient: matchingBackendEdge.data?.coefficient || 0,
            strength: matchingBackendEdge.data?.strength as "weak" | "medium" | "strong" || "medium",
            confidence: matchingBackendEdge.data?.confidence || 0,
            pValue: matchingBackendEdge.data?.pValue || 1,
            standardError: matchingBackendEdge.data?.standardError || 0
          }
        };
      }
      
      // Return unchanged if no matching backend edge
      return frontendEdge;
    });
    
    console.log('HANDLECAUSALANALYSIS DEBUG: Final edges count:', updatedEdges.length);
    setEdges(updatedEdges);
    markDirty();
    markAnalysisRun(); // Mark that analysis has been completed
    
    // Debug the response structure before emitting
    console.log('FRONTEND DEBUG: Current DAG edges before update:', edges.length);
    console.log('FRONTEND DEBUG: Current DAG edges:', edges.map(e => `${e.source}->${e.target}`));
    console.log('FRONTEND DEBUG: Analysis response structure:', {
      hasAnalysis: !!response.analysis,
      hasUpdatedDAG: !!response.updatedDAG,
      updatedDAGEdges: response.updatedDAG?.edges?.length || 0,
      analysisParametersEdges: response.analysis?.parameters?.edges?.length || 0
    });
    
    console.log('FRONTEND DEBUG: Full updatedDAG.edges:', response.updatedDAG?.edges);
    console.log('FRONTEND DEBUG: updatedDAG.edges details:', response.updatedDAG?.edges?.map(e => `${e.source}->${e.target} (β=${e.data?.coefficient?.toFixed(3)})`));
    console.log('FRONTEND DEBUG: Updated DAG edges after processing:', updatedEdges.length);
    console.log('FRONTEND DEBUG: Updated edges:', updatedEdges.map(e => `${e.source}->${e.target}`));
    
    // CRITICAL FIX: Use original backend edges with real coefficients, not frontend edges with 0.5 defaults
    console.log('CRITICAL FIX DEBUG: Using original backend edges with real coefficients');
    console.log('CRITICAL FIX DEBUG: Backend edges:', response.updatedDAG?.edges?.map(e => `${e.source}->${e.target}: β=${e.data?.coefficient}`));
    
    const enhancedResponse = {
      ...response,
      updatedDAG: {
        ...response.updatedDAG,
        edges: response.updatedDAG?.edges || [] // Use original backend edges with real coefficients
      }
    };
    
    // Emit custom event for Analysis Results page to listen
    const analysisCompleteEvent = new CustomEvent("causal-analysis-complete", {
      detail: enhancedResponse
    });
    window.dispatchEvent(analysisCompleteEvent);
    
    // CRITICAL: Clear old localStorage data before storing new results  
    console.log('CRITICAL: Clearing old localStorage data...');
    localStorage.removeItem("causal-analysis-results");
    localStorage.removeItem("causalAnalysisResults");
    
    // Store fresh analysis results with real coefficients
    const analysisState = {
      lastAnalysis: enhancedResponse,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem("causal-analysis-results", JSON.stringify(analysisState));
    console.log('CRITICAL: Stored fresh analysis with coefficients:', enhancedResponse.updatedDAG?.edges?.map(e => `${e.source}->${e.target}: β=${e.data?.coefficient}`));
    
    console.log('FRONTEND DEBUG: Stored in localStorage:', analysisState);
    
    toast({
      title: "Coefficients Updated",
      description: `Updated ${response.updatedDAG.edges.length} edge coefficients from statistical analysis.`,
    });
  }, [edges, setEdges, markDirty, toast]);

  const runEstimateCoefficients = useCallback(async () => {
    if (!dagState.csvData || !dagState.csvConfig) {
      toast({
        title: "No Data Available",
        description: "Please upload CSV data first before estimating coefficients.",
        variant: "destructive"
      });
      return;
    }

    if (nodes.length === 0) {
      toast({
        title: "No DAG Nodes",
        description: "Please add nodes to your DAG before running analysis.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setProcessingState(true);
    
    try {
      const parseCSV = (text: string, delimiter: string = ","): any[][] => {
        const lines = text.trim().split('\n');
        return lines.map(line => {
          return line.split(delimiter).map(cell => cell.trim());
        });
      };

      const data = parseCSV(dagState.csvData, dagState.csvConfig.delimiter);
      
      console.log('=== FRONTEND REQUEST DEBUG ===');
      console.log('CSV data rows:', data.length);
      console.log('CSV columns:', data[0]);
      console.log('Nodes to send:', nodes.length);
      console.log('Node IDs:', nodes.map(n => n.id));
      console.log('Edges to send:', edges.length);
      console.log('Edges detail:', edges.map(e => `${e.source}->${e.target}`));
      console.log('CRITICAL: Full edges structure being sent:', JSON.stringify(edges, null, 2));
      
      // Double check edges before sending
      if (edges.length !== 3) {
        console.error('FRONTEND ERROR: Expected 3 edges but found', edges.length);
        console.error('Missing edges - check your DAG connections!');
      }
      
      const request = {
        data,
        config: dagState.csvConfig,
        dagStructure: {
          nodes: nodes.map(n => ({
            id: n.id,
            type: n.data.nodeType.includes('paid-search') || n.data.nodeType.includes('social') || 
                  n.data.nodeType.includes('email') || n.data.nodeType.includes('tv') || 
                  n.data.nodeType.includes('display') || n.data.nodeType.includes('influencer') 
                  ? 'marketing' : 'outcome'
          })),
          edges: edges
        }
      };
      
      console.log('CRITICAL: Final request dagStructure.edges:', JSON.stringify(request.dagStructure.edges, null, 2));

      // Start processing individual nodes during analysis
      setProcessingState(true, "Analyzing relationships...");
      
      // Simulate processing ALL nodes involved in relationships for visual feedback
      const allNodeIds = [...new Set([
        ...edges.map(e => e.source),
        ...edges.map(e => e.target)
      ])];
      
      console.log('Node flashing sequence:', allNodeIds);
      
      for (let i = 0; i < allNodeIds.length; i++) {
        const nodeId = allNodeIds[i];
        console.log(`Flashing node ${i + 1}/${allNodeIds.length}: ${nodeId}`);
        setProcessingState(true, nodeId);
        await new Promise(resolve => setTimeout(resolve, 800)); // Longer delay for visibility
      }
      
      const response = await apiRequest("POST", "/api/causal-analysis", request);
      const result = await response.json();
      
      console.log('=== BACKEND RESPONSE DEBUG ===');
      console.log('Full backend response:', result);
      console.log('result.analysis:', result.analysis);
      console.log('result.updatedDAG:', result.updatedDAG);
      console.log('result.updatedDAG.edges:', result.updatedDAG?.edges);
      console.log('Number of edges in response:', result.updatedDAG?.edges?.length);
      
      handleCausalAnalysis(result);

      // Mark analysis as run in DAG context
      markAnalysisRun();

      toast({
        title: "Analysis Complete",
        description: "Causal coefficients estimated successfully using PyMC + pgmpy approach.",
      });
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
      setProcessingState(false);
    }
  }, [dagState.csvData, dagState.csvConfig, nodes, edges, handleCausalAnalysis, toast]);

  const modelSummary = useMemo(() => {
    const totalSpend = nodes.reduce((sum, node) => {
      return sum + (node.data.spend || 0);
    }, 0);

    return {
      totalNodes: nodes.length,
      totalConnections: edges.length,
      totalSpend,
      isValid: validateDAG(
        nodes.map((n) => ({ id: n.id, type: n.data.nodeType, position: n.position, data: n.data })),
        edges.map((e) => ({ id: e.id!, source: e.source!, target: e.target!, data: e.data || { strength: "medium", coefficient: 0.5 } }))
      ).isValid,
    };
  }, [nodes, edges]);

  return (
    <div className="flex h-full bg-gray-50">
      {/* Floating Unified Toolbar */}
      <div 
        className="fixed z-20 bg-white rounded-lg shadow-lg border border-gray-200 p-3"
        style={{ 
          left: `calc(50% + ${panelPosition.x}px)`, 
          top: `${20 + panelPosition.y}px`,
          transform: 'translateX(-50%)',
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        <div className="flex items-center space-x-2">
          <div 
            className="cursor-grab hover:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
            onMouseDown={(e) => {
              setIsDragging(true);
              setDragStart({ x: e.clientX - panelPosition.x, y: e.clientY - panelPosition.y });
              e.preventDefault();
            }}
          >
            <GripVertical className="w-4 h-4" />
          </div>
          
          <DataUploadDialog 
            dagStructure={{
              nodes: nodes,
              edges: edges
            }}
            onAnalysisComplete={handleCausalAnalysis}
            onColumnsCategorized={handleColumnsCategorized}
            onCsvDataSaved={setCsvData}
          />
          
          <Button variant="outline" size="sm" onClick={exportModel}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              // Create sample data download
              const csvContent = "date,paid_search_spend,social_media_spend,email_spend,tv_spend,display_spend,influencer_spend,revenue,conversions,brand_awareness\n2024-01-01,12500,8300,2100,25000,5400,3200,145000,892,0.23\n2024-01-08,13200,7800,2200,27000,5100,2900,152000,945,0.25";
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'sample_mmm_data.csv';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Sample Data
          </Button>
          
          <Button 
            variant="default" 
            size="sm"
            onClick={saveModel}
            disabled={saveModelMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saveModelMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Model
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={clearDAG}
          >
            Clear DAG
          </Button>
          
          {dagState.availableNodes && (dagState.availableNodes.marketingChannels.length > 0 || dagState.availableNodes.outcomeMetrics.length > 0) && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={runEstimateCoefficients}
              disabled={isAnalyzing || dagState.isProcessingModel}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isAnalyzing || dagState.isProcessingModel ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {dagState.currentProcessingNode ? `Processing ${dagState.currentProcessingNode}...` : 'Estimating...'}
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Estimate Coefficients
                </>
              )}
            </Button>
          )}
        </div>
      </div>


      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Node Palette */}
        <NodePalette availableNodes={dagState.availableNodes} />

        {/* Canvas */}
        <main className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-gray-50"
            defaultEdgeOptions={{
              type: "bezier",
              style: { 
                strokeDasharray: '8,4',
                strokeWidth: 2,
                stroke: dagState.isProcessingModel ? '#f59e0b' : '#6b7280',
              },
              markerEnd: {
                type: "arrowclosed",
              },
              className: dagState.isProcessingModel ? 'animate-pulse' : '',
            }}
          >
            <Background color="#e5e7eb" gap={20} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </main>

        {/* Collapsible Properties Panel */}
        <PropertiesPanel
          selectedNode={selectedNode}
          modelSummary={modelSummary}
          onUpdateNode={updateNodeData}
          onDeleteNode={onDeleteNode}
          isCollapsed={isPropertiesPanelCollapsed}
          onToggleCollapse={() => setIsPropertiesPanelCollapsed(!isPropertiesPanelCollapsed)}
        />
      </div>

      {/* Edit Dialog */}
      <NodeEditDialog
        node={selectedNode}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSave={updateNodeData}
      />
    </div>
  );
}
