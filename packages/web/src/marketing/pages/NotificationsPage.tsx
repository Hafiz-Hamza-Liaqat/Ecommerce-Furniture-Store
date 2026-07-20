/**
 * RC10.2 — CX Notifications center (local afh.cx.notifications).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "../Seo";
import { Breadcrumbs } from "../components/Breadcrumbs";
import {
  deleteNotification,
  groupNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationCategoryLabel,
  type CxNotification,
} from "../nav/notifications";
import { useReveal } from "../useReveal";

export function NotificationsPage() {
  const [revision, setRevision] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const allItems = listNotifications();
  void revision;
  const items = unreadOnly ? allItems.filter((n) => !n.read) : allItems;
  const groups = groupNotifications(items);
  const unread = allItems.filter((n) => !n.read).length;

  useReveal([items.length, unreadOnly, revision]);

  function refresh() {
    setRevision((r) => r + 1);
  }

  function openItem(item: CxNotification) {
    markNotificationRead(item.id);
    refresh();
  }

  return (
    <div className="cx-notifications">
      <Seo
        title="Notifications"
        description="Project, quotation, and system updates for your design studio."
        path="/notifications"
      />
      <header className="site-page-hero">
        <Breadcrumbs items={[{ label: "Notifications" }]} />
        <p className="site-eyebrow">Communication</p>
        <h1>Notifications</h1>
        <p>
          Updates from projects, quotations, sharing, and system messages — stored on this device
          until cloud sync.
        </p>
      </header>

      <section className="site-section cx-notifications__toolbar" aria-label="Notification filters">
        <label className="cx-notifications__filter">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
          />
          Unread only
          {unread > 0 ? <span className="cx-notifications__count">{unread}</span> : null}
        </label>
        <div className="cx-notifications__actions">
          <button
            type="button"
            className="site-btn site-btn--outline"
            onClick={() => {
              markAllNotificationsRead();
              refresh();
            }}
            disabled={unread === 0}
          >
            Mark all read
          </button>
          <Link to="/my-projects" className="site-btn site-btn--ghost">
            Design Studio
          </Link>
        </div>
      </section>

      <section className="site-section" aria-label="Notification list">
        {groups.length === 0 ? (
          <div className="cx-studio-empty" role="status">
            <h3>{unreadOnly ? "No unread notifications" : "No notifications yet"}</h3>
            <p>
              Project saves, share links, and quotations will appear here as you work in the studio.
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="cx-notifications__group site-reveal">
              <h2 className="cx-studio-section-title">{group.label}</h2>
              <ul className="cx-notifications__list">
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    className={`cx-notifications__item${item.read ? "" : " is-unread"}`}
                  >
                    <div className="cx-notifications__meta">
                      <span className="cx-notifications__category">
                        {notificationCategoryLabel(item.category)}
                      </span>
                      <time dateTime={item.createdAt}>
                        {new Date(item.createdAt).toLocaleString()}
                      </time>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                    <div className="cx-notifications__item-actions">
                      {item.href ? (
                        <Link
                          to={item.href}
                          className="site-btn site-btn--primary"
                          onClick={() => openItem(item)}
                        >
                          Open
                        </Link>
                      ) : !item.read ? (
                        <button
                          type="button"
                          className="site-btn site-btn--outline"
                          onClick={() => openItem(item)}
                        >
                          Mark read
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="site-btn site-btn--ghost"
                        onClick={() => {
                          deleteNotification(item.id);
                          refresh();
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
