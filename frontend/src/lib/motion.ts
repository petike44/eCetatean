import type { Transition, Variants } from "framer-motion";

export const springSnappy: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
  mass: 0.8,
};

export const springGentle: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 28,
  mass: 0.9,
};

export const tweenFast: Transition = {
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1],
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: tweenFast,
  },
};

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: tweenFast },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: springGentle },
  exit: { opacity: 0, x: 24, transition: tweenFast },
};

export const slideUpSheet: Variants = {
  hidden: { opacity: 0, y: "100%" },
  visible: { opacity: 1, y: 0, transition: springGentle },
  exit: { opacity: 0, y: "100%", transition: tweenFast },
};

export const navIndicator = {
  layoutId: "nav-active",
  className: "absolute inset-0 rounded-xl bg-accent/10",
  transition: springSnappy,
};

/** Returns instant transitions when user prefers reduced motion. */
export function motionTransition(preferred: Transition = tweenFast): Transition {
  if (typeof window === "undefined") return preferred;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? { duration: 0 }
    : preferred;
}

export function useReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
