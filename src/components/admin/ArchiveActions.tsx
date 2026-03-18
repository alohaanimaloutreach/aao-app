import { useState } from 'react';
import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  tableName: string;
  recordId: string;
  isArchived: boolean;
  recordLabel: string;
  onUpdate: () => void;
}

export default function ArchiveActions({ tableName, recordId, isArchived, recordLabel, onUpdate }: Props) {
  const { user, isAdmin } = useAuth();
  const [confirming, setConfirming] = useState<'archive' | 'restore' | 'delete' | null>(null);
  const [deleteText, setDeleteText] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!isAdmin) return null;

  async function handleArchive() {
    if (!user) return;
    setProcessing(true);
    await supabase.from(tableName).update({
      archived: true,
      archived_at: new Date().toISOString(),
      archived_by: user.id,
    }).eq('id', recordId);
    setProcessing(false);
    setConfirming(null);
    onUpdate();
  }

  async function handleRestore() {
    setProcessing(true);
    await supabase.from(tableName).update({
      archived: false,
      archived_at: null,
      archived_by: null,
    }).eq('id', recordId);
    setProcessing(false);
    setConfirming(null);
    onUpdate();
  }

  async function handleDelete() {
    if (deleteText !== 'DELETE') return;
    setProcessing(true);
    await supabase.from(tableName).delete().eq('id', recordId);
    setProcessing(false);
    setConfirming(null);
    onUpdate();
  }

  // Confirmation dialogs
  if (confirming) {
    return (
      <div className="bg-white rounded-2xl border border-night/5 p-5">
        {confirming === 'archive' && (
          <>
            <h3 className="font-heading font-bold text-night text-sm mb-2">Archive {recordLabel}?</h3>
            <p className="text-xs text-muted mb-4">This record will be hidden from all views. It can be restored later.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirming(null)} className="flex-1 py-2 text-sm font-medium text-muted bg-sand rounded-xl hover:bg-muted/15 transition-all">Cancel</button>
              <button onClick={handleArchive} disabled={processing} className="flex-1 py-2 text-sm font-semibold text-white bg-muted hover:bg-night rounded-xl transition-all disabled:opacity-50">
                {processing ? 'Archiving...' : 'Archive'}
              </button>
            </div>
          </>
        )}

        {confirming === 'restore' && (
          <>
            <h3 className="font-heading font-bold text-night text-sm mb-2">Restore {recordLabel}?</h3>
            <p className="text-xs text-muted mb-4">This record will be visible again in all views.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirming(null)} className="flex-1 py-2 text-sm font-medium text-muted bg-sand rounded-xl hover:bg-muted/15 transition-all">Cancel</button>
              <button onClick={handleRestore} disabled={processing} className="flex-1 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl transition-all disabled:opacity-50">
                {processing ? 'Restoring...' : 'Restore'}
              </button>
            </div>
          </>
        )}

        {confirming === 'delete' && (
          <>
            <h3 className="font-heading font-bold text-ember text-sm mb-2">Permanently Delete {recordLabel}?</h3>
            <p className="text-xs text-muted mb-3">This action cannot be undone. All linked data will also be removed.</p>
            <div className="mb-4">
              <label className="block text-xs text-muted font-medium mb-1">Type DELETE to confirm</label>
              <input
                type="text"
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 bg-sand/50 border border-ember/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ember/30"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setConfirming(null); setDeleteText(''); }} className="flex-1 py-2 text-sm font-medium text-muted bg-sand rounded-xl hover:bg-muted/15 transition-all">Cancel</button>
              <button onClick={handleDelete} disabled={processing || deleteText !== 'DELETE'} className="flex-1 py-2 text-sm font-semibold text-white bg-ember hover:bg-ember/90 rounded-xl transition-all disabled:opacity-30">
                {processing ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {isArchived ? (
        <>
          <button
            onClick={() => setConfirming('restore')}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/15 text-primary text-xs font-medium rounded-xl transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
            Restore
          </button>
          <button
            onClick={() => setConfirming('delete')}
            className="flex items-center gap-1.5 px-3 py-2 bg-ember/8 hover:bg-ember/15 text-ember text-xs font-medium rounded-xl transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
            Delete Permanently
          </button>
        </>
      ) : (
        <button
          onClick={() => setConfirming('archive')}
          className="flex items-center gap-1.5 px-3 py-2 bg-sand hover:bg-muted/15 text-muted text-xs font-medium rounded-xl transition-all"
        >
          <Archive className="w-3.5 h-3.5" strokeWidth={1.75} />
          Archive
        </button>
      )}
    </div>
  );
}
