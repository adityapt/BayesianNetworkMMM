import { useState, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileSpreadsheet, TrendingUp, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CausalAnalysisRequest, CausalAnalysisResponse, DataUploadConfig } from "@/lib/causal-modeling";

interface DataUploadDialogProps {
  dagStructure: {
    nodes: Array<{ id: string; data: { nodeType: string } }>;
    edges: Array<{ source: string; target: string }>;
  };
  onAnalysisComplete: (response: CausalAnalysisResponse) => void;
  onColumnsCategorized?: (categories: {
    marketingChannels: string[];
    outcomeMetrics: string[];
  }) => void;
  onCsvDataSaved?: (data: string, config: any) => void;
}

export default function DataUploadDialog({ dagStructure, onAnalysisComplete, onColumnsCategorized, onCsvDataSaved }: DataUploadDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string>("");
  const [config, setConfig] = useState<DataUploadConfig>({
    hasHeaders: true,
    dateColumn: "",
    targetColumns: [],
    marketingColumns: [],
    delimiter: ","
  });
  const [previewData, setPreviewData] = useState<any[][] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [columns, setColumns] = useState<string[]>([]);
  const [columnCategories, setColumnCategories] = useState<Record<string, 'marketing' | 'outcome' | 'ignore'>>({});
  const [categorizationStep, setCategorizationStep] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const parseCSV = useCallback((text: string, delimiter: string = ","): any[][] => {
    const lines = text.trim().split('\n');
    return lines.map(line => {
      // Simple CSV parser - could be enhanced for proper quote handling
      return line.split(delimiter).map(cell => cell.trim());
    });
  }, []);

  const extractColumns = useCallback((parsed: any[][]) => {
    if (parsed.length > 0) {
      const headerRow = parsed[0];
      setColumns(headerRow);
      // Initialize all columns as 'ignore' by default
      const initialCategories: Record<string, 'marketing' | 'outcome' | 'ignore'> = {};
      headerRow.forEach((col: string) => {
        initialCategories[col] = 'ignore';
      });
      setColumnCategories(initialCategories);
    }
  }, []);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setCsvData(text);
        handleCSVInput(text);
      };
      reader.readAsText(uploadedFile);
    }
  }, []);

  const handleCSVInput = useCallback((input: string) => {
    setCsvData(input);
    if (input.trim()) {
      try {
        const parsed = parseCSV(input, config.delimiter);
        setPreviewData(parsed);
        extractColumns(parsed);
      } catch (error) {
        console.error("CSV parsing error:", error);
        toast({
          title: "Parse Error",
          description: "Could not parse CSV data. Please check the format.",
          variant: "destructive"
        });
      }
    } else {
      setPreviewData(null);
      setColumns([]);
      setColumnCategories({});
    }
  }, [config.delimiter, parseCSV, extractColumns, toast]);

  const updateColumnCategory = (column: string, category: 'marketing' | 'outcome' | 'ignore') => {
    setColumnCategories(prev => ({
      ...prev,
      [column]: category
    }));
  };

  const finalizeCategorization = () => {
    const marketingChannels = columns.filter(col => columnCategories[col] === 'marketing');
    const outcomeMetrics = columns.filter(col => columnCategories[col] === 'outcome');
    
    if (marketingChannels.length === 0) {
      toast({
        title: "No Marketing Channels",
        description: "Please select at least one marketing channel.",
        variant: "destructive"
      });
      return;
    }
    
    if (outcomeMetrics.length === 0) {
      toast({
        title: "No Outcome Metrics", 
        description: "Please select at least one outcome metric.",
        variant: "destructive"
      });
      return;
    }

    // Update the configuration
    setConfig(prev => ({
      ...prev,
      marketingColumns: marketingChannels,
      targetColumns: outcomeMetrics
    }));

    // Notify parent component about categorized columns
    onColumnsCategorized?.({
      marketingChannels,
      outcomeMetrics
    });

    // Save CSV data to context
    onCsvDataSaved?.(csvData, config);

    toast({
      title: "Columns Categorized",
      description: `${marketingChannels.length} marketing channels and ${outcomeMetrics.length} outcome metrics ready for DAG building.`,
    });

    setIsOpen(false);
  };

  const runCausalAnalysis = async () => {
    if (!csvData) {
      toast({
        title: "No Data",
        description: "Please upload or paste CSV data first.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const data = parseCSV(csvData, config.delimiter);
      
      const request: CausalAnalysisRequest = {
        data,
        config,
        dagStructure: {
          nodes: dagStructure.nodes.map(n => ({
            id: n.id,
            type: n.data.nodeType.includes('paid-search') || n.data.nodeType.includes('social') || 
                  n.data.nodeType.includes('email') || n.data.nodeType.includes('tv') || 
                  n.data.nodeType.includes('display') || n.data.nodeType.includes('influencer') 
                  ? 'marketing' : 'outcome'
          })),
          edges: dagStructure.edges
        }
      };

      const response = await apiRequest("POST", "/api/causal-analysis", request);
      const result = await response.json() as CausalAnalysisResponse;
      
      onAnalysisComplete(result);
      setIsOpen(false);

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
    }
  };

  const availableColumns = previewData && config.hasHeaders ? previewData[0] : [];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="w-4 h-4" />
          Upload Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Data Upload & Column Categorization
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* CSV Data Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV Data</CardTitle>
              <CardDescription>Upload your marketing mix modeling data for coefficient estimation</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                  <TabsTrigger value="paste">Paste Data</TabsTrigger>
                </TabsList>
                
                <TabsContent value="upload" className="space-y-4">
                  <div>
                    <Label htmlFor="file-upload">Choose CSV File</Label>
                    <Input
                      ref={fileInputRef}
                      id="file-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="mt-1"
                    />
                  </div>
                  {file && (
                    <div className="text-sm text-gray-600">
                      File: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="paste" className="space-y-4">
                  <div>
                    <Label htmlFor="csv-input">Paste CSV Data</Label>
                    <Textarea
                      id="csv-input"
                      placeholder="Paste your CSV data here..."
                      value={csvData}
                      onChange={(e) => handleCSVInput(e.target.value)}
                      rows={10}
                      className="mt-1 font-mono text-sm"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          {previewData && (
            <Card>
              <CardHeader>
                <CardTitle>Data Configuration</CardTitle>
                <CardDescription>Configure how to interpret your data columns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>CSV Settings</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <input
                        type="checkbox"
                        id="has-headers"
                        checked={config.hasHeaders}
                        onChange={(e) => setConfig(prev => ({ ...prev, hasHeaders: e.target.checked }))}
                      />
                      <label htmlFor="has-headers" className="text-sm">First row contains headers</label>
                    </div>
                    <Select 
                      value={config.delimiter} 
                      onValueChange={(value) => setConfig(prev => ({ ...prev, delimiter: value }))}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=",">Comma (,)</SelectItem>
                        <SelectItem value=";">Semicolon (;)</SelectItem>
                        <SelectItem value="\t">Tab</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Date Column</Label>
                    <Select 
                      value={config.dateColumn} 
                      onValueChange={(value) => setConfig(prev => ({ ...prev, dateColumn: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select date column" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableColumns.map((col: string, idx: number) => (
                          <SelectItem key={idx} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Column Categorization */}
          {previewData && columns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Column Categorization</CardTitle>
                <CardDescription>Categorize each column for dynamic node generation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">
                    Categorize columns to generate appropriate DAG nodes:
                    <ul className="mt-1 ml-4 list-disc">
                      <li><span className="font-medium text-blue-600">Marketing Channel:</span> Advertising spend or impression data</li>
                      <li><span className="font-medium text-green-600">Outcome Metric:</span> KPIs like revenue, conversions, brand awareness</li>
                      <li><span className="font-medium text-gray-500">Ignore:</span> Skip this column in analysis</li>
                    </ul>
                  </div>
                  
                  {columns.map((column, index) => (
                    <div key={column} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{column}</div>
                        <div className="text-sm text-gray-500">
                          Sample: {previewData.length > 1 && previewData[1][index] 
                            ? String(previewData[1][index]).substring(0, 20) + (String(previewData[1][index]).length > 20 ? "..." : "")
                            : "N/A"}
                        </div>
                      </div>
                      <Select
                        value={columnCategories[column] || 'ignore'}
                        onValueChange={(value: 'marketing' | 'outcome' | 'ignore') => 
                          updateColumnCategory(column, value)
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="marketing">Marketing Channel</SelectItem>
                          <SelectItem value="outcome">Outcome Metric</SelectItem>
                          <SelectItem value="ignore">Ignore</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setCategorizationStep(false);
                        setColumns([]);
                        setColumnCategories({});
                      }}
                    >
                      Back to Upload
                    </Button>
                    <Button onClick={finalizeCategorization}>
                      Create DAG Nodes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Run analysis button - only show after categorization */}
          {config.marketingColumns.length > 0 && config.targetColumns.length > 0 && (
            <div className="flex justify-center">
              <Button 
                onClick={runCausalAnalysis} 
                disabled={isAnalyzing || !csvData}
                className="gap-2"
              >
                {isAnalyzing ? "Running Analysis..." : "Estimate Coefficients"}
                <TrendingUp className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}