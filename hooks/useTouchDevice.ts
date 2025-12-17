import { useState, useEffect } from "react";

export function useTouchDevice(): boolean {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const hasTouchSupport =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as Navigator & { msMaxTouchPoints?: number })
        .msMaxTouchPoints > 0;
    setIsTouchDevice(hasTouchSupport);
  }, []);

  return isTouchDevice;
}
