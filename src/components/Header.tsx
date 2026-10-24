"use client";

export type AppView = "setup" | "analysis" | "findings" | "strategies" | "pipeline";
interface HeaderProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  onUploadClick: () => void;
  busy?: boolean;
}
export function Header({ currentView, onViewChange, onUploadClick, busy }: HeaderProps) {
  return (
    <header className="wk-header">
      <div className="wk-header-inner">
        <button
          className="wk-wordmark"
          type="button"
          onClick={() => onViewChange("setup")}
          aria-label="Football strategist home"
        >
          Football strategist
        </button>
        <nav aria-label="Workspace views" className="wk-nav">
          {(
            [
              ["analysis", "Review"],
              ["findings", "Findings"],
              ["strategies", "Strategies"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="wk-nav-link"
              aria-current={currentView === id ? "page" : undefined}
              onClick={() => onViewChange(id)}
            >
              {label}
              {id === "analysis" && busy && (
                <span className="wk-working" aria-label="Analysis running" />
              )}
            </button>
          ))}
          <button className="button-primary" type="button" onClick={onUploadClick}>
            Add a clip <span aria-hidden="true">↗</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
