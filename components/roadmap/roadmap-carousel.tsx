"use client";

import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function RoadmapCarousel({ children }: { children: ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);

  const scrollByPage = (direction: -1 | 1) => {
    const node = scroller.current;
    if (!node) return;
    node.scrollBy({
      left: direction * Math.max(node.clientWidth * 0.72, 240),
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Show earlier stages"
        onClick={() => scrollByPage(-1)}
        className="absolute top-[42%] left-2 z-20 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-black/55 sm:grid lg:left-3"
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Show later stages"
        onClick={() => scrollByPage(1)}
        className="absolute top-[42%] right-2 z-20 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-black/55 sm:grid lg:right-3"
      >
        <ChevronRight size={20} aria-hidden="true" />
      </button>
      <div
        ref={scroller}
        className="[scrollbar-width:none] overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
}
