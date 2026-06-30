import { useState } from "react";

export function useCarousel<T>(items: T[], limit: number, startAtEnd = false) {
  const total = items.length;
  const initialIdx = startAtEnd ? Math.max(0, total - limit) : 0;
  const [startIdx, setStartIdx] = useState(initialIdx);
  const [direction, setDirection] = useState<number>(0);

  const canPrev = startIdx > 0;
  const canNext = startIdx + limit < total;

  const goPrev = () => {
    if (canPrev) {
      setDirection(-1);
      setStartIdx((prev) => Math.max(0, prev - 1));
    }
  };

  const goNext = () => {
    if (canNext) {
      setDirection(1);
      setStartIdx((prev) => Math.min(total - limit, prev + 1));
    }
  };

  const visible = items.slice(startIdx, startIdx + limit);

  return {
    visible,
    startIdx,
    direction,
    canPrev,
    canNext,
    goPrev,
    goNext,
    total,
  };
}