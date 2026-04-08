"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAnalysis, fetchPullRequests } from "@/lib/api";
import { AnalysisResult, PullRequestItem } from "@/types/devgraph";
import { PullRequestList } from "@/components/phase1/PullRequestList";
import { GraphCanvas } from "@/components/phase1/GraphCanvas";
import { AnalysisPanel } from "@/components/phase1/AnalysisPanel";

export function DashboardShell() {
  const [prs, setPrs] = useState<PullRequestItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("pr-184");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      const nextPrs = await fetchPullRequests();
      setPrs(nextPrs);
      if (nextPrs.length > 0) {
        setSelectedId(nextPrs[0].id);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const loadAnalysis = async () => {
      setLoading(true);
      const result = await fetchAnalysis(selectedId);
      setAnalysis(result);
      setLoading(false);
    };
    void loadAnalysis();
  }, [selectedId]);

  const headline = useMemo(() => {
    if (!analysis) {
      return "CodeGraph AI";
    }
    return `PR #${analysis.pr.number} · ${analysis.pr.title}`;
  }, [analysis]);

  return (
    <main className="dashboard-root">
      <header className="topbar">
        <h1>{headline}</h1>
        <p>Phase 1 visual shell: frontend-first with backend-ready data layer.</p>
      </header>
      <section className="grid-layout">
        <div className="col-left">
          <PullRequestList prs={prs} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="col-center">
          {loading || !analysis ? <div className="panel loading">Loading analysis...</div> : <GraphCanvas analysis={analysis} />}
        </div>
        <div className="col-right">
          {loading || !analysis ? <div className="panel loading">Preparing insights...</div> : <AnalysisPanel analysis={analysis} />}
        </div>
      </section>
    </main>
  );
}
