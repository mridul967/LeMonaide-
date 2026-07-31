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

export interface DatasetColumnInfo {
  name: string;
  dtype: string;
  missing_count: number;
  missing_pct: number;
  numeric_stats?: { mean?: number; std?: number; min?: number; max?: number };
  top_categories?: Record<string, number>;
}

export interface DatasetEntity {
  id: string;
  project_id: string;
  name: string;
  version: string;
  file_path: string;
  checksum: string;
  profile_summary?: {
    total_rows: number;
    total_columns: number;
    columns: DatasetColumnInfo[];
    target_column?: string;
    target_distribution?: Record<string, number>;
  };
  created_at: string;
}

export interface RunEntity {
  id: string;
  project_id: string;
  dataset_id: string;
  model_family: string;
  hyperparameters: Record<string, any>;
  metrics: {
    accuracy?: number;
    f1_weighted?: number;
    log_loss?: number;
    feature_importances?: Record<string, number>;
    per_sample_predictions?: Array<{
      sample_index: number;
      y_true: number;
      y_pred: number;
      y_prob: number;
      is_error: boolean;
      error_delta: number;
    }>;
  };
  status: string;
  created_at: string;
}

export async function fetchCapabilities(): Promise<CapabilityConfig> {
  const res = await fetch(`${API_BASE_URL}/capabilities`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Capabilities request failed with status ${res.status}`);
  return res.json();
}

export async function fetchUIConfig(): Promise<UIConfig> {
  const res = await fetch(`${API_BASE_URL}/ui-config`, { cache: "no-store" });
  if (!res.ok) throw new Error(`UI config request failed with status ${res.status}`);
  return res.json();
}

export async function fetchProjects(): Promise<ProjectEntity[]> {
  const res = await fetch(`${API_BASE_URL}/projects`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Projects request failed with status ${res.status}`);
  return res.json();
}

export async function createProject(data: { name: string; description?: string; task_type?: string }): Promise<ProjectEntity> {
  const res = await fetch(`${API_BASE_URL}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Project creation failed with status ${res.status}`);
  return res.json();
}

export async function fetchProjectDatasets(projectId: string): Promise<DatasetEntity[]> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/datasets`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Datasets request failed with status ${res.status}`);
  return res.json();
}

export async function seedDemoDataset(projectId: string): Promise<DatasetEntity> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/datasets/seed-demo`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Demo dataset seeding failed with status ${res.status}`);
  return res.json();
}

export async function uploadDataset(projectId: string, file: File): Promise<DatasetEntity> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/datasets/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`Dataset upload failed with status ${res.status}`);
  return res.json();
}

export async function fetchProjectRuns(projectId: string): Promise<RunEntity[]> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/runs`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Runs request failed with status ${res.status}`);
  return res.json();
}

export async function trainModel(projectId: string, data: { dataset_id: string; model_family: string; hyperparameters?: Record<string, any> }): Promise<RunEntity> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/train`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail || `Model training failed with status ${res.status}`);
  }
  return res.json();
}
