import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FileText, Save, CheckCircle, ArrowLeft, Search, Download } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import { useInvoiceStore } from '../store/invoice.store';
import Sidebar from '../components/Sidebar';
import UploadForm from '../components/UploadForm';
import InvoiceTable from '../components/InvoiceTable';
import JsonEditor from '../components/JsonEditor';
import SummaryCard from '../components/SummaryCard';
import Chatbot from '../components/Chatbot';
import Settings from '../components/Settings';
import Support from '../components/Support';
import Help from '../components/Help';
import ConflictResolutionModal from '../components/ConflictResolutionModal';

export const UserDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const isGuest = !auth?.user && location.search.includes('session=guest');
  const token = auth?.token || null;

  const [activeTab, setActiveTab] = useState('upload');
  
  // Historical invoice tracking
  const [invoicesList, setInvoicesList] = useState<any[]>([]);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);

  // Active HITL Editor state
  const { invoice, setInvoice, unsavedChanges, saveChangesToServer } = useInvoiceStore();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync to auth guard
  useEffect(() => {
    if (!auth?.loading && !auth?.user && !isGuest) {
      navigate('/login');
    }
  }, [auth, isGuest, navigate]);

  // Fetch extraction history
  const fetchHistory = async () => {
    if (isGuest) return;
    try {
      setHistoryLoading(true);
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(
        `/api/v1/invoices?page=${currentPage}&limit=10&search=${searchQuery}`,
        { headers: authHeader }
      );
      setInvoicesList(response.data.invoices);
      setTotalInvoices(response.data.total);
    } catch (err) {
      console.error('Failed to load history metrics:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, currentPage, searchQuery]);

  const handleExtractionComplete = (extractedInvoice: any) => {
    setInvoice(extractedInvoice);
    setActiveTab('editor'); // Shift layout to editor
  };

  const handleCommitOverride = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    // Create axios request wrapper
    const api = axios.create({
      baseURL: '/api/v1',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    const isSuccess = await saveChangesToServer();
    setIsSaving(false);

    if (isSuccess) {
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        if (!isGuest) {
          setActiveTab('history');
          setInvoice(null);
        }
      }, 2000);
    }
  };

  const handleExportCSV = () => {
    if (invoicesList.length === 0) return;
    
    const headers = ['Invoice #', 'Vendor', 'Recipient', 'Date', 'Currency', 'Total Amount', 'Confidence'];
    const rows = invoicesList.map((inv) => [
      inv.invoiceNumber.value,
      inv.vendor.value,
      inv.recipient.value,
      inv.date.value,
      inv.currency.value,
      inv.totalAmount.value,
      `${Math.round(inv.confidenceScore * 100)}%`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `invoice_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.90) return 'text-emerald-400 font-bold';
    if (score >= 0.70) return 'text-amber-400 font-bold';
    return 'text-red-400 font-bold';
  };

  return (
    <div className="flex bg-surface-950 min-h-screen">
      {/* Sidebar Nav */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Pane */}
      <main className="flex-grow pl-64 p-8 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header Row */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-800">
            <div>
              <h1 className="text-2xl font-black text-slate-100 uppercase tracking-wider">
                {activeTab === 'upload' && 'Document Ingestion Pipeline'}
                {activeTab === 'history' && 'Extraction History'}
                {activeTab === 'editor' && 'Human-in-the-Loop Correction Engine'}
                {activeTab === 'chatbot' && 'AI Assistance Workspace'}
                {activeTab === 'settings' && 'Platform Settings'}
                {activeTab === 'support' && 'Technical Support Panel'}
                {activeTab === 'help' && 'System Knowledge Base'}
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-semibold">
                {isGuest ? 'Guest Trial mode enabled' : `Welcome, ${auth?.user?.name || 'Accountant'}`}
              </p>
            </div>
          </div>

          {/* Document Ingestion Tab */}
          {activeTab === 'upload' && (
            <UploadForm onExtractionComplete={handleExtractionComplete} token={token} />
          )}

          {/* Historical extractions log grid */}
          {activeTab === 'history' && !isGuest && (
            <div className="space-y-4">
              <div className="flex justify-between items-center gap-4">
                <div className="relative flex-grow max-w-md">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search by vendor name..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg text-xs text-slate-100 glass-input"
                  />
                </div>
                <button
                  onClick={handleExportCSV}
                  disabled={invoicesList.length === 0}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-100 bg-brand-600 hover:bg-brand-500 transition flex items-center space-x-1.5 shadow-lg hover:shadow-brand-500/20 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>

              {historyLoading ? (
                <div className="text-center py-12 text-sm text-slate-500">Loading invoice history...</div>
              ) : invoicesList.length === 0 ? (
                <div className="text-center py-12 text-sm text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No invoice extractions stored. Upload a document to start.
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-surface-900 overflow-hidden">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-surface-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        <th className="px-6 py-4">Invoice #</th>
                        <th className="px-6 py-4">Vendor</th>
                        <th className="px-6 py-4">Recipient</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4 w-32">Total Amount</th>
                        <th className="px-6 py-4 w-24 text-center">Confidence</th>
                        <th className="px-6 py-4 w-20 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300 font-medium">
                      {invoicesList.map((inv) => (
                        <tr key={inv._id} className="hover:bg-surface-800 transition">
                          <td className="px-6 py-4 font-bold text-slate-200">{inv.invoiceNumber.value}</td>
                          <td className="px-6 py-4">{inv.vendor.value}</td>
                          <td className="px-6 py-4">{inv.recipient.value}</td>
                          <td className="px-6 py-4">{inv.date.value}</td>
                          <td className="px-6 py-4 font-bold text-slate-200">{inv.currency.value} {inv.totalAmount.value.toFixed(2)}</td>
                          <td className={`px-6 py-4 text-center ${getConfidenceColor(inv.confidenceScore)}`}>
                            {Math.round(inv.confidenceScore * 100)}%
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => {
                                setInvoice(inv);
                                setActiveTab('editor');
                              }}
                              className="text-xs font-bold text-brand-400 hover:text-brand-300 underline"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* HITL Correction Engine Workspace */}
          {activeTab === 'editor' && invoice && (
            <div className="space-y-6">
              {/* Editor Bar controls */}
              <div className="flex justify-between items-center bg-surface-900 px-6 py-3 rounded-xl border border-slate-800">
                <button
                  onClick={() => {
                    setInvoice(null);
                    setActiveTab(isGuest ? 'upload' : 'history');
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-slate-100 flex items-center space-x-1.5 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Exit Auditor Workspace</span>
                </button>

                <div className="flex items-center space-x-4">
                  {unsavedChanges && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase animate-pulse">
                      Unsaved Changes
                    </span>
                  )}
                  <button
                    onClick={handleCommitOverride}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-slate-100 bg-brand-600 hover:bg-brand-500 transition flex items-center space-x-1.5 shadow-lg hover:shadow-brand-500/20 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving edits...' : 'Commit Verified Data'}</span>
                  </button>
                </div>
              </div>

              {saveSuccess && (
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 animate-bounce" />
                  <span>Invoice overrides committed successfully! Redirecting...</span>
                </div>
              )}

              {/* Dynamic 3-View Synchronized Editor Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Panel: Table Editor (7 cols) */}
                <div className="lg:col-span-7">
                  <InvoiceTable />
                </div>

                {/* Right Panel: JSON Editor & Summary Card (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
                  <div>
                    <SummaryCard />
                  </div>
                  <div>
                    <JsonEditor />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Chatbot Tab */}
          {activeTab === 'chatbot' && (
            <div className="max-w-3xl mx-auto">
              <Chatbot />
            </div>
          )}

          {/* Integrations settings Tab */}
          {activeTab === 'settings' && !isGuest && <Settings />}

          {/* Support ticket creation Tab */}
          {activeTab === 'support' && !isGuest && <Support />}

          {/* FAQ Accordion Tab */}
          {activeTab === 'help' && <Help />}

          {/* Concurrency Conflict Resolution Gate Modal */}
          <ConflictResolutionModal />

        </div>
      </main>
    </div>
  );
};

export default UserDashboard;
