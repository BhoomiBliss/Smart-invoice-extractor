import React, { useState } from 'react';
import { Settings as SettingsIcon, Cloud, Slack, FolderKanban, CheckCircle } from 'lucide-react';

export const Settings: React.FC = () => {
  const [connections, setConnections] = useState({
    s3: false,
    gdrive: false,
    slack: false
  });

  const toggleConnection = (key: keyof typeof connections) => {
    setConnections((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2 text-slate-100 flex items-center space-x-2.5">
          <SettingsIcon className="w-5 h-5 text-indigo-400" />
          <span>Platform Integrations</span>
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Connect your invoice document intelligence workspace directly to external cloud persistence structures and communication pipelines.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Amazon S3 Integration */}
        <div className="p-6 rounded-xl border border-slate-800 bg-surface-900 flex flex-col justify-between h-48 hover:shadow-lg hover:shadow-brand-500/5 transition">
          <div>
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
              <Cloud className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">Amazon Web Services S3</h3>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed font-semibold">
              Persist clean extracted JSON payloads and original document files directly to secure S3 storage.
            </p>
          </div>
          <div className="flex justify-between items-center mt-4">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              connections.s3 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
            }`}>
              {connections.s3 ? 'Connected' : 'Offline'}
            </span>
            <button
              onClick={() => toggleConnection('s3')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                connections.s3
                  ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                  : 'bg-brand-600 hover:bg-brand-500 text-slate-100'
              }`}
            >
              {connections.s3 ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        </div>

        {/* Google Drive Integration */}
        <div className="p-6 rounded-xl border border-slate-800 bg-surface-900 flex flex-col justify-between h-48 hover:shadow-lg hover:shadow-brand-500/5 transition">
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
              <FolderKanban className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">Google Drive</h3>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed font-semibold">
              Import invoices dynamically from shared Google folders and synchronize verification snapshots.
            </p>
          </div>
          <div className="flex justify-between items-center mt-4">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              connections.gdrive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
            }`}>
              {connections.gdrive ? 'Connected' : 'Offline'}
            </span>
            <button
              onClick={() => toggleConnection('gdrive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                connections.gdrive
                  ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                  : 'bg-brand-600 hover:bg-brand-500 text-slate-100'
              }`}
            >
              {connections.gdrive ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        </div>

        {/* Slack Integration */}
        <div className="p-6 rounded-xl border border-slate-800 bg-surface-900 flex flex-col justify-between h-48 hover:shadow-lg hover:shadow-brand-500/5 transition">
          <div>
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
              <Slack className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">Slack Slackbot</h3>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed font-semibold">
              Dispatches alerts to accounting channels on numerical inconsistencies, low consensus ratings, or processing limits.
            </p>
          </div>
          <div className="flex justify-between items-center mt-4">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              connections.slack ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
            }`}>
              {connections.slack ? 'Connected' : 'Offline'}
            </span>
            <button
              onClick={() => toggleConnection('slack')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                connections.slack
                  ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                  : 'bg-brand-600 hover:bg-brand-500 text-slate-100'
              }`}
            >
              {connections.slack ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
