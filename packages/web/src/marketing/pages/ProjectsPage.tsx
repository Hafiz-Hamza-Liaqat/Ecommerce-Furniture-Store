import { Link, useParams, useSearchParams } from "react-router-dom";
import { Seo } from "../Seo";
import { PROJECTS, IMG } from "../data/content";

export function ProjectsPage() {
  const [params] = useSearchParams();
  const category = params.get("category");
  const items = PROJECTS.filter((p) => !category || p.category === category);
  const cats = [...new Set(PROJECTS.map((p) => p.category))];

  return (
    <>
      <Seo
        title="Project portfolio"
        description="Workplace, hospitality, and residential manufacturing case studies."
        path="/projects"
        image={IMG.projectA}
      />
      <header className="site-page-hero">
        <p className="site-eyebrow">Portfolio</p>
        <h1>Projects</h1>
        <p>Filters, galleries, and client stories from programs we manufactured end-to-end.</p>
        <div className="site-filter-row">
          <Link to="/projects">All</Link>
          {cats.map((c) => (
            <Link key={c} to={`/projects?category=${encodeURIComponent(c)}`}>
              {c}
            </Link>
          ))}
        </div>
      </header>
      <div className="site-section site-project-grid">
        {items.map((p) => (
          <Link key={p.id} to={`/projects/${p.id}`} className="site-project">
            <img src={p.image} alt="" loading="lazy" />
            <div>
              <p className="site-product__meta">{p.category}</p>
              <h2>{p.title}</h2>
              <p>{p.summary}</p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const project = PROJECTS.find((p) => p.id === projectId) ?? PROJECTS[0]!;

  return (
    <>
      <Seo
        title={project.title}
        description={project.summary}
        path={`/projects/${project.id}`}
        image={project.image}
        type="article"
      />
      <article className="site-case">
        <header className="site-page-hero">
          <p className="site-eyebrow">{project.category}</p>
          <h1>{project.title}</h1>
          <p>{project.summary}</p>
          <p className="site-product__meta">Client · {project.client}</p>
        </header>
        <div className="site-before-after">
          <figure>
            <img src={project.before} alt="Before installation" loading="lazy" />
            <figcaption>Before</figcaption>
          </figure>
          <figure>
            <img src={project.after} alt="After installation" loading="lazy" />
            <figcaption>After</figcaption>
          </figure>
        </div>
        <div className="site-section site-split">
          <div>
            <h2>Client story</h2>
            <p>
              {project.client} partnered with AFH for specification, manufacturing, and phased delivery.
              Engineering boards locked finishes early so factory throughput stayed predictable.
            </p>
            <h2>Case study video</h2>
            <div className="booklet__video" aria-label="Case study video">
              <span>Project film · Walkthrough</span>
            </div>
          </div>
          <img src={project.image} alt="" loading="lazy" />
        </div>
        <div className="site-hero__actions site-section">
          <Link to="/quote" className="site-btn site-btn--primary">
            Start a similar project
          </Link>
          <Link to="/projects" className="site-btn site-btn--ghost">
            Back to portfolio
          </Link>
        </div>
      </article>
    </>
  );
}
