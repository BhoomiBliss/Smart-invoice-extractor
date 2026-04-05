import { useState } from "react";
import type { InvoiceData } from "../types/invoice";
import { ChevronDown, ChevronUp, Code2, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { isExtractionEmpty } from "../utils/helpers";

type JSONViewerProps = {
  invoice: InvoiceData;
};

export default function JSONViewer({ invoice }: JSONViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!invoice || isExtractionEmpty(invoice)) return null;

  const syntaxHighlight = (json: string) => {
    json = json
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      function (match) {
        let cls = "text-green-400"; // number
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "text-blue-300 font-medium"; // key
          } else {
            cls = "text-amber-300"; // string
          }
        } else if (/true|false/.test(match)) {
          cls = "text-purple-400 font-bold"; // boolean
        } else if (/null/.test(match)) {
          cls = "text-slate-500 italic"; // null
        }
        return `<span class="${cls}">${match}</span>`;
      },
    );
  };

  const formattedJSON = JSON.stringify(invoice, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formattedJSON);
    setIsCopied(true);
    toast.success("JSON copied to clipboard");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="w-full mt-12 bg-slate-900/5 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden print:border-none print:mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-8 py-5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group no-print"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-400 transition-colors">
            <Code2 size={18} />
          </div>
          <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            Raw Extracted JSON
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all active:scale-90"
          >
            {isCopied ? (
              <Check size={16} className="text-emerald-500" />
            ) : (
              <Copy size={16} />
            )}
          </button>
          {isOpen ? (
            <ChevronUp size={20} className="text-slate-400" />
          ) : (
            <ChevronDown size={20} className="text-slate-400" />
          )}
        </div>
      </button>

      <div
        className={`${isOpen ? "block" : "hidden"} print:block overflow-hidden`}
      >
        <div className="p-8 pt-0 print:p-0">
          <div className="bg-[#0d121f] print:bg-white rounded-2xl p-6 overflow-auto max-h-[500px] print:max-h-none custom-scrollbar border border-white/5 print:border-none shadow-inner">
            <pre
              className="text-[13px] text-slate-300 print:text-black font-mono tracking-tight leading-relaxed whitespace-pre-wrap break-words"
              dangerouslySetInnerHTML={{
                __html: syntaxHighlight(formattedJSON),
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
