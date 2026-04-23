import { useEffect, useRef, useState } from "react";
import { dashboardApi } from "../../services/dashboardApi";
import type { TopicResource } from "../../types/dashboard";

type TopicResourcesDropdownProps = {
  topicId: string;
};

const TopicResourcesDropdown = ({ topicId }: TopicResourcesDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [resources, setResources] = useState<TopicResource[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const handleToggle = async () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && resources === null && !loading) {
      setLoading(true);
      setError(null);
      try {
        const list = await dashboardApi.listTopicResources(topicId);
        setResources(list);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load resources."
        );
        setResources([]);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleOpenResource = async (resource: TopicResource) => {
    setOpeningId(resource.id);
    setError(null);
    try {
      const url = await dashboardApi.getTopicResourceUrl(resource.id);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (openError) {
      setError(
        openError instanceof Error ? openError.message : "Unable to open resource."
      );
    } finally {
      setOpeningId(null);
    }
  };

  const count = resources?.length ?? null;

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <path d="M3.5 4A1.5 1.5 0 0 1 5 2.5h3.086a1.5 1.5 0 0 1 1.06.44l1.415 1.414a1.5 1.5 0 0 0 1.06.439H15A1.5 1.5 0 0 1 16.5 6.293V14A1.5 1.5 0 0 1 15 15.5H5A1.5 1.5 0 0 1 3.5 14V4Z" />
        </svg>
        <span>Resources{count !== null ? ` (${count})` : ""}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-3 w-3 transition ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-white/10 bg-ink-900/95 p-2 shadow-xl backdrop-blur">
          {loading ? (
            <p className="px-2 py-2 text-xs text-slate-400">Loading...</p>
          ) : error ? (
            <p className="px-2 py-2 text-xs text-rose-300">{error}</p>
          ) : !resources || resources.length === 0 ? (
            <p className="px-2 py-2 text-xs text-slate-400">
              No resources uploaded yet.
            </p>
          ) : (
            <ul className="max-h-60 overflow-y-auto">
              {resources.map((resource) => (
                <li key={resource.id}>
                  <button
                    type="button"
                    onClick={() => handleOpenResource(resource)}
                    disabled={openingId === resource.id}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-slate-200 transition hover:bg-white/5 disabled:opacity-60"
                    title={resource.file_name}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4 shrink-0 text-slate-400"
                      aria-hidden="true"
                    >
                      <path d="M5.5 2.75A2.25 2.25 0 0 1 7.75.5h4.672a2.25 2.25 0 0 1 1.591.659l2.828 2.828a2.25 2.25 0 0 1 .659 1.591V17.25A2.25 2.25 0 0 1 15.25 19.5h-7.5A2.25 2.25 0 0 1 5.5 17.25V2.75Z" />
                    </svg>
                    <span className="flex-1 truncate">
                      {resource.title || resource.file_name}
                    </span>
                    {openingId === resource.id && (
                      <span className="text-[10px] text-slate-400">Opening...</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default TopicResourcesDropdown;
