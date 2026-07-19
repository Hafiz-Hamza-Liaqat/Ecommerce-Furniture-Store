import { Link } from "react-router-dom";

export type Crumb = { readonly label: string; readonly to?: string };

export function Breadcrumbs({ items }: { readonly items: readonly Crumb[] }) {
  return (
    <nav className="cx-breadcrumbs" aria-label="Breadcrumb">
      <ol>
        <li>
          <Link to="/">Home</Link>
        </li>
        {items.map((c, i) => (
          <li key={`${c.label}-${i}`}>
            {c.to && i < items.length - 1 ? <Link to={c.to}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
