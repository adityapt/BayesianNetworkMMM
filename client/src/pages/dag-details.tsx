import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getNodeTypeConfig } from "@/lib/node-types";
import { type CausalModel, type DAGNode, type DAGEdge } from "@shared/schema";
import { ArrowRight, Network } from "lucide-react";

interface NodeRelationship {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  parents: Array<{ id: string; name: string; type: string }>;
  children: Array<{ id: string; name: string; type: string }>;
  isChannel: boolean;
}

export default function DAGDetails() {
  const { data: models = [] } = useQuery<CausalModel[]>({
    queryKey: ["/api/models"],
  });

  // Get the most recent model for analysis
  const currentModel = models.length > 0 ? models[models.length - 1] : null;

  const getNodeRelationships = (): NodeRelationship[] => {
    if (!currentModel) return [];

    const nodes = currentModel.nodes as DAGNode[];
    const edges = currentModel.edges as DAGEdge[];

    return nodes.map((node) => {
      const config = getNodeTypeConfig(node.type);
      
      // Find parent nodes (nodes that point to this node)
      const parentEdges = edges.filter(edge => edge.target === node.id);
      const parents = parentEdges.map(edge => {
        const parentNode = nodes.find(n => n.id === edge.source);
        return parentNode ? {
          id: parentNode.id,
          name: parentNode.data.name,
          type: parentNode.type
        } : { id: edge.source, name: 'Unknown', type: 'unknown' };
      });

      // Find child nodes (nodes this node points to)
      const childEdges = edges.filter(edge => edge.source === node.id);
      const children = childEdges.map(edge => {
        const childNode = nodes.find(n => n.id === edge.target);
        return childNode ? {
          id: childNode.id,
          name: childNode.data.name,
          type: childNode.type
        } : { id: edge.target, name: 'Unknown', type: 'unknown' };
      });

      return {
        nodeId: node.id,
        nodeName: node.data.name,
        nodeType: node.type,
        parents,
        children,
        isChannel: config.isChannel,
      };
    });
  };

  const nodeRelationships = getNodeRelationships();
  const totalNodes = nodeRelationships.length;
  const totalConnections = nodeRelationships.reduce((sum, node) => sum + node.children.length, 0);
  const channelNodes = nodeRelationships.filter(node => node.isChannel);
  const outcomeNodes = nodeRelationships.filter(node => !node.isChannel);

  if (!currentModel) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Network className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No DAG Model Found</h3>
          <p className="text-gray-400">Create and save a DAG model to view the relationship details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">DAG Relationship Details</h1>
          <p className="text-gray-600 mt-2">Analysis of node relationships in "{currentModel.name}"</p>
        </div>
        <Badge variant="outline" className="text-sm">
          Model ID: {currentModel.id}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Nodes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalNodes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalConnections}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Channel Nodes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{channelNodes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Outcome Nodes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{outcomeNodes.length}</div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Relationships Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Network className="w-5 h-5" />
            <span>Node Relationships</span>
          </CardTitle>
          <CardDescription>
            Parent-child relationships showing causal flow in your marketing model
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Node</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Parent Nodes</TableHead>
                <TableHead>Child Nodes</TableHead>
                <TableHead className="text-center">Connections</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nodeRelationships.map((node) => {
                const config = getNodeTypeConfig(node.nodeType);
                return (
                  <TableRow key={node.nodeId}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 ${config.color} rounded-full`}></div>
                        <span className="font-medium">{node.nodeName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={node.isChannel ? "default" : "secondary"}>
                        {node.isChannel ? "Channel" : "Outcome"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {node.parents.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {node.parents.map((parent, index) => (
                            <Badge key={parent.id} variant="outline" className="text-xs">
                              {parent.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No parents</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {node.children.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {node.children.map((child, index) => (
                            <Badge key={child.id} variant="outline" className="text-xs">
                              {child.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No children</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <span className="text-sm text-gray-600">{node.parents.length}</span>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-gray-600">{node.children.length}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Causal Flow Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Causal Flow Analysis</CardTitle>
          <CardDescription>
            Understanding the causal relationships in your marketing model
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Root nodes (no parents) */}
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Root Nodes (Entry Points)</h4>
              <div className="flex flex-wrap gap-2">
                {nodeRelationships
                  .filter(node => node.parents.length === 0)
                  .map(node => {
                    const config = getNodeTypeConfig(node.nodeType);
                    return (
                      <Badge key={node.nodeId} variant="outline" className="flex items-center space-x-1">
                        <div className={`w-2 h-2 ${config.color} rounded-full`}></div>
                        <span>{node.nodeName}</span>
                      </Badge>
                    );
                  })}
              </div>
            </div>

            {/* Leaf nodes (no children) */}
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Leaf Nodes (End Points)</h4>
              <div className="flex flex-wrap gap-2">
                {nodeRelationships
                  .filter(node => node.children.length === 0)
                  .map(node => {
                    const config = getNodeTypeConfig(node.nodeType);
                    return (
                      <Badge key={node.nodeId} variant="outline" className="flex items-center space-x-1">
                        <div className={`w-2 h-2 ${config.color} rounded-full`}></div>
                        <span>{node.nodeName}</span>
                      </Badge>
                    );
                  })}
              </div>
            </div>

            {/* Hub nodes (multiple connections) */}
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Hub Nodes (High Connectivity)</h4>
              <div className="flex flex-wrap gap-2">
                {nodeRelationships
                  .filter(node => (node.parents.length + node.children.length) >= 2)
                  .map(node => {
                    const config = getNodeTypeConfig(node.nodeType);
                    const totalConnections = node.parents.length + node.children.length;
                    return (
                      <Badge key={node.nodeId} variant="outline" className="flex items-center space-x-1">
                        <div className={`w-2 h-2 ${config.color} rounded-full`}></div>
                        <span>{node.nodeName}</span>
                        <span className="text-xs text-gray-500">({totalConnections})</span>
                      </Badge>
                    );
                  })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}