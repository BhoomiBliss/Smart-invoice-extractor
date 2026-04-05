import IntelligenceLedger from "../components/IntelligenceLedger";

export default function HistoryPage() {
  return (
    <div className="flex w-full flex-1 flex-col px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col">
        <IntelligenceLedger />
      </div>
    </div>
  );
}
