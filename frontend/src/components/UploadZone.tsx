import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, CheckCircle2, Sparkles } from "lucide-react";

interface UploadZoneProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  isExtracting: boolean;
}

export default function UploadZone({
  onFileSelect,
  selectedFile,
  isExtracting,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isExtracting) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!isExtracting && e.dataTransfer.files?.[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl relative" style={{ zIndex: 10 }}>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,image/*"
        onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
      />

      <motion.div
        layout
        onClick={() => !isExtracting && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        animate={{
          y: [0, -8, 0],
          borderColor:
            isDragging || selectedFile
              ? "#3b82f6"
              : ["#e5e7eb", "#3b82f633", "#e5e7eb"],
        }}
        transition={{
          y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          borderColor: { duration: 3, repeat: Infinity, ease: "linear" },
        }}
        className={`relative w-full h-[320px] rounded-[3rem] border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden shadow-2xl ${
          isDragging
            ? "bg-blue-500/10 scale-[1.02] shadow-blue-500/20"
            : "dark:border-white/10 bg-white/60 dark:bg-[#0b1220]/60 hover:bg-white dark:hover:bg-[#0b1220] shadow-black/5"
        } ${selectedFile ? "bg-blue-500/5 ring-8 ring-blue-500/5" : ""}`}
      >
        {/* Animated Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 opacity-50" />

        <AnimatePresence mode="wait">
          {!selectedFile ? (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
              className="flex flex-col items-center gap-6 p-8 relative z-10"
            >
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 0px rgba(59,130,246,0)",
                    "0 0 20px rgba(59,130,246,0.2)",
                    "0 0 0px rgba(59,130,246,0)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-24 h-24 rounded-[2rem] bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20"
              >
                <UploadCloud size={48} strokeWidth={1.2} />
              </motion.div>
              <div className="text-center">
                <h3 className="text-3xl font-black dark:text-white text-gray-900 mb-3 tracking-tight">
                  Drop your invoice
                </h3>
                <p className="text-[16px] text-gray-500 font-bold tracking-tight opacity-80">
                  Securely process PDF, JPG, or PNG
                </p>
                <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-500/5 py-1 px-3 rounded-full border border-blue-500/10">
                  <Sparkles size={10} /> Neural Ready
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="flex flex-col items-center gap-8 relative z-10"
            >
              <div className="relative group">
                <motion.div
                  animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -inset-8 bg-blue-500/30 blur-3xl rounded-full"
                />
                <div className="relative z-10 w-28 h-28 bg-white dark:bg-[#060b14] rounded-[2rem] flex items-center justify-center shadow-2xl border border-blue-500/20">
                  <FileText size={56} className="text-blue-500" />
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-2 -bottom-2 bg-emerald-500 rounded-full p-2 border-4 border-white dark:border-[#060b14] text-white shadow-xl"
                  >
                    <CheckCircle2 size={24} />
                  </motion.div>
                </div>
              </div>
              <div className="text-center px-10">
                <p className="text-xl font-black dark:text-white text-gray-900 tracking-tight truncate max-w-sm">
                  {selectedFile.name}
                </p>
                <div className="mt-2 text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready
                  for ingestion
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileSelect(null);
                  }}
                  className="mt-8 px-8 py-2.5 rounded-full text-[11px] font-black uppercase text-red-500 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 tracking-[0.2em] transition-all hover:scale-105 active:scale-95"
                >
                  Change Document
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-blue-500/10 backdrop-blur-[4px] pointer-events-none flex items-center justify-center border-4 border-blue-500 rounded-[3rem]"
          >
            <div className="text-blue-500 font-black text-2xl uppercase tracking-widest animate-bounce">
              Release to Analyze
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
