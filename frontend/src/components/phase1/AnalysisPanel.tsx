"use client";

import { AnalysisResult } from "@/types/devgraph";
import { Shield, Wrench, Bug } from "lucide-react";
import { motion } from "framer-motion";

interface AnalysisPanelProps {
  analysis: AnalysisResult;
}

function riskBand(score: number): string {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

function issueIcon(type: string) {
  if (type === "security") return <Shield size={16} />;
  if (type === "quality") return <Wrench size={16} />;
  return <Bug size={16} />;
}

export function AnalysisPanel({ analysis }: AnalysisPanelProps) {
  return (
    <section className="panel">
      <h2 className="panel-title">Review Summary</h2>
      <div className="risk-box">
        <span className="risk-value">{analysis.riskScore}</span>
        <span className="risk-label">{riskBand(analysis.riskScore)} Risk</span>
      </div>
      <motion.div
        className="issue-list"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.1 } },
        }}
      >
        {analysis.issues.length === 0 ? (
          <p className="empty">No significant issues detected.</p>
        ) : (
          analysis.issues.map((issue) => (
            <motion.article
              key={issue.id}
              className={`issue ${issue.severity}`}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.3 }}
            >
              <header className="issue-head">
                {issueIcon(issue.type)}
                <strong className="ml-2">{issue.type.toUpperCase()}</strong>
                <span>{issue.severity}</span>
              </header>
              <p>{issue.message}</p>
              <p className="issue-meta">
                {issue.file}:{issue.line}
              </p>
              <p className="issue-fix">{issue.recommendation}</p>
            </motion.article>
          ))
        )}
      </motion.div>
    </section>
  );
}
