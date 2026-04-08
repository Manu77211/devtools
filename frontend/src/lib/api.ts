import { AnalysisResult, PullRequestItem } from "@/types/devgraph";
import { mockAnalysisByPrId, mockPRs } from "@/lib/mock";

const API_BASE = process.env.NEXT_PUBLIC_DEVGRAPH_API ?? "http://localhost:8000";
const API_TOKEN = process.env.NEXT_PUBLIC_DEVGRAPH_TOKEN ?? "";

function buildHeaders(): HeadersInit {
  if (!API_TOKEN) {
    return {};
  }
  return { Authorization: `Bearer ${API_TOKEN}` };
}

export async function fetchPullRequests(): Promise<PullRequestItem[]> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/review/pull-requests`, {
      cache: "no-store",
      headers: buildHeaders(),
    });
    if (!response.ok) {
      throw new Error("Failed to fetch pull requests");
    }
    return (await response.json()) as PullRequestItem[];
  } catch {
    return mockPRs;
  }
}

export async function fetchAnalysis(prId: string): Promise<AnalysisResult> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/review/analyze/${prId}`, {
      cache: "no-store",
      headers: buildHeaders(),
    });
    if (!response.ok) {
      throw new Error("Failed to fetch analysis");
    }
    return (await response.json()) as AnalysisResult;
  } catch {
    return mockAnalysisByPrId[prId] ?? mockAnalysisByPrId["pr-184"];
  }
}
