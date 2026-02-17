"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface NumberTickerProps {
  value: number;
  className?: string;
  format?: (n: number) => string;
}

export function NumberTicker({
  value,
  className,
  format = (n) => n.toLocaleString(),
}: NumberTickerProps) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (current) =>
    format(Math.round(current)),
  );
  const [displayValue, setDisplayValue] = useState(format(0));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => setDisplayValue(v));
    return unsubscribe;
  }, [display]);

  return <span className={className}>{displayValue}</span>;
}
