"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ===== Loading Skeleton =====
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("tm-card p-3 animate-pulse", className)}>
      <div className="h-3 bg-muted rounded w-1/3 mb-2" />
      <div className="h-5 bg-muted rounded w-1/2 mb-3" />
      <div className="h-3 bg-muted/50 rounded w-2/3" />
    </div>
  );
}

export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 p-2.5 animate-pulse", className)}>
      <div className="w-8 h-8 bg-muted rounded-full shrink-0" />
      <div className="flex-1 space-y-1">
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-2 bg-muted/50 rounded w-1/3" />
      </div>
      <div className="w-8 h-8 bg-muted rounded shrink-0" />
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="tm-card divide-y divide-border">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

// ===== Pull to Refresh =====
export function usePullToRefresh(onRefresh: () => void) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const THRESHOLD = 60;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (el.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        setPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pulling) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;
      if (diff > 0 && el.scrollTop === 0) {
        e.preventDefault();
        setPullDistance(Math.min(diff * 0.5, 80));
      }
    };

    const handleTouchEnd = () => {
      if (pullDistance >= THRESHOLD) {
        onRefresh();
      }
      setPulling(false);
      setPullDistance(0);
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pulling, pullDistance, onRefresh]);

  return {
    containerRef,
    pullDistance,
    isRefreshing: pullDistance >= THRESHOLD,
  };
}

// Pull-to-refresh indicator
export function PullIndicator({ pullDistance, isRefreshing }: {
  pullDistance: number;
  isRefreshing: boolean;
}) {
  if (pullDistance === 0 && !isRefreshing) return null;
  const opacity = Math.min(1, pullDistance / 60);
  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-all"
      style={{ height: `${pullDistance}px`, opacity }}
    >
      <div className={cn("flex flex-col items-center gap-1", isRefreshing && "animate-spin")}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
          <path d="M21 12a9 9 0 11-6.219-8.56" />
        </svg>
        <span className="text-[9px] text-muted-foreground font-bold">
          {isRefreshing ? "Yenileniyor..." : "Yenilemek için çek"}
        </span>
      </div>
    </div>
  );
}
