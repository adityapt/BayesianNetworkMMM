import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { getNodeTypeConfig } from "@/lib/node-types";
import { Edit, X } from "lucide-react";
import { useDAG } from "@/contexts/dag-context";

function DAGNode({ data, selected, id }: NodeProps) {
  const config = getNodeTypeConfig(data.nodeType);
  const isChannel = config.isChannel;
  const { dagState } = useDAG();
  
  // Check if this node is currently being processed
  const isProcessing = dagState.currentProcessingNode === id;
  const isModelRunning = dagState.isProcessingModel;
  
  // Apply processing styles
  const getBorderClass = () => {
    if (selected) return 'border-blue-500 ring-2 ring-blue-200';
    if (isProcessing) return 'border-orange-500 ring-2 ring-orange-200 animate-pulse';
    if (isModelRunning) return 'border-yellow-400 ring-1 ring-yellow-200';
    return 'border-gray-300';
  };

  return (
    <div className={`bg-white border-2 ${getBorderClass()} rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 min-w-[200px] ${isProcessing ? 'animate-pulse' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 ${config.color} rounded-full`}></div>
          <span className="font-semibold text-gray-800 text-sm">{data.name}</span>
        </div>
        <div className="flex space-x-1">
          <button className="text-gray-400 hover:text-gray-600 p-1">
            <Edit className="w-3 h-3" />
          </button>
          <button className="text-gray-400 hover:text-red-500 p-1">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
      
      <div className="text-xs text-gray-600 space-y-1">
        {isChannel && data.spend && (
          <div>Spend: <span className="font-medium">${data.spend.toLocaleString()}</span></div>
        )}
        <div>Coefficient: <span className="font-medium">{data.coefficient || 0}</span></div>
        <div>Confidence: <span className={`font-medium ${(data.confidence || 0) >= 80 ? 'text-green-600' : (data.confidence || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
          {data.confidence || 0}%
        </span></div>
        {!isChannel && data.target && (
          <>
            <div>Target: <span className="font-medium">${data.target.toLocaleString()}</span></div>
            <div>Current: <span className="font-medium text-green-600">${data.current?.toLocaleString() || '0'}</span></div>
          </>
        )}
      </div>

      {/* Connection Handles - All nodes can have both input and output */}
      <Handle
        type="target"
        position={Position.Left}
        className={`w-4 h-4 ${config.color} !border-2 !border-white`}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        className={`w-4 h-4 ${config.color} !border-2 !border-white`}
      />
    </div>
  );
}

export default memo(DAGNode);
