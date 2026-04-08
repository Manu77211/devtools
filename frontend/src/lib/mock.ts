import { AnalysisResult, PullRequestItem } from "@/types/devgraph";

export const mockPRs: PullRequestItem[] = [
  {
    id: "pr-184",
    number: 184,
    title: "Refactor auth middleware and token guards",
    author: "manu",
    status: "review",
    changedFiles: 9,
  },
  {
    id: "pr-185",
    number: 185,
    title: "Add repository dependency graph endpoint",
    author: "alex",
    status: "open",
    changedFiles: 6,
  },
  {
    id: "pr-186",
    number: 186,
    title: "Optimize Neo4j traversal with depth cap",
    author: "sam",
    status: "open",
    changedFiles: 4,
  },
];

export const mockAnalysisByPrId: Record<string, AnalysisResult> = {
  "pr-184": {
    pr: mockPRs[0],
    riskScore: 71,
    summary:
      "Token verification path changed in multiple route groups. Security is improved, but fallback behavior may allow noisy error handling under expired token load.",
    issues: [
      {
        id: "i-1",
        type: "security",
        severity: "high",
        message: "Missing org_id enforcement in one protected route",
        file: "backend/routers/reviews.py",
        line: 47,
        recommendation: "Inject org_id from JWT dependency in all entry routes.",
      },
      {
        id: "i-2",
        type: "quality",
        severity: "medium",
        message: "Inconsistent error response shape in auth failure branch",
        file: "backend/services/auth.py",
        line: 121,
        recommendation: "Return standardized {error, code, detail} envelope.",
      },
      {
        id: "i-3",
        type: "bug",
        severity: "medium",
        message: "Retry loop can run unbounded on network timeout",
        file: "backend/services/tokens.py",
        line: 88,
        recommendation: "Add max_retries and jittered backoff ceiling.",
      },
    ],
    graph: {
      nodes: [
        { id: "pr", label: "PR #184", type: "pr", x: 340, y: 120 },
        { id: "file1", label: "auth.py", type: "file", x: 170, y: 240 },
        { id: "file2", label: "reviews.py", type: "file", x: 330, y: 280 },
        { id: "file3", label: "tokens.py", type: "file", x: 500, y: 240 },
        {
          id: "issue1",
          label: "org_id missing",
          type: "issue",
          severity: "high",
          x: 280,
          y: 420,
        },
        {
          id: "issue2",
          label: "retry loop",
          type: "issue",
          severity: "medium",
          x: 470,
          y: 410,
        },
      ],
      edges: [
        { id: "e1", source: "pr", target: "file1", relation: "modifies" },
        { id: "e2", source: "pr", target: "file2", relation: "modifies" },
        { id: "e3", source: "pr", target: "file3", relation: "modifies" },
        { id: "e4", source: "file2", target: "issue1", relation: "has_issue" },
        { id: "e5", source: "file3", target: "issue2", relation: "has_issue" },
      ],
    },
  },
  "pr-185": {
    pr: mockPRs[1],
    riskScore: 38,
    summary:
      "Graph endpoint addition is mostly additive. Main risk is payload size for large repos.",
    issues: [
      {
        id: "i-4",
        type: "quality",
        severity: "low",
        message: "Graph endpoint does not paginate node list",
        file: "backend/routers/graph.py",
        line: 29,
        recommendation: "Add cursor-based pagination for nodes and edges.",
      },
    ],
    graph: {
      nodes: [
        { id: "pr", label: "PR #185", type: "pr", x: 340, y: 120 },
        { id: "file1", label: "graph.py", type: "file", x: 340, y: 260 },
        {
          id: "issue1",
          label: "pagination",
          type: "issue",
          severity: "low",
          x: 340,
          y: 390,
        },
      ],
      edges: [
        { id: "e1", source: "pr", target: "file1", relation: "modifies" },
        { id: "e2", source: "file1", target: "issue1", relation: "has_issue" },
      ],
    },
  },
  "pr-186": {
    pr: mockPRs[2],
    riskScore: 24,
    summary: "Traversal optimization appears safe with existing depth guard tests.",
    issues: [],
    graph: {
      nodes: [
        { id: "pr", label: "PR #186", type: "pr", x: 340, y: 120 },
        { id: "file1", label: "traversal.py", type: "file", x: 340, y: 280 },
      ],
      edges: [{ id: "e1", source: "pr", target: "file1", relation: "modifies" }],
    },
  },
};
