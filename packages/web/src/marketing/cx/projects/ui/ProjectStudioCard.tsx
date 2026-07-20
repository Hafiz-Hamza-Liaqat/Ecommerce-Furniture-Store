/**
 * RC10.1 — Rich studio project card (presentation only).
 */
import { useRef } from "react";
import { Link } from "react-router-dom";
import { formatPkr } from "../../../data/catalogue";
import { TEMPLATE_LABELS } from "../../intelligent/space-brief";
import { PROJECT_STATUS_LABELS, type ProjectListItem } from "../types";
import { loadProject } from "../store";
import {
  continueHref,
  continueTargetForProject,
  deriveMoodboardTiles,
  projectProgressPercent,
  relativeTime,
  type MoodboardTile,
} from "../studio-derive";

type Props = {
  readonly item: ProjectListItem;
  readonly pinned: boolean;
  readonly density: "comfortable" | "compact";
  readonly onPin: () => void;
  readonly onShare: () => void;
  readonly onDuplicate: () => void;
  readonly onArchive: () => void;
};

function placeMoreMenu(details: HTMLDetailsElement) {
  details.classList.remove("cx-studio-more--up", "cx-studio-more--start");
  if (!details.open) return;
  const rect = details.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceRight = window.innerWidth - rect.right;
  if (spaceBelow < 220 && rect.top > spaceBelow) {
    details.classList.add("cx-studio-more--up");
  }
  if (spaceRight < 180 && rect.left > spaceRight) {
    details.classList.add("cx-studio-more--start");
  }
}

export function ProjectStudioCard({
  item,
  pinned,
  density,
  onPin,
  onShare,
  onDuplicate,
  onArchive,
}: Props) {
  const moreRef = useRef<HTMLDetailsElement>(null);
  const full = loadProject(item.id);
  const tiles = deriveMoodboardTiles(full, density === "compact" ? 3 : 4);
  const progress = projectProgressPercent(item.status);
  const target = full ? continueTargetForProject(full) : "planner";
  const resume = continueHref(item.id, target === "project" ? "planner" : target);

  function closeOtherMenus() {
    const root = moreRef.current?.closest(".cx-studio-card-grid") ?? document;
    root.querySelectorAll<HTMLDetailsElement>(".cx-studio-more[open]").forEach((el) => {
      if (el !== moreRef.current) el.open = false;
    });
  }

  return (
    <article
      className={`cx-studio-card site-reveal${density === "compact" ? " cx-studio-card--compact" : ""}`}
      id={`project-${item.id}`}
    >
      <div
        className="cx-studio-moodboard"
        aria-hidden={tiles.every((t: MoodboardTile) => t.kind === "placeholder")}
      >
        {tiles.map((tile: MoodboardTile) =>
          tile.kind === "product" && tile.src ? (
            <img key={tile.id} src={tile.src} alt="" className="cx-studio-moodboard__tile" />
          ) : (
            <div key={tile.id} className="cx-studio-moodboard__tile cx-studio-moodboard__tile--ph">
              <span>{tile.alt}</span>
            </div>
          ),
        )}
      </div>

      <div className="cx-studio-card__body">
        <header className="cx-studio-card__head">
          <h3>
            <Link to={`/planner?projectId=${item.id}`}>{item.title}</Link>
          </h3>
          <span className={`cx-projects-status cx-projects-status--${item.status}`}>
            {PROJECT_STATUS_LABELS[item.status]}
          </span>
        </header>

        <p className="cx-muted cx-studio-card__meta">
          {TEMPLATE_LABELS[item.templateId]} · {item.roomCount} room
          {item.roomCount === 1 ? "" : "s"} · Edited {relativeTime(item.updatedAt)}
        </p>

        <div className="cx-studio-card__stats" aria-label="Project summary">
          <span>Budget {formatPkr(item.budgetPkr)}</span>
          <span>Package {formatPkr(item.totalPkr)}</span>
          {item.quotationStatus ? <span>{item.quotationStatus}</span> : <span>No quote yet</span>}
        </div>

        <div
          className="cx-studio-progress"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Project progress ${progress}%`}
        >
          <span style={{ width: `${progress}%` }} />
        </div>

        <p className="cx-studio-card__flags">
          <span>Planner available</span>
          {item.aiAssisted ? <span>AI Consultant available</span> : null}
        </p>

        <div className="cx-studio-card__actions">
          <Link to={resume} className="site-btn site-btn--primary">
            Continue
          </Link>
          <Link to={`/planner?projectId=${item.id}`} className="site-btn site-btn--ghost">
            Planner
          </Link>
          <Link to={`/consultant?projectId=${item.id}`} className="site-btn site-btn--ghost">
            Consultant
          </Link>
          <details
            ref={moreRef}
            className="cx-studio-more"
            onToggle={(e) => {
              const el = e.currentTarget;
              if (el.open) closeOtherMenus();
              placeMoreMenu(el);
            }}
          >
            <summary className="site-btn site-btn--ghost">More</summary>
            <div className="cx-studio-more__menu" role="menu">
              <button type="button" role="menuitem" onClick={onPin}>
                {pinned ? "Unpin" : "Pin"}
              </button>
              <button type="button" role="menuitem" onClick={onShare}>
                Share
              </button>
              <button type="button" role="menuitem" onClick={onDuplicate}>
                Duplicate
              </button>
              <Link role="menuitem" to={`/planner?projectId=${item.id}`}>
                Quotation
              </Link>
              {item.status !== "archived" ? (
                <button type="button" role="menuitem" onClick={onArchive}>
                  Archive
                </button>
              ) : null}
            </div>
          </details>
        </div>
      </div>
    </article>
  );
}
