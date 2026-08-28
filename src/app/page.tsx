'use client';
import { useState, useEffect } from 'react';

export const dynamic = 'force-dynamic';

export default function Dashboard() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/drafts');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch backend logs");
      setDrafts(data.drafts || []);
    } catch (err: any) {
      alert("Error fetching database drafts: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (id: string, text: string) => {
    setProcessingId(id);
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, approvedText: text })
      });
      const data = await res.json();
      if (data.success) {
        alert("?? Tweet published successfully!");
        setDrafts(drafts.filter(d => d.id !== id));
      } else {
        alert("Error publishing: " + data.error);
      }
    } catch (err: any) {
      alert("Network Error: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="border-b border-slate-800 pb-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                NexplanIT Social Automation Hub
              </h1>
              <p className="text-slate-400 mt-2 text-sm">Review, tweak, and launch weekly AI updates for nexplan.io & arch.nexplan.io</p>
            </div>
            <button 
              onClick={fetchDrafts}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-xs font-medium border border-slate-700 transition-colors"
            >
              ?? Refresh Queue
            </button>
          </div>
        </header>

        <section className="bg-slate-800/50 border border-slate-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            Pending Content Review Queue
          </h2>

          {loading ? (
            <p className="text-slate-400 italic text-sm">Querying internal proxy routes...</p>
          ) : drafts.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-700 rounded-lg">
              <p className="text-slate-400 text-sm">No pending drafts found. Your weekly automatic background generator is completely synchronized!</p>
            </div>
          ) : (
            drafts.map((draft) => {
              const textContent = draft.generated_text || '';
              const isArch = textContent.toLowerCase().includes('arch.nexplan');
              const displayLabel = isArch ? 'arch.nexplan.io' : 'nexplan.io';

              return (
                <div key={draft.id} className="bg-slate-900 border border-slate-700/60 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-md uppercase tracking-wider ${
                      isArch ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {displayLabel}
                    </span>
                    <span className="text-xs text-slate-500">Channel: X (Twitter)</span>
                  </div>
                  <textarea
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-3 text-slate-200 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none resize-y"
                    rows={3}
                    value={textContent}
                    onChange={(e) => {
                      setDrafts(drafts.map(d => d.id === draft.id ? { ...d, generated_text: e.target.value } : d));
                    }}
                  />
                  <div className="flex justify-end gap-3 mt-4">
                    <button 
                      disabled={processingId !== null}
                      onClick={() => handlePublish(draft.id, textContent)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-md text-xs font-bold transition-all disabled:opacity-40"
                    >
                      {processingId === draft.id ? 'Publishing...' : 'Approve & Tweet Live'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
