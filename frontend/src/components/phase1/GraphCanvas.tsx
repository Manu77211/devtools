"use client";

import { AnalysisResult, GraphNode, Severity } from "@/types/devgraph";

interface GraphCanvasProps {
  analysis: AnalysisResult;
}

function nodeClass(nodeType: GraphNode["type"], severity?: Severity): string {
  if (nodeType === "issue") {
    if (severity === "critical") return "node issue critical";
    if (severity === "high") return "node issue high";
    if (severity === "medium") return "node issue medium";
    return "node issue low";
  }
  if (nodeType === "pr") return "node pr";
  if (nodeType === "function") return "node function";
  return "node file";
}

export function GraphCanvas({ analysis }: GraphCanvasProps) {
  return (
    <section className="panel graph-panel">
      <div className="graph-header">
        <h2 className="panel-title">Impact Graph</h2>
        <p className="graph-subtitle">{analysis.summary}</p>
      </div>
      <svg viewBox="0 0 680 460" className="graph-svg" role="img">
        {analysis.graph.edges.map((edge) => {
          const source = analysis.graph.nodes.find((n) => n.id === edge.source);
          const target = analysis.graph.nodes.find((n) => n.id === edge.target);
          if (!source || !target) {
            return null;
          }
          return (
            <g key={edge.id}>
              <line
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                className="edge"
              />
              <text
                x={(source.x + target.x) / 2}
                y={(source.y + target.y) / 2 - 6}
                className="edge-label"
              >
                {edge.relation}
              </text>
            </g>
          );
        })}
        {analysis.graph.nodes.map((node) => (
          <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
            <circle r={node.type === "pr" ? 34 : 26} className={nodeClass(node.type, node.severity)}>
              <title>{node.label}</title>
            </circle>
            <text className="node-label" textAnchor="middle" y={4}>
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </section>
  );
}
