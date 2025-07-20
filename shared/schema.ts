import { pgTable, text, serial, integer, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const causalModels = pgTable("causal_models", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  nodes: jsonb("nodes").notNull(),
  edges: jsonb("edges").notNull(),
});

export const insertCausalModelSchema = createInsertSchema(causalModels).omit({
  id: true,
});

export type InsertCausalModel = z.infer<typeof insertCausalModelSchema>;
export type CausalModel = typeof causalModels.$inferSelect;

// Node and Edge types for the DAG
export const nodeSchema = z.object({
  id: z.string(),
  type: z.enum([
    'paid-search', 'social', 'email', 'tv', 'display', 'influencer',
    'revenue', 'conversions', 'brand-awareness'
  ]),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.object({
    name: z.string(),
    spend: z.number().optional(),
    coefficient: z.number().min(0).max(1),
    confidence: z.number().min(0).max(100),
    saturation: z.enum(['linear', 'diminishing', 's-curve']).default('diminishing'),
    adstock: z.number().min(0).max(1).default(0.3),
    timeLag: z.number().min(0).default(0),
    target: z.number().optional(),
    current: z.number().optional(),
    lift: z.number().optional(),
  }),
});

export const edgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  data: z.object({
    strength: z.enum(['weak', 'medium', 'strong']).default('medium'),
    coefficient: z.number().min(-1).max(1).default(0.5),
  }),
});

export type DAGNode = z.infer<typeof nodeSchema>;
export type DAGEdge = z.infer<typeof edgeSchema>;
