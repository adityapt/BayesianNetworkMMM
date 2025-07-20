import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { DAGProvider } from "@/contexts/dag-context";
import NotFound from "@/pages/not-found";
import DAGBuilder from "@/pages/dag-builder";
import DAGDetails from "@/pages/dag-details";
import AnalysisResults from "@/pages/analysis-results";
import { Network, Table, TrendingUp } from "lucide-react";

function Navigation() {
  const [location] = useLocation();
  
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-gray-900">Marketing Mix Modeling</h1>
        <div className="flex space-x-2 ml-8">
          <Link href="/">
            <Button 
              variant={location === "/" ? "default" : "ghost"} 
              size="sm"
              className="flex items-center space-x-2"
            >
              <Network className="w-4 h-4" />
              <span>DAG Builder</span>
            </Button>
          </Link>
          <Link href="/details">
            <Button 
              variant={location === "/details" ? "default" : "ghost"} 
              size="sm"
              className="flex items-center space-x-2"
            >
              <Table className="w-4 h-4" />
              <span>DAG Details</span>
            </Button>
          </Link>
          <Link href="/analysis">
            <Button 
              variant={location === "/analysis" ? "default" : "ghost"} 
              size="sm"
              className="flex items-center space-x-2"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Analysis Results</span>
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <div className="h-screen flex flex-col">
      <Navigation />
      <div className="flex-1 overflow-hidden">
        <Switch>
          <Route path="/" component={DAGBuilder} />
          <Route path="/builder" component={DAGBuilder} />
          <Route path="/details" component={DAGDetails} />
          <Route path="/analysis" component={AnalysisResults} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DAGProvider>
          <Toaster />
          <Router />
        </DAGProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
