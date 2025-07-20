export type NodeType = 
  | 'paid-search' 
  | 'social' 
  | 'email' 
  | 'tv' 
  | 'display' 
  | 'influencer'
  | 'revenue' 
  | 'conversions' 
  | 'brand-awareness';

export interface NodeTypeConfig {
  name: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  hoverColor: string;
  isChannel: boolean;
  defaultData: Record<string, any>;
}

const nodeTypeConfigs: Record<NodeType, NodeTypeConfig> = {
  'paid-search': {
    name: 'Paid Search',
    description: 'Google Ads, Bing Ads',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    hoverColor: 'bg-blue-100',
    isChannel: true,
    defaultData: { spend: 50000, coefficient: 0.75, confidence: 85 },
  },
  'social': {
    name: 'Social Media',
    description: 'Facebook, Instagram, Twitter',
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    hoverColor: 'bg-green-100',
    isChannel: true,
    defaultData: { spend: 30000, coefficient: 0.45, confidence: 72 },
  },
  'email': {
    name: 'Email Marketing',
    description: 'Campaigns, Newsletters',
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    hoverColor: 'bg-purple-100',
    isChannel: true,
    defaultData: { spend: 15000, coefficient: 0.90, confidence: 91 },
  },
  'tv': {
    name: 'TV Advertising',
    description: 'Linear, Connected TV',
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    hoverColor: 'bg-red-100',
    isChannel: true,
    defaultData: { spend: 100000, coefficient: 0.60, confidence: 78 },
  },
  'display': {
    name: 'Display',
    description: 'Banner, Video, Native',
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    hoverColor: 'bg-yellow-100',
    isChannel: true,
    defaultData: { spend: 25000, coefficient: 0.35, confidence: 65 },
  },
  'influencer': {
    name: 'Influencer',
    description: 'Sponsored content',
    color: 'bg-indigo-500',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    hoverColor: 'bg-indigo-100',
    isChannel: true,
    defaultData: { spend: 20000, coefficient: 0.55, confidence: 70 },
  },
  'revenue': {
    name: 'Revenue',
    description: 'Total revenue impact',
    color: 'bg-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    hoverColor: 'bg-gray-100',
    isChannel: false,
    defaultData: { target: 500000, current: 465000, lift: 12.5 },
  },
  'conversions': {
    name: 'Conversions',
    description: 'Conversion events',
    color: 'bg-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    hoverColor: 'bg-gray-100',
    isChannel: false,
    defaultData: { target: 10000, current: 9200, lift: 8.5 },
  },
  'brand-awareness': {
    name: 'Brand Awareness',
    description: 'Brand lift metrics',
    color: 'bg-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    hoverColor: 'bg-gray-100',
    isChannel: false,
    defaultData: { target: 75, current: 68, lift: 5.2 },
  },
};

export function getNodeTypeConfig(nodeType: string): NodeTypeConfig {
  // If it's a predefined node type, return its config
  if (nodeType in nodeTypeConfigs) {
    return nodeTypeConfigs[nodeType as NodeType];
  }
  
  // For dynamic node types from CSV data, create a default config
  const isChannelType = !['revenue', 'conversions', 'brand-awareness', 'visits', 'sales', 'leads', 'signups'].some(
    outcome => nodeType.toLowerCase().includes(outcome)
  );
  
  return {
    name: nodeType.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    description: isChannelType ? 'Marketing channel from your data' : 'Outcome metric from your data',
    color: isChannelType ? 'bg-blue-500' : 'bg-green-500',
    bgColor: isChannelType ? 'bg-blue-50' : 'bg-green-50',
    borderColor: isChannelType ? 'border-blue-200' : 'border-green-200',
    hoverColor: isChannelType ? 'bg-blue-100' : 'bg-green-100',
    isChannel: isChannelType,
    defaultData: isChannelType ? { spend: 10000, coefficient: 0.5, confidence: 75 } : { coefficient: 0.5, confidence: 75 },
  };
}
