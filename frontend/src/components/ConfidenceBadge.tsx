import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";

type ConfidenceBadgeProps = {
  score: number; // 0.0 - 1.0
};

export default function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  // Thresholds: Verified (> 0.8), Review (0.6–0.8), Flagged (< 0.6)
  const isVerified = score > 0.8;
  const isReview = score >= 0.6 && score <= 0.8;
  const isFlagged = score < 0.6;

  const config = {
    verified: {
      label: "Verified",
      color:
        "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
      dot: "bg-emerald-500",
      icon: <ShieldCheck size={14} />,
    },
    review: {
      label: "Review",
      color:
        "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
      dot: "bg-amber-500",
      icon: <ShieldQuestion size={14} />,
    },
    flagged: {
      label: "Flagged",
      color: "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400",
      dot: "bg-red-500",
      icon: <ShieldAlert size={14} />,
    },
  };

  const current = isVerified
    ? config.verified
    : isReview
      ? config.review
      : config.flagged;

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`px-3 py-1 rounded-full flex items-center gap-2 border font-black text-[10px] uppercase tracking-wider ${current.color} shadow-sm`}
    >
      <div
        className={`w-1.5 h-1.5 rounded-full animate-pulse ${current.dot}`}
      />
      <span className="flex items-center gap-1">
        {current.icon}
        {current.label} ({(score * 100).toFixed(0)}%)
      </span>
    </motion.div>
  );
}
