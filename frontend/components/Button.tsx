"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: ReactNode;
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-rose text-white shadow-glow hover:bg-rose-deep",
  secondary:
    "bg-surface/70 text-ink border border-surface/80 hover:bg-surface",
  ghost:
    "bg-transparent text-ink-soft hover:text-ink hover:bg-surface/50",
};

export default function Button({ children, variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <motion.button
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-display font-medium tracking-wide transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
