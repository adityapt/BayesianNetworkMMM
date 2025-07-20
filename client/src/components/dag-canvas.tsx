import { useCallback } from "react";
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  NodeTypes,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";

import { Button } from "@/components/ui/button";
import { getNodeTypeConfig } from "@/lib/node-types";
import DAGNode from "@/components/dag-node";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

const nodeTypes: NodeTypes = {
  dagNode: DAGNode,
};

interface DAGCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: Connection) => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onNodeDoubleClick: (event: React.MouseEvent, node: Node) => void;
  onDrop: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
}

export default function DAGCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onNodeDoubleClick,
  onDrop,
  onDragOver,
}: DAGCanvasProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const onConnectHandler = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      
      // Determine edge strength based on source and target node types
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);
      
      let strength = "medium";
      if (sourceNode && targetNode) {
        const sourceConfig = getNodeTypeConfig(sourceNode.data.nodeType);
        const coefficient = sourceNode.data.coefficient || 0.5;
        
        if (coefficient >= 0.7) strength = "strong";
        else if (coefficient <= 0.4) strength = "weak";
      }
      
      const newEdge: Edge = {
        ...params,
        id: `${params.source}-${params.target}`,
        type: "smoothstep",
        data: { strength, coefficient: sourceNode?.data.coefficient || 0.5 },
        style: { 
          strokeWidth: strength === "strong" ? 4 : strength === "weak" ? 1 : 2,
          strokeDasharray: strength === "weak" ? "5,5" : undefined,
        },
        markerEnd: {
          type: "arrowclosed",
          color: "hsl(207, 90%, 54%)",
        },
      };
      
      onConnect(newEdge);
    },
    [nodes, onConnect]
  );

  return (
    <main className="flex-1 relative bg-gray-50">
      {/* Canvas Controls */}
      <div className="absolute top-6 left-6 z-10 flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => zoomIn()}
          className="bg-white border border-gray-200 hover:bg-gray-50"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => zoomOut()}
          className="bg-white border border-gray-200 hover:bg-gray-50"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fitView()}
          className="bg-white border border-gray-200 hover:bg-gray-50"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnectHandler}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-50"
        defaultEdgeOptions={{
          type: "smoothstep",
          markerEnd: {
            type: "arrowclosed",
            color: "hsl(207, 90%, 54%)",
          },
        }}
      >
        <Background 
          color="hsl(229, 84%, 5%)" 
          gap={20} 
          opacity={0.1}
        />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            const config = getNodeTypeConfig(node.data.nodeType);
            return config.color.replace('bg-', '#').replace('-500', '');
          }}
          className="bg-white border border-gray-200"
        />
      </ReactFlow>

      {/* Canvas instructions - show when no nodes */}
      {nodes.length === 0 && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg p-4 shadow-lg pointer-events-none">
          <p className="text-sm text-gray-600 text-center flex items-center">
            <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3.5M3 16.5h18" />
            </svg>
            Drag nodes from the sidebar to build your causal model
          </p>
        </div>
      )}
    </main>
  );
}
