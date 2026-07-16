import type { ReactNode } from "react";

/** Lightweight markdown subset for assistant replies — no HTML injection. */

export function renderMarkdown(src: string): ReactNode[] {
  const lines = src.split("\n");
  const nodes: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? "").startsWith("```")) {
        code.push(lines[i]!);
        i += 1;
      }
      i += 1;
      nodes.push(
        <pre key={key++} className="ai-code">
          <code data-lang={lang || undefined}>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    if (line.startsWith("| ") && lines[i + 1]?.includes("---")) {
      const rows: string[][] = [];
      while (i < lines.length && (lines[i] ?? "").startsWith("|")) {
        const raw = lines[i]!;
        if (!raw.includes("---")) {
          rows.push(
            raw
              .split("|")
              .slice(1, -1)
              .map((c) => c.trim()),
          );
        }
        i += 1;
      }
      const [head, ...body] = rows;
      nodes.push(
        <table key={key++} className="ai-md-table">
          <thead>
            <tr>
              {(head ?? []).map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((r, ri) => (
              <tr key={ri}>
                {r.map((c, ci) => (
                  <td key={ci}>{inline(c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      );
      continue;
    }

    if (line.startsWith("> ")) {
      nodes.push(
        <blockquote key={key++} className="ai-quote">
          {inline(line.slice(2))}
        </blockquote>,
      );
      i += 1;
      continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^#+/)?.[0].length ?? 1;
      const text = line.replace(/^#+\s/, "");
      const Tag = (level === 1 ? "h3" : level === 2 ? "h4" : "h5") as "h3" | "h4" | "h5";
      nodes.push(
        <Tag key={key++} className="ai-md-h">
          {inline(text)}
        </Tag>,
      );
      i += 1;
      continue;
    }

    if (/^[-*]\s/.test(line) || /^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && (/^[-*]\s/.test(lines[i] ?? "") || /^\d+\.\s/.test(lines[i] ?? ""))) {
        items.push((lines[i] ?? "").replace(/^([-*]|\d+\.)\s/, ""));
        i += 1;
      }
      nodes.push(
        <ul key={key++} className="ai-md-list">
          {items.map((it, ii) => (
            <li key={ii}>{inline(it)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    nodes.push(
      <p key={key++} className="ai-md-p">
        {inline(line)}
      </p>,
    );
    i += 1;
  }

  return nodes;
}

function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="ai-inline-code">
          {part.slice(1, -1)}
        </code>
      );
    }
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (m) {
      return (
        <a key={i} href={m[2]} className="ai-md-link">
          {m[1]}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
