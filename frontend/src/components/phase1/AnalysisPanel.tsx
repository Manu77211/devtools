"use client";

import { AnalysisResult } from "@/types/devgraph";

interface AnalysisPanelProps {
  analysis: AnalysisResult;
}

function riskBand(score: number): string {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

export function AnalysisPanel({ analysis }: AnalysisPanelProps) {
  return (
    <section className="panel">
      <h2 className="panel-title">Review Summary</h2>
      <div className="risk-box">
        <span className="risk-value">{analysis.riskScore}</span>
        <span className="risk-label">{riskBand(analysis.riskScore)} Risk</span>
      </div>
      <div className="issue-list">
        {analysis.issues.length === 0 ? (
          <p className="empty">No significant issues detected.</p>
        ) : (
          analysis.issues.map((issue) => (
            <article key={issue.id} className={`issue ${issue.severity}`}>
              <header className="issue-head">
                <strong>{issue.type.toUpperCase()}</strong>
                <span>{issue.severity}</span>
              </header>
              <p>{issue.message}</p>
              <p className="issue-meta">
                {issue.file}:{issue.line}
              </p>
              <p className="issue-fix">{issue.recommendation}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
