"use client";

import React, { useLayoutEffect, useRef } from "react";

/**
 * A hover/tap preview rendered with position: fixed, so no panel or grid can clip it. It is
 * measured after render and placed above the anchor if it fits under the sticky nav, else
 * below, else pinned under the nav; horizontally it is clamped inside the viewport.
 * side="right" places it beside the anchor instead (left if there is no room on the right).
 */
export function FloatingPreview({ anchor, maxWidth, interactive, side = "above", children }: {
  anchor: DOMRect;
  maxWidth: number;
  interactive: boolean;
  side?: "above" | "right";
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const m = 8;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const navBottom = Math.max(0, document.querySelector("nav")?.getBoundingClientRect().bottom ?? 0) + m;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let left: number;
    let top: number;
    if (side === "right" && (anchor.right + m + w <= vw - m || anchor.left - m - w >= m)) {
      left = anchor.right + m + w <= vw - m ? anchor.right + m : anchor.left - m - w;
      top = Math.min(Math.max(navBottom, anchor.top + anchor.height / 2 - h / 2), Math.max(navBottom, vh - h - m));
    } else {
      left = Math.min(Math.max(m, anchor.left + anchor.width / 2 - w / 2), vw - w - m);
      top = anchor.top - h - m >= navBottom ? anchor.top - h - m
        : anchor.bottom + m + h <= vh - m ? anchor.bottom + m
        : Math.max(navBottom, vh - h - m);
    }
    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
    el.style.visibility = "visible";
  }, [anchor, side]);
  return (
    <div ref={ref} role="tooltip" data-floating-preview
      style={{ position: "fixed", top: 0, left: 0, visibility: "hidden", width: `min(${maxWidth}px, calc(100vw - 16px))` }}
      className={`z-[150] ${interactive ? "" : "pointer-events-none"}`}>
      {children}
    </div>
  );
}
