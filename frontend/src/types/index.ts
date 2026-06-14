export interface Project {
  id: number;
  name: string;
  framework: string;
  created_at: string;
}

export interface Commit {
  id: number;
  hash: string;
  parent_hash: string | null;
  project_name: string;
  raw_prompt: string;
  optimized_prompt: string | null;
  eval_score: number;
  eval_feedback: string | null;
  status: string;
  tokens_before: number;
  tokens_after: number;
  cost: number;
  duration_ms: number;
  timestamp: string;
}

export interface DiffLine {
  type: 'added' | 'deleted' | 'normal';
  content: string;
}

export interface FileDiff {
  status: 'modified' | 'added' | 'deleted';
  lines: DiffLine[];
}

export interface CommitDiff {
  commit: string;
  parent: string | null;
  diffs: Record<string, FileDiff>;
}

export interface RlmStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  details: string;
  badge?: string;
}

export interface Stats {
  total_commits: number;
  success_rate: number;
  avg_score: number;
  tokens_saved: number;
  avg_compression_ratio: number;
  cost_saved: number;
  improvement_trend: {
    hash: string;
    score: number;
    timestamp: string;
    prompt: string;
  }[];
}

export interface SearchMatch {
  file_path: string;
  line_number: number;
  line_content: string;
}
