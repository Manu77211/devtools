export type Severity = "low" | "medium" | "high" | "critical";

export interface PullRequestItem {
  id: string;
  number: number;
  title: string;
  author: string;
  status: "open" | "review" | "merged";
  changedFiles: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: "pr" | "file" | "function" | "issue";
  severity?: Severity;
  x: number;
  y: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
}

export interface ReviewIssue {
  id: string;
  type: "bug" | "security" | "quality";
  severity: Severity;
  message: string;
  file: string;
  line: number;
  recommendation: string;
}

export interface AnalysisResult {
  pr: PullRequestItem;
  riskScore: number;
  summary: string;
  issues: ReviewIssue[];
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
}
