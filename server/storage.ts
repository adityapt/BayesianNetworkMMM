import { causalModels, type CausalModel, type InsertCausalModel } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getCausalModel(id: number): Promise<CausalModel | undefined>;
  getAllCausalModels(): Promise<CausalModel[]>;
  createCausalModel(model: InsertCausalModel): Promise<CausalModel>;
  updateCausalModel(id: number, model: Partial<InsertCausalModel>): Promise<CausalModel | undefined>;
  deleteCausalModel(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private models: Map<number, CausalModel>;
  private currentId: number;

  constructor() {
    this.models = new Map();
    this.currentId = 1;
  }

  async getCausalModel(id: number): Promise<CausalModel | undefined> {
    return this.models.get(id);
  }

  async getAllCausalModels(): Promise<CausalModel[]> {
    return Array.from(this.models.values());
  }

  async createCausalModel(insertModel: InsertCausalModel): Promise<CausalModel> {
    const id = this.currentId++;
    const model: CausalModel = { 
      ...insertModel, 
      id,
      description: insertModel.description ?? null
    };
    this.models.set(id, model);
    return model;
  }

  async updateCausalModel(id: number, updateData: Partial<InsertCausalModel>): Promise<CausalModel | undefined> {
    const existing = this.models.get(id);
    if (!existing) return undefined;
    
    const updated: CausalModel = { ...existing, ...updateData };
    this.models.set(id, updated);
    return updated;
  }

  async deleteCausalModel(id: number): Promise<boolean> {
    return this.models.delete(id);
  }
}

export const storage = new MemStorage();
