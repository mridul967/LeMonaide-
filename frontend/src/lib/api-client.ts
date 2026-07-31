/**
 * Type-safe API client fetching dynamic backend configurations and domain data.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8741/api/v1";

export interface CapabilityConfig {
  app_name: string;
  environment: string;
  api_prefix: string;
  capabilities: {
    dataset_ingestion?: { supported_formats: string[]; max_size_mb: number };
    model_families?: Array<{ id: string; name: string; category: string }>;
    metric_catalog?: Array<{ id: string; name: string; optimization_direction: string }>;
    evidence_statuses?: Array<{ id: string; label: string; category: string }>;
  };
}

export interface UIConfig {
  theme: string;
  ports: { frontend: number; backend: number };
  feature_flags: Record<string, boolean>;
}

export interface ProjectEntity {
  id: string;
  name: string;
  description?: string;
  task_type: string;
  created_at: string;
}

/**
 * Fetches dynamic system capabilities from the backend.
 */
export async function fetchCapabilities(): Promise<CapabilityConfig> {
  const res = await fetch(`${API_BASE_URL}/capabilities`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Capabilities request failed with status ${res.status}`);
  return res.json();
}

/**
 * Fetches dynamic UI settings and feature flags from the backend.
 */
export async function fetchUIConfig(): Promise<UIConfig> {
  const res = await fetch(`${API_BASE_URL}/ui-config`, { cache: "no-store" });
  if (!res.ok) throw new Error(`UI config request failed with status ${res.status}`);
  return res.json();
}

/**
 * Lists all active projects from the backend.
 */
export async function fetchProjects(): Promise<ProjectEntity[]> {
  const res = await fetch(`${API_BASE_URL}/projects`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Projects request failed with status ${res.status}`);
  return res.json();
}

/**
 * Creates a new research project.
 */
export async function createProject(data: { name: string; description?: string; task_type?: string }): Promise<ProjectEntity> {
  const res = await fetch(`${API_BASE_URL}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Project creation failed with status ${res.status}`);
  return res.json();
}
