// Database types for Supabase tables

export interface Project {
  id: number;
  user_id: string;
  name: string;
  category?: string | null;
  status?: string | null;
  deadline?: string | null;
  x?: number | null;
  y?: number | null;
  created_at?: string;
}

export interface Person {
  id: number;
  user_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  category?: string | null;
  x?: number | null;
  y?: number | null;
  created_at?: string;
}

export interface Brand {
  id: number;
  user_id: string;
  name: string;
  category?: string | null;
  website?: string | null;
  x?: number | null;
  y?: number | null;
  created_at?: string;
}

export interface Connection {
  id: number;
  user_id: string;
  from_id: number;
  to_id: number;
  from_type: string;
  to_type: string;
  connection_type?: string | null;
  created_at?: string;
}

export interface Workflow {
  id: number;
  user_id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  created_at?: string;
}

export interface Flow {
  id: number;
  user_id: string;
  name: string;
  center_type: 'project' | 'person' | 'brand';
  center_id: number;
  created_at?: string;
}

// Extended types with computed fields for UI
export interface ProjectNode extends Project {
  type: 'project';
  x: number;
  y: number;
  workflows?: number[];
}

export interface PersonNode extends Person {
  type: 'person';
  x: number;
  y: number;
}

export interface BrandNode extends Brand {
  type: 'brand';
  x: number;
  y: number;
}

export type NetworkNode = ProjectNode | PersonNode | BrandNode;

export interface ConnectionEdge {
  id: number;
  from: number;
  to: number;
  type: string;
}
