import React from 'react';
import { Text } from '../Text';

export function CountUpText({
  value,
  className,
  style,
  decimals = 2,
}: {
  value: number;
  className?: string;
  style?: object;
  decimals?: number;
}) {
  const target = Number.isFinite(value) ? value : 0;
  const displayRef = React.useRef(0);
  const [display, setDisplay] = React.useState(0);
  const frameRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const from = displayRef.current;
    const to = target;
    if (Math.abs(from - to) < 0.005) {
      displayRef.current = to;
      setDisplay(to);
      return;
    }

    const duration = Math.min(720, Math.max(320, Math.abs(to - from) * 36));
    const started = Date.now();

    const tick = () => {
      const progress = Math.min(1, (Date.now() - started) / duration);
      const eased = 1 - (1 - progress) ** 3;
      const next = from + (to - from) * eased;
      displayRef.current = next;
      setDisplay(next);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        displayRef.current = to;
        setDisplay(to);
      }
    };

    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current);
    }
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [target]);

  return (
    <Text className={className} style={style}>
      {display.toFixed(decimals)}
    </Text>
  );
}
