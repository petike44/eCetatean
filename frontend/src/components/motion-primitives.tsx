import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { fadeUp, motionTransition, springSnappy, staggerContainer, staggerItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

type MotionDivProps = HTMLMotionProps<"div">;

interface FadeInProps extends MotionDivProps {
  children: ReactNode;
  delay?: number;
}

export function FadeIn({ children, className, delay = 0, ...props }: FadeInProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      transition={{ ...motionTransition(), delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface StaggerListProps extends MotionDivProps {
  children: ReactNode;
}

export function StaggerList({ children, className, ...props }: StaggerListProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps extends MotionDivProps {
  children: ReactNode;
}

export function StaggerItem({ children, className, ...props }: StaggerItemProps) {
  return (
    <motion.div variants={staggerItem} className={className} {...props}>
      {children}
    </motion.div>
  );
}

interface MotionCardProps extends MotionDivProps {
  children: ReactNode;
  interactive?: boolean;
}

export function MotionCard({ children, className, interactive = true, ...props }: MotionCardProps) {
  return (
    <motion.div
      whileHover={interactive ? { y: -2, transition: springSnappy } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      className={cn(
        "bg-surface border border-border rounded-2xl shadow-card transition-shadow duration-200",
        interactive && "lg:hover:shadow-elevated lg:hover:border-primary/20",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
