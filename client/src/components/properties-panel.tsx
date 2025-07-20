import { Node } from "reactflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getNodeTypeConfig } from "@/lib/node-types";
import { MousePointer, Save, RotateCcw, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";

interface PropertiesPanelProps {
  selectedNode: Node | null;
  modelSummary: {
    totalNodes: number;
    totalConnections: number;
    totalSpend: number;
    isValid: boolean;
  };
  onUpdateNode: (nodeId: string, data: Partial<Node["data"]>) => void;
  onDeleteNode: (nodeId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function PropertiesPanel({
  selectedNode,
  modelSummary,
  onUpdateNode,
  onDeleteNode,
  isCollapsed = false,
  onToggleCollapse,
}: PropertiesPanelProps) {
  // Collapsed state
  if (isCollapsed) {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="absolute right-0 top-4 z-10 bg-white border border-gray-200 rounded-l-md rounded-r-none shadow-md hover:bg-gray-50"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  const renderSelectedNodePanel = () => {
    if (!selectedNode) return null;

    const config = getNodeTypeConfig(selectedNode.data.nodeType);
    const isChannel = config.isChannel;

    const updateField = (field: string, value: any) => {
      onUpdateNode(selectedNode.id, { [field]: value });
    };

    // Calculate mock incrementality
    const directImpact = isChannel ? (selectedNode.data.spend || 0) * (selectedNode.data.coefficient || 0) : 0;
    const indirectImpact = directImpact * 0.2;
    const totalIncrementality = directImpact + indirectImpact;
    const roas = selectedNode.data.spend ? totalIncrementality / selectedNode.data.spend : 0;

    return (
      <>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Node Properties</h2>
        
        {/* Node Info */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className={`w-4 h-4 ${config.color} rounded-full`}></div>
            <span className="font-medium text-gray-800">{selectedNode.data.name}</span>
            <Badge variant={isChannel ? "default" : "secondary"}>
              {isChannel ? "Channel" : "Outcome"}
            </Badge>
          </div>
        </div>

        {/* Basic Properties */}
        <div className="space-y-4 mb-6">
          <div>
            <Label htmlFor="name" className="text-sm font-medium text-gray-700 mb-2">
              Node Name
            </Label>
            <Input
              id="name"
              value={selectedNode.data.name || ""}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full"
            />
          </div>

          {isChannel && (
            <div>
              <Label htmlFor="spend" className="text-sm font-medium text-gray-700 mb-2">
                Marketing Spend ($)
              </Label>
              <Input
                id="spend"
                type="number"
                value={selectedNode.data.spend || ""}
                onChange={(e) => updateField("spend", parseInt(e.target.value) || 0)}
                className="w-full"
              />
            </div>
          )}

          <div>
            <Label htmlFor="coefficient" className="text-sm font-medium text-gray-700 mb-2">
              Effect Coefficient
            </Label>
            <Input
              id="coefficient"
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={selectedNode.data.coefficient || ""}
              onChange={(e) => updateField("coefficient", parseFloat(e.target.value) || 0)}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Impact strength on connected outcomes</p>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2">
              Confidence Level ({selectedNode.data.confidence || 0}%)
            </Label>
            <Slider
              value={[selectedNode.data.confidence || 0]}
              onValueChange={(value) => updateField("confidence", value[0])}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        {/* Incrementality Analysis for channels */}
        {isChannel && (
          <>
            <Separator className="my-6" />
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-base font-semibold text-gray-800 mb-4">Incrementality Analysis</h3>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Direct Impact</span>
                  <span className="text-sm font-medium text-green-600">
                    +${directImpact.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Indirect Impact</span>
                  <span className="text-sm font-medium text-blue-600">
                    +${indirectImpact.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Incrementality</span>
                  <span className="text-sm font-medium text-gray-800">
                    +${totalIncrementality.toLocaleString()}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">ROAS</span>
                  <span className={`text-sm font-semibold ${roas >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                    {roas.toFixed(2)}x
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-6">
          <Button className="flex-1" variant="destructive" onClick={() => onDeleteNode(selectedNode.id)}>
            Delete Node
          </Button>
        </div>
      </>
    );
  };

  return (
    <aside className="relative w-96 bg-white border-l border-gray-200 overflow-y-auto">
      {/* Collapse Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleCollapse}
        className="absolute right-2 top-2 z-10 hover:bg-gray-100"
        title="Collapse panel"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>

      <div className="p-6">
        {!selectedNode ? (
          <>
            <div className="text-center py-12">
              <MousePointer className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">No Node Selected</h3>
              <p className="text-gray-400">Click on a node to view and edit its properties</p>
            </div>

            <div className="mt-8 border-t border-gray-200 pt-6">
              <h3 className="text-base font-semibold text-gray-800 mb-4">Model Summary</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Nodes</span>
                  <span className="text-sm font-medium">{modelSummary.totalNodes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Connections</span>
                  <span className="text-sm font-medium">{modelSummary.totalConnections}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Spend</span>
                  <span className="text-sm font-medium">${modelSummary.totalSpend.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Model Status</span>
                  <span className={`text-sm font-medium flex items-center ${modelSummary.isValid ? 'text-green-600' : 'text-red-600'}`}>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {modelSummary.isValid ? 'Valid' : 'Invalid'}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          renderSelectedNodePanel()
        )}
      </div>
    </aside>
  );
}