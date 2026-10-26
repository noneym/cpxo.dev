"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { DeviceMobile, WindowsLogo, Terminal } from "@phosphor-icons/react";

const steps = [
  { from: "iPhone", icon: DeviceMobile, text: "Meet at 14:30, gate B7. Bring the USB-C dock.", to: "Windows" },
  { from: "Windows", icon: WindowsLogo, text: "https://cpxo.dev/f/k3v9xq2a/build-2026.zip", to: "iPhone" },
  { from: "shell", icon: Terminal, text: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDk2", to: "Windows" },
];

/** A live loop of the product's core moment: a clip leaving one device and landing on another. */
export function ClipDemo() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((n) => (n + 1) % steps.length), 3200);
    return () => clearInterval(t);
  }, [reduce]);
  const s = steps[i];
  const Icon = s.icon;
  return (
    <div className="card relative overflow-hidden p-5 md:p-6">
      <div className="flex items-center justify-between text-xs text-fog">
        <span className="inline-flex items-center gap-1.5">
          <Icon size={16} /> copied on {s.from}
        </span>
        <span>arrives on {s.to}</span>
      </div>
      <div className="mt-4 min-h-[88px]">
        <AnimatePresence mode="wait">
          <motion.p
            key={i}
            initial={reduce ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="break-all font-mono text-[15px] leading-relaxed text-paper"
          >
            {s.text}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-line">
          <motion.div
            key={`bar-${i}`}
            className="h-full bg-lime"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: reduce ? 0 : 3.1, ease: "linear" }}
          />
        </div>
        <span className="font-mono text-xs text-fog">synced</span>
      </div>
    </div>
  );
}
