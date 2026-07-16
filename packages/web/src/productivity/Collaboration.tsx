import { useMemo, useState } from "react";
import { Button } from "../components/ui";

export type CollabAuthor = {
  readonly id: string;
  readonly name: string;
};

export type CollabItem = {
  readonly id: string;
  readonly author: string;
  readonly text: string;
  readonly at: string;
  readonly reactions: Record<string, number>;
  readonly shared?: boolean;
};

export const MENTION_USERS: readonly CollabAuthor[] = [
  { id: "u1", name: "Ayesha Khan" },
  { id: "u2", name: "Bilal Ahmed" },
  { id: "u3", name: "Sara Malik" },
  { id: "u4", name: "Omar Farooq" },
  { id: "u5", name: "You" },
] as const;

const EMOJIS = ["👍", "👀", "✅", "🔥"] as const;

function renderMentions(text: string) {
  const parts = text.split(/(@[\w. -]+)/g);
  return parts.map((p, i) =>
    p.startsWith("@") ? (
      <span key={i} className="p5-mention">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function CollaborationComposer({
  value,
  onChange,
  onSubmit,
  placeholder,
  submitLabel = "Post",
}: {
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly onSubmit: () => void;
  readonly placeholder: string;
  readonly submitLabel?: string;
}) {
  const [showMentions, setShowMentions] = useState(false);
  const query = useMemo(() => {
    const m = value.match(/@([\w.-]*)$/);
    return m ? m[1]!.toLowerCase() : null;
  }, [value]);

  const suggestions = useMemo(() => {
    if (query == null) return [];
    return MENTION_USERS.filter((u) => u.name.toLowerCase().includes(query)).slice(0, 5);
  }, [query]);

  return (
    <div className="p5-composer stack">
      <textarea
        className="field__input"
        rows={3}
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setShowMentions(/@[\w.-]*$/.test(e.target.value));
        }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            onSubmit();
          }
        }}
      />
      {showMentions && suggestions.length > 0 ? (
        <ul className="p5-mention-menu" role="listbox" aria-label="Mention users">
          {suggestions.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(value.replace(/@[\w.-]*$/, `@${u.name} `));
                  setShowMentions(false);
                }}
              >
                @{u.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="p5-muted">Type @ to mention · ⌘/Ctrl Enter to post</span>
        <Button onClick={onSubmit}>{submitLabel}</Button>
      </div>
    </div>
  );
}

export function CollaborationFeed({
  items,
  onReact,
  emptyLabel = "Nothing yet.",
}: {
  readonly items: readonly CollabItem[];
  readonly onReact: (id: string, emoji: string) => void;
  readonly emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="p5-muted">{emptyLabel}</p>;
  }
  return (
    <ul className="p5-collab-feed">
      {items.map((item) => (
        <li key={item.id} className="p5-collab-item">
          <header>
            <strong>{item.author}</strong>
            <time dateTime={item.at}>{item.at}</time>
            {item.shared ? <span className="p5-pill">Shared</span> : null}
          </header>
          <p>{renderMentions(item.text)}</p>
          <div className="p5-reactions" role="group" aria-label="Reactions">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="p5-react-btn"
                onClick={() => onReact(item.id, emoji)}
                aria-label={`React ${emoji}`}
              >
                {emoji}
                {item.reactions[emoji] ? <span>{item.reactions[emoji]}</span> : null}
              </button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SharedLinkBar({
  path,
  onCopy,
}: {
  readonly path: string;
  readonly onCopy: () => void;
}) {
  const url = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
  return (
    <div className="p5-share-bar">
      <label>
        <span className="sr-only">Shared link</span>
        <input className="field__input" readOnly value={url} aria-label="Shared link" />
      </label>
      <Button variant="ghost" onClick={onCopy}>
        Copy link
      </Button>
    </div>
  );
}

export function parseCollabItems(raw: string[]): CollabItem[] {
  return raw.map((text, i) => {
    try {
      const parsed = JSON.parse(text) as CollabItem;
      if (parsed && typeof parsed.text === "string") return parsed;
    } catch {
      /* legacy plain string */
    }
    return {
      id: `legacy-${i}`,
      author: "You",
      text,
      at: "Earlier",
      reactions: {},
    };
  });
}

export function serializeCollabItem(item: CollabItem): string {
  return JSON.stringify(item);
}
