import { getNodeTypeConfig, NodeType } from "@/lib/node-types";

const defaultChannelNodeTypes: NodeType[] = [
  "paid-search",
  "social",
  "email",
  "tv",
  "display",
  "influencer",
];

const defaultOutcomeNodeTypes: NodeType[] = [
  "revenue",
  "conversions",
  "brand-awareness",
];

interface NodePaletteProps {
  availableNodes?: {
    marketingChannels: string[];
    outcomeMetrics: string[];
  };
}

export default function NodePalette({ availableNodes }: NodePaletteProps) {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  // Show empty state when no data has been uploaded
  const hasData = availableNodes && (availableNodes.marketingChannels.length > 0 || availableNodes.outcomeMetrics.length > 0);

  if (!hasData) {
    return (
      <aside className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Data Uploaded</h3>
            <p className="text-sm text-gray-500 mb-4">Upload CSV data to generate dynamic nodes for your marketing channels and outcome metrics.</p>
            <div className="text-xs text-gray-400">
              <p>1. Click "Upload Data" button</p>
              <p>2. Categorize your columns</p>
              <p>3. Nodes will appear here</p>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Marketing Channels</h2>
        <p className="text-sm text-blue-600">From your CSV data</p>
      </div>
      
      <div className="space-y-3 mb-6">
        {availableNodes.marketingChannels.map((column, index) => {
          const nodeType = column.toLowerCase().replace(/\s+/g, '-');
          const config = getNodeTypeConfig('paid-search' as NodeType); // Use a default config for styling
          
          return (
            <div
              key={nodeType}
              className={`p-3 ${config.bgColor} border-2 border-dashed ${config.borderColor} rounded-lg cursor-move hover:${config.hoverColor} transition-colors`}
              draggable
              onDragStart={(event) => onDragStart(event, nodeType)}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 ${config.color} rounded-full`}></div>
                <span className="font-medium text-gray-700">{column}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Marketing channel from your data</p>
            </div>
          );
        })}
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Outcome Metrics</h2>
        <p className="text-sm text-blue-600">From your CSV data</p>
      </div>
      
      <div className="space-y-3">
        {availableNodes.outcomeMetrics.map((column, index) => {
          const nodeType = column.toLowerCase().replace(/\s+/g, '-');
          const config = getNodeTypeConfig('revenue' as NodeType); // Use a default config for styling
          
          return (
            <div
              key={nodeType}
              className={`p-3 ${config.bgColor} border-2 border-dashed ${config.borderColor} rounded-lg cursor-move hover:${config.hoverColor} transition-colors`}
              draggable
              onDragStart={(event) => onDragStart(event, nodeType)}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 ${config.color} rounded-full`}></div>
                <span className="font-medium text-gray-700">{column}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Outcome metric from your data</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-2">Quick Tips</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Drag nodes to canvas</li>
          <li>• Click to connect nodes</li>
          <li>• Double-click to edit</li>
          <li>• Right-click for options</li>
        </ul>
      </div>
    </aside>
  );
}
