import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BRAND } from "../brand";
import { Drawer } from "../workspace/widgets";
import { useWorkspaceUi } from "../workspace/context";
import { ChatShell } from "./ChatShell";
import { SUGGESTED_PROMPTS } from "./data";

export function AiAssistantPanel() {
  const { aiPanelOpen, setAiPanelOpen } = useWorkspaceUi();
  const [seed, setSeed] = useState<string | undefined>();

  useEffect(() => {
    if (!aiPanelOpen) setSeed(undefined);
  }, [aiPanelOpen]);

  return (
    <Drawer open={aiPanelOpen} title={`${BRAND.monogram} Assist`} onClose={() => setAiPanelOpen(false)}>
      <div className="stack ai-panel">
        <div className="ai-chips">
          {SUGGESTED_PROMPTS.slice(0, 4).map((p) => (
            <button key={p} type="button" onClick={() => setSeed(p)}>
              {p}
            </button>
          ))}
        </div>
        <ChatShell compact {...(seed ? { seedPrompt: seed } : {})} />
        <Link className="btn btn--ghost" to="/app/ai" onClick={() => setAiPanelOpen(false)}>
          Open AI workspace
        </Link>
      </div>
    </Drawer>
  );
}
