import React, { useState, useEffect } from 'react';
import { 
  Server, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Terminal, 
  ExternalLink, 
  X, 
  Copy, 
  Check, 
  ShieldCheck 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { healthService } from '../../services/api';

interface BackendStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackendStatusModal: React.FC<BackendStatusModalProps> = ({ isOpen, onClose }) => {
  const { activeBackendUrl, updateBackendUrl, token } = useAuth();
  const [customUrl, setCustomUrl] = useState(activeBackendUrl);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ ok: boolean; latencyMs?: number; data?: any; error?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const performPing = async (urlToCheck?: string) => {
    setIsPinging(true);
    const result = await healthService.checkHealth(urlToCheck || customUrl);
    setPingResult(result);
    setIsPinging(false);
  };

  useEffect(() => {
    if (isOpen) {
      setCustomUrl(activeBackendUrl);
      performPing(activeBackendUrl);
    }
  }, [isOpen, activeBackendUrl]);

  if (!isOpen) return null;

  const handleApplyUrl = () => {
    updateBackendUrl(customUrl);
    performPing(customUrl);
  };

  const handleResetToDefault = () => {
    setCustomUrl('/api');
    updateBackendUrl('/api');
    performPing('/api');
  };

  const copyFlaskCmd = () => {
    navigator.clipboard.writeText('cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && python app.py');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-md shadow-blue-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Backend API Configuration</h3>
              <p className="text-xs text-slate-500">Flask REST API & Full-Stack Engine Connection</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Card */}
        <div className="my-5 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Connection Health</span>
            <button 
              onClick={() => performPing(customUrl)}
              disabled={isPinging}
              className="inline-flex items-center space-x-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
              <span>{isPinging ? 'Pinging...' : 'Re-test'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-slate-200">
            {pingResult?.ok ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-rose-500 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-slate-800">
                  {pingResult?.ok ? 'Connected & Verified' : 'Unable to Connect'}
                </span>
                {pingResult?.latencyMs !== undefined && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {pingResult.latencyMs}ms
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {pingResult?.ok 
                  ? (pingResult.data?.service || 'CreatorIQ REST API ready') 
                  : (pingResult?.error || 'Make sure the Flask or Node backend is running')}
              </p>
            </div>
          </div>

          {/* Active Features */}
          {pingResult?.data?.features && (
            <div className="pt-2 border-t border-slate-200/60">
              <div className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Backend Capabilities Active:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {pingResult.data.features.map((feat: string, idx: number) => (
                  <div key={idx} className="text-[11px] text-slate-600 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                    <span className="truncate">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Change API URL Form */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            Target REST API Endpoint URL
          </label>
          <div className="flex items-center space-x-2">
            <input 
              type="text" 
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="e.g. /api or http://localhost:5000/api"
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
            <button
              onClick={handleApplyUrl}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              Save URL
            </button>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span>Presets:</span>
            <button 
              onClick={handleResetToDefault}
              className="underline text-blue-600 hover:text-blue-700 font-medium"
            >
              Integrated Dev API (/api)
            </button>
            <span>•</span>
            <button 
              onClick={() => {
                setCustomUrl('http://127.0.0.1:5000/api');
                updateBackendUrl('http://127.0.0.1:5000/api');
                performPing('http://127.0.0.1:5000/api');
              }}
              className="underline text-purple-600 hover:text-purple-700 font-medium"
            >
              Python Flask (localhost:5000/api)
            </button>
          </div>
        </div>

        {/* Python Flask Instructions Snippet */}
        <div className="mt-5 p-3.5 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center space-x-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px]">Run Python Flask Backend Locally</span>
            </span>
            <button 
              onClick={copyFlaskCmd}
              className="hover:text-white transition-colors flex items-center space-x-1 text-[11px]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy command'}</span>
            </button>
          </div>
          <div className="text-slate-300 overflow-x-auto py-1">
            <code>cd backend &amp;&amp; python3 app.py</code>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
