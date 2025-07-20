import type { Express } from "express";
import { createServer, type Server } from "http";
import { spawn } from "child_process";
import { storage } from "./storage";
import { insertCausalModelSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all causal models
  app.get("/api/models", async (req, res) => {
    try {
      const models = await storage.getAllCausalModels();
      res.json(models);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch models" });
    }
  });

  // Get a specific causal model
  app.get("/api/models/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid model ID" });
      }

      const model = await storage.getCausalModel(id);
      if (!model) {
        return res.status(404).json({ message: "Model not found" });
      }

      res.json(model);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch model" });
    }
  });

  // Create a new causal model
  app.post("/api/models", async (req, res) => {
    try {
      const validatedData = insertCausalModelSchema.parse(req.body);
      const model = await storage.createCausalModel(validatedData);
      res.status(201).json(model);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid model data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create model" });
    }
  });

  // Update a causal model
  app.patch("/api/models/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid model ID" });
      }

      const validatedData = insertCausalModelSchema.partial().parse(req.body);
      const model = await storage.updateCausalModel(id, validatedData);
      
      if (!model) {
        return res.status(404).json({ message: "Model not found" });
      }

      res.json(model);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid model data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update model" });
    }
  });

  // Delete a causal model
  app.delete("/api/models/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid model ID" });
      }

      const deleted = await storage.deleteCausalModel(id);
      if (!deleted) {
        return res.status(404).json({ message: "Model not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete model" });
    }
  });

  // Causal analysis endpoint - performs actual statistical regression analysis
  app.post("/api/causal-analysis", async (req, res) => {
    try {
      const { data, config, dagStructure } = req.body;
      
      console.log('=== ROUTES DEBUG: Incoming Request ===');
      console.log('Data type:', typeof data);
      console.log('Data preview:', typeof data === 'string' ? data.substring(0, 100) : 'Not a string');
      console.log('Config:', config);
      console.log('DAG Structure edges:', dagStructure?.edges?.length || 0);
      console.log('DAG edges detail:', dagStructure?.edges?.map(e => `${e.source}->${e.target}`) || []);
      
      if (!data || !config || !dagStructure) {
        return res.status(400).json({ message: "Missing required data, config, or DAG structure" });
      }

      // Handle both CSV string and pre-parsed array data
      let parsedData: string[][];
      if (typeof data === 'string') {
        console.log('Processing CSV string data');
        const rows = data.trim().split('\n');
        parsedData = rows.map(row => row.split(config.delimiter || ','));
      } else if (Array.isArray(data) && Array.isArray(data[0])) {
        console.log('Processing pre-parsed array data');
        parsedData = data;
      } else {
        console.log('Invalid data format:', typeof data, Array.isArray(data));
        return res.status(400).json({ message: "Data must be CSV string or array of arrays" });
      }

      console.log('Parsed data rows:', parsedData.length);
      
      if (parsedData.length === 0) {
        return res.status(400).json({ message: "No data rows found" });
      }

      // Call authentic PyMC + pgmpy causal analysis script
      console.log('=== CALLING AUTHENTIC PYMC SCRIPT: server/causal_analysis_pymc_authentic.py ===');
      const python = spawn('poetry', ['run', 'python', 'server/causal_analysis_pymc_authentic.py'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd(),
        env: { 
          ...process.env, 
          PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}`,
          OMP_NUM_THREADS: '4',
          MKL_NUM_THREADS: '4',
          NUMBA_NUM_THREADS: '4',
          OPENBLAS_NUM_THREADS: '4'
        }
      });

      const inputData = JSON.stringify({
        data: parsedData,
        config,
        dagStructure
      });

      python.stdin.write(inputData);
      python.stdin.end();

      let output = '';
      let errorOutput = '';

      python.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      python.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      let responseHandled = false;

      python.on('close', (code: number) => {
        if (responseHandled) return;
        responseHandled = true;
        
        if (code !== 0) {
          console.error('Python causal analysis error:', errorOutput);
          return res.status(500).json({ 
            message: "Causal analysis failed", 
            error: errorOutput || "Unknown error occurred" 
          });
        }

        try {
          // Extract clean JSON from marked output
          const jsonStart = output.indexOf('===JSON_START===');
          const jsonEnd = output.indexOf('===JSON_END===');
          
          let cleanOutput = output;
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonStartIndex = jsonStart + '===JSON_START==='.length;
            cleanOutput = output.substring(jsonStartIndex, jsonEnd).trim();
          }
          
          const result = JSON.parse(cleanOutput);
          if (result.error) {
            return res.status(500).json({ message: result.error });
          }
          
          // Debug the exact response structure
          console.log('=== BACKEND RESPONSE STRUCTURE DEBUG ===');
          console.log('Full result:', JSON.stringify(result, null, 2));
          console.log('result.updatedDAG:', result.updatedDAG);
          console.log('result.updatedDAG?.edges:', result.updatedDAG?.edges);
          console.log('Number of edges in backend response:', result.updatedDAG?.edges?.length);
          
          res.json(result);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          console.error('Raw output length:', output.length);
          console.error('Raw output preview:', output.substring(0, 500));
          res.status(500).json({ 
            message: "Failed to parse analysis results", 
            error: parseError.message 
          });
        }
      });

      // Handle timeout - increased for full PyMC computations  
      const timeout = setTimeout(() => {
        if (responseHandled) return;
        responseHandled = true;
        python.kill('SIGTERM');
        setTimeout(() => python.kill('SIGKILL'), 5000); // Force kill after 5s if needed
        res.status(408).json({ message: "Analysis timed out" });
      }, 600000); // 10 minute timeout for full PyMC with 2000 draws

      // Clear timeout if process completes normally
      python.on('close', () => {
        clearTimeout(timeout);
      });

    } catch (error) {
      console.error('Causal analysis error:', error);
      res.status(500).json({ message: "Failed to perform causal analysis" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
