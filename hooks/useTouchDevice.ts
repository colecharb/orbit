import { useState, useEffect } from "react";

export function useTouchDevice(): boolean {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const hasTouchSupport =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsTouchDevice(hasTouchSupport);
  }, []);

  return isTouchDevice;
}
