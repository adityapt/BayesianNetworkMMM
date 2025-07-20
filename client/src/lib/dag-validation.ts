import { type DAGNode, type DAGEdge } from "@shared/schema";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateDAG(nodes: DAGNode[], edges: DAGEdge[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for circular dependencies using DFS
  const hasCircularDependency = (): boolean => {
    const graph = new Map<string, string[]>();
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    // Build adjacency list
    for (const edge of edges) {
      if (!graph.has(edge.source)) {
        graph.set(edge.source, []);
      }
      graph.get(edge.source)!.push(edge.target);
    }

    // DFS to detect cycles
    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = graph.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    // Check each node
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) {
          return true;
        }
      }
    }

    return false;
  };

  // Validate node references in edges
  const nodeIds = new Set(nodes.map(n => n.id));
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge references invalid source node: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge references invalid target node: ${edge.target}`);
    }
  }

  // Check for circular dependencies
  if (hasCircularDependency()) {
    errors.push("Circular dependency detected in the causal model");
  }

  // Check for isolated nodes
  const connectedNodes = new Set<string>();
  for (const edge of edges) {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  }

  const isolatedNodes = nodes.filter(node => !connectedNodes.has(node.id));
  if (isolatedNodes.length > 0) {
    warnings.push(`${isolatedNodes.length} isolated node(s) with no connections`);
  }

  // Check for invalid coefficients
  for (const node of nodes) {
    if (node.data.coefficient < 0 || node.data.coefficient > 1) {
      errors.push(`Node ${node.data.name} has invalid coefficient: ${node.data.coefficient}`);
    }
  }

  // Check for channel nodes without spend
  const channelTypes = ['paid-search', 'social', 'email', 'tv', 'display', 'influencer'];
  for (const node of nodes) {
    if (channelTypes.includes(node.type)) {
      if (!node.data.spend || node.data.spend <= 0) {
        warnings.push(`Channel node ${node.data.name} has no marketing spend defined`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
