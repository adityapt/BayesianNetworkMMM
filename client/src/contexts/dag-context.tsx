import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Node, Edge } from "reactflow";

interface DAGState {
  nodes: Node[];
  edges: Edge[];
  modelName: string;
  lastSaved: string | null;
  isDirty: boolean;
  availableNodes?: {
    marketingChannels: string[];
    outcomeMetrics: string[];
  };
  csvData?: string;
  csvConfig?: {
    hasHeaders: boolean;
    delimiter: string;
    dateColumn: string;
    targetColumns: string[];
    marketingColumns: string[];
  };
  hasRunAnalysis?: boolean;
  lastAnalysisTimestamp?: string;
  isProcessingModel?: boolean;
  currentProcessingNode?: string;
  processingParents?: string[];
}

interface DAGContextType {
  dagState: DAGState;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setModelName: (name: string) => void;
  setAvailableNodes: (nodes: { marketingChannels: string[]; outcomeMetrics: string[]; }) => void;
  setCsvData: (data: string, config: any) => void;
  markDirty: () => void;
  markClean: () => void;
  loadFromStorage: () => void;
  clearDAG: () => void;
  markAnalysisRun: () => void;
  clearAnalysisResults: () => void;
  setProcessingState: (isProcessing: boolean, currentNode?: string, parents?: string[]) => void;
}

const DAGContext = createContext<DAGContextType | undefined>(undefined);

const STORAGE_KEY = "dag-builder-state";

const initialState: DAGState = {
  nodes: [],
  edges: [],
  modelName: "New Marketing Model",
  lastSaved: null,
  isDirty: false,
  availableNodes: undefined,
  hasRunAnalysis: false,
  lastAnalysisTimestamp: undefined,
  isProcessingModel: false,
  currentProcessingNode: undefined,
  processingParents: undefined,
};

export function DAGProvider({ children }: { children: ReactNode }) {
  const [dagState, setDagState] = useState<DAGState>(initialState);

  // Load from localStorage on mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (dagState.nodes.length > 0 || dagState.edges.length > 0 || dagState.isDirty) {
      console.log('DAG SAVE DEBUG: Saving state with edges:', dagState.edges?.length);
      console.log('DAG SAVE DEBUG: Edge details:', dagState.edges?.map(e => `${e.source}->${e.target}`));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dagState));
    }
  }, [dagState]);

  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedState = JSON.parse(stored);
        console.log('DAG LOAD DEBUG: Loading from storage with edges:', parsedState.edges?.length);
        console.log('DAG LOAD DEBUG: Edge details:', parsedState.edges?.map((e: any) => `${e.source}->${e.target}`));
        
        // Clear availableNodes from cached state to force empty node palette
        parsedState.availableNodes = undefined;
        parsedState.hasRunAnalysis = false;
        parsedState.lastAnalysisTimestamp = undefined;
        setDagState(parsedState);
        
        console.log('DAG LOAD DEBUG: State set with edges:', parsedState.edges?.length);
      }
    } catch (error) {
      console.error("Failed to load DAG state from storage:", error);
    }
  };

  const setNodes = (nodes: Node[]) => {
    setDagState(prev => ({
      ...prev,
      nodes,
      isDirty: true,
    }));
  };

  const setEdges = (edges: Edge[]) => {
    setDagState(prev => ({
      ...prev,
      edges,
      isDirty: true,
    }));
  };

  const setModelName = (name: string) => {
    setDagState(prev => ({
      ...prev,
      modelName: name,
      isDirty: true,
    }));
  };

  const setAvailableNodes = (nodes: { marketingChannels: string[]; outcomeMetrics: string[]; }) => {
    setDagState(prev => ({
      ...prev,
      availableNodes: nodes,
      isDirty: true,
    }));
  };

  const setCsvData = (data: string, config: any) => {
    setDagState(prev => ({
      ...prev,
      csvData: data,
      csvConfig: config,
      isDirty: true,
    }));
  };

  const markDirty = () => {
    setDagState(prev => ({
      ...prev,
      isDirty: true,
    }));
  };

  const markClean = () => {
    setDagState(prev => ({
      ...prev,
      isDirty: false,
      lastSaved: new Date().toISOString(),
    }));
  };

  const clearDAG = () => {
    setDagState(initialState);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("causal-analysis-results");
  };

  const markAnalysisRun = () => {
    setDagState(prev => ({
      ...prev,
      hasRunAnalysis: true,
      lastAnalysisTimestamp: new Date().toISOString()
    }));
  };

  const clearAnalysisResults = () => {
    setDagState(prev => ({
      ...prev,
      hasRunAnalysis: false,
      lastAnalysisTimestamp: undefined
    }));
    // Clear stored analysis results
    localStorage.removeItem("causal-analysis-results");
  };

  const setProcessingState = (isProcessing: boolean, currentNode?: string, parents?: string[]) => {
    console.log('DAG CONTEXT: Setting processing state - isProcessing:', isProcessing, 'currentNode:', currentNode);
    setDagState(prev => ({
      ...prev,
      isProcessingModel: isProcessing,
      currentProcessingNode: currentNode,
      processingParents: parents
    }));
  };

  const contextValue: DAGContextType = {
    dagState,
    setNodes,
    setEdges,
    setModelName,
    setAvailableNodes,
    setCsvData,
    markDirty,
    markClean,
    loadFromStorage,
    clearDAG,
    markAnalysisRun,
    clearAnalysisResults,
    setProcessingState,
  };

  return (
    <DAGContext.Provider value={contextValue}>
      {children}
    </DAGContext.Provider>
  );
}

export function useDAG() {
  const context = useContext(DAGContext);
  if (context === undefined) {
    throw new Error("useDAG must be used within a DAGProvider");
  }
  return context;
}