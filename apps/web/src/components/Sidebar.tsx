import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Upload, History, Settings, LifeBuoy, MessageSquare, HelpCircle, LogOut, ShieldAlert, BarChart3 } from 'lucide-react';
import AuthContext from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isAdmin = false }) => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const isGuest = !auth?.user && location.search.includes('session=guest');

  interface TabItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    disabled?: boolean;
  }

  const userTabs: TabItem[] = [
    { id: 'upload', label: 'Document Ingestion', icon: <Upload className="w-4 h-4" /> },
    { id: 'history', label: 'Extraction History', icon: <History className="w-4 h-4" />, disabled: isGuest },
    { id: 'chatbot', label: 'AI Assistance', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'settings', label: 'Integrations', icon: <Settings className="w-4 h-4" />, disabled: isGuest },
    { id: 'support', label: 'Technical Support', icon: <LifeBuoy className="w-4 h-4" />, disabled: isGuest },
    { id: 'help', label: 'Knowledge Base', icon: <HelpCircle className="w-4 h-4" /> }
  ];
 
  const adminTabs: TabItem[] = [
    { id: 'telemetry', label: 'Telemetry Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'users', label: 'Identity IAM', icon: <Settings className="w-4 h-4" /> },
    { id: 'health', label: 'System Health', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'logs', label: 'Audit Log Console', icon: <History className="w-4 h-4" /> }
  ];

  const tabs = isAdmin ? adminTabs : userTabs;

  const handleLogout = () => {
    if (auth?.logout) {
      auth.logout();
    }
    navigate('/');
  };

  const getRoleBadge = () => {
    if (isGuest) return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700 ml-1">Guest ⚪</span>;
    const role = auth?.user?.role || 'user';
    switch (role) {
      case 'admin':
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 ml-1">Admin 🔴</span>;
      case 'ops':
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 ml-1">Ops 🟣</span>;
      case 'support':
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 ml-1">Support 🟡</span>;
      default:
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 ml-1">User 🔵</span>;
    }
  };

  return (
    <aside className="w-64 bg-surface-900 border-r border-slate-800 flex flex-col justify-between h-screen fixed left-0 top-0 z-10 glass-panel">
      <div>
        {/* Sidebar Header Logo */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-wider text-slate-100 flex items-center">
              <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 text-transparent bg-clip-text font-black">InvoiceFlow AI</span>
              {getRoleBadge()}
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">
              {isGuest ? 'Guest Trial Mode' : isAdmin ? 'Admin Console' : 'SaaS Ingestion Workspace'}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="p-4 space-y-1">
          {tabs.map((tab) => {
            const isTabDisabled = tab.disabled;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                disabled={isTabDisabled}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center space-x-3 transition duration-150 relative ${
                  isTabDisabled
                    ? 'opacity-30 cursor-not-allowed'
                    : isActive
                    ? 'bg-brand-500/10 text-brand-400 border-l-2 border-brand-500 rounded-l-none'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-surface-800'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer Logout */}
      <div className="p-4 border-t border-slate-800">
        {isAdmin && (
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold text-indigo-400 hover:bg-surface-800 transition duration-150 mb-2 flex items-center space-x-3"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Switch to User View</span>
          </button>
        )}
        <button
          onClick={handleLogout}
          className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/5 transition duration-150 flex items-center space-x-3"
        >
          <LogOut className="w-4 h-4" />
          <span>{isGuest ? 'Exit Trial' : 'Sign Out'}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
