import { motion } from "framer-motion";

type DataRowProps = {
  label: string;
  value: string | number;
  highlight?: boolean;
};

export default function DataRow({ label, value, highlight }: DataRowProps) {
  return (
    <motion.div 
      whileHover={{ scale: 1.01 }}
      className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${
        highlight 
          ? 'bg-blue-500/10 border-blue-500/20 text-[#3b82f6]' 
          : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 text-gray-700 dark:text-gray-300'
      }`}
    >
      <span className="text-xs font-bold uppercase tracking-widest opacity-60">{label}</span>
      <span className={`text-sm font-black truncate max-w-[240px] ${highlight ? 'text-blue-600 dark:text-blue-400' : ''}`}>
        {value || "-"}
      </span>
    </motion.div>
  );
}
