"use client";

import type { Bookmark } from "@/types/config";
import BookmarkIcon from "./BookmarkIcon";
import type { StatusResult } from "@/hooks/useStatusCheck";
import type { DockerStatusResult } from "@/hooks/useDockerStatus";
import type { IntegrationResult } from "@/hooks/useIntegration";
import IntegrationDisplay from "./IntegrationDisplay";

interface BookmarkCardProps {
  bookmark: Bookmark;
  editMode?: boolean;
  onDelete?: (name: string) => void;
  onEdit?: () => void;
  statusResult?: StatusResult;
  dockerStatus?: DockerStatusResult;
  integrationResult?: IntegrationResult;
}

export default function BookmarkCard({
  bookmark,
  editMode = false,
  onDelete,
  onEdit,
  statusResult,
  dockerStatus,
  integrationResult,
}: BookmarkCardProps) {
  const hasInlineIntegration = bookmark.integration?.display === "inline" && integrationResult && !integrationResult.error;

  return (
    <a
      href={editMode ? undefined : bookmark.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-2.5 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-sm)] transition-all duration-150 cursor-pointer text-[var(--text)] no-underline hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-sm)]"
      onClick={editMode ? (e) => { e.preventDefault(); onEdit?.(); } : undefined}
    >
      <BookmarkIcon src={bookmark.icon} name={bookmark.name} />
      {bookmark.statusCheck && statusResult && (
        <span
          className={`inline-block w-2 h-2 rounded-full shrink-0 ${
            statusResult.status === "up"
              ? "bg-green-500"
              : statusResult.status === "checking"
              ? "bg-gray-400 animate-pulse"
              : "bg-red-500"
          }`}
          title={
            statusResult.status === "up"
              ? `Up (${statusResult.responseTime}ms)`
              : statusResult.status === "down"
              ? `Down (HTTP ${statusResult.statusCode})`
              : statusResult.status === "error"
              ? "Unreachable"
              : "Checking..."
          }
        />
      )}
      {bookmark.server === "docker" && dockerStatus && (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 text-[0.6rem] font-semibold rounded shrink-0 ${
            dockerStatus.state === "running"
              ? "bg-green-500/15 text-green-600 dark:text-green-400"
              : dockerStatus.state === "restarting"
                ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
                : "bg-red-500/15 text-red-600 dark:text-red-400"
          }`}
          title={dockerStatus.status}
        >
          {dockerStatus.state === "running" ? "●" : dockerStatus.state === "restarting" ? "◑" : "○"}
        </span>
      )}
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{bookmark.name}</span>
          {bookmark.integration?.display === "badge" && integrationResult && (
            <IntegrationDisplay
              fields={integrationResult.fields}
              display="badge"
              loading={integrationResult.loading}
              error={integrationResult.error}
            />
          )}
        </div>
        {bookmark.integration?.display === "inline" && integrationResult ? (
          hasInlineIntegration ? (
            <IntegrationDisplay
              fields={integrationResult.fields}
              display="inline"
              loading={integrationResult.loading}
              error={integrationResult.error}
            />
          ) : (
            bookmark.description && (
              <span className="text-xs text-[var(--text-secondary)] truncate">
                {bookmark.description}
              </span>
            )
          )
        ) : (
          bookmark.description && (
            <span className="text-xs text-[var(--text-secondary)] truncate">
              {bookmark.description}
            </span>
          )
        )}
        {bookmark.integration?.display === "card" && integrationResult && (
          <IntegrationDisplay
            fields={integrationResult.fields}
            display="card"
            loading={integrationResult.loading}
            error={integrationResult.error}
          />
        )}
      </div>
      {bookmark.shortcut && !editMode && (
        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[0.65rem] font-mono text-[var(--text-tertiary)] bg-[var(--surface-alt)] border border-[var(--border)] rounded">
          {bookmark.shortcut}
        </kbd>
      )}
      {editMode && (
        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {onEdit && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit();
              }}
              className="p-1 rounded text-[var(--accent)] hover:bg-[var(--accent-soft)] cursor-pointer"
              title="Edit bookmark"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(bookmark.name);
              }}
              className="p-1 rounded text-[var(--error)] hover:bg-[var(--error-soft)] cursor-pointer"
              title="Delete bookmark"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      )}
    </a>
  );
}
