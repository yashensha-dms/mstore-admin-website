"use client";
import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function ScrollRestoration() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Save scroll position when window scrolls
  useEffect(() => {
    const handleScroll = () => {
      const key = `${pathname}${searchParams.toString() ? "?" + searchParams.toString() : ""}`;
      try {
        sessionStorage.setItem("scroll_pos_" + key, window.scrollY.toString());
      } catch (e) {}
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname, searchParams]);

  // Restore scroll position on pathname/searchParams change
  useEffect(() => {
    const key = `${pathname}${searchParams.toString() ? "?" + searchParams.toString() : ""}`;
    let savedPos = 0;
    try {
      const stored = sessionStorage.getItem("scroll_pos_" + key);
      if (stored) savedPos = parseInt(stored, 10);
    } catch (e) {}

    let timer;
    let frameId;
    if (savedPos > 0) {
      const attemptScroll = () => {
        window.scrollTo({
          top: savedPos,
          behavior: "instant"
        });
      };
      
      // Restore on next animation frame, and again after a short timeout to handle React Query re-renders
      frameId = requestAnimationFrame(attemptScroll);
      timer = setTimeout(attemptScroll, 250);
    } else {
      window.scrollTo(0, 0);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [pathname, searchParams]);

  return null;
}
