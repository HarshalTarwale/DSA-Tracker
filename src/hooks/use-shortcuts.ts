"use client";

import { useEffect, useRef } from "react";

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable ||
    !!target.closest("[role=dialog], [role=listbox], [role=menu], [cmdk-root]")
  );
}

/**
 * Global shortcuts: "g" then a key navigates; "/" and "?" are single keys.
 * Ignored while typing in inputs or inside dialogs/menus.
 */
export function useShortcuts({
  goto,
  onSlash,
  onHelp,
}: {
  goto: Record<string, () => void>;
  onSlash?: () => void;
  onHelp?: () => void;
}) {
  const pendingG = useRef<number | null>(null);
  const handlers = useRef({ goto, onSlash, onHelp });
  useEffect(() => {
    handlers.current = { goto, onSlash, onHelp };
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const { goto, onSlash, onHelp } = handlers.current;

      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        const fn = goto[e.key.toLowerCase()];
        if (fn) {
          e.preventDefault();
          fn();
        }
        return;
      }
      if (e.key === "g") {
        pendingG.current = window.setTimeout(() => (pendingG.current = null), 1200);
        return;
      }
      if (e.key === "/" && onSlash) {
        e.preventDefault();
        onSlash();
        return;
      }
      if (e.key === "?" && onHelp) {
        e.preventDefault();
        onHelp();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
