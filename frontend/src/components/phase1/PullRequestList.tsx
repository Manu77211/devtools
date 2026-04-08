"use client";

import { PullRequestItem } from "@/types/devgraph";

interface PullRequestListProps {
  prs: PullRequestItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}

function statusClass(status: PullRequestItem["status"]): string {
  if (status === "review") return "status review";
  if (status === "merged") return "status merged";
  return "status open";
}

export function PullRequestList({
  prs,
  selectedId,
  onSelect,
}: PullRequestListProps) {
  return (
    <section className="panel">
      <h2 className="panel-title">Pull Requests</h2>
      <div className="pr-list">
        {prs.map((pr) => (
          <button
            key={pr.id}
            className={`pr-item ${selectedId === pr.id ? "active" : ""}`}
            onClick={() => onSelect(pr.id)}
            type="button"
          >
            <div className="pr-row">
              <strong>#{pr.number}</strong>
              <span className={statusClass(pr.status)}>{pr.status}</span>
            </div>
            <p className="pr-title">{pr.title}</p>
            <p className="pr-meta">
              {pr.author} · {pr.changedFiles} files
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
