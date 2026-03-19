import { useEffect, useState, useRef } from 'react';
import { Paperclip, Upload, Loader2, FileText, Image, Trash2, Download, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../lib/format';

interface Attachment {
  id: string;
  file_name: string;
  storage_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

interface FileAttachmentsProps {
  outreachEventId?: string;
  animalId?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string | null) {
  if (fileType?.startsWith('image/')) return Image;
  return FileText;
}

export default function FileAttachments({ outreachEventId, animalId }: FileAttachmentsProps) {
  const { user, isAdmin } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAttachments();
  }, [outreachEventId, animalId]);

  async function loadAttachments() {
    let query = supabase
      .from('attachments')
      .select('id, file_name, storage_path, file_type, file_size, created_at')
      .order('created_at', { ascending: false });

    if (outreachEventId) query = query.eq('outreach_event_id', outreachEventId);
    if (animalId) query = query.eq('animal_id', animalId);

    const { data } = await query;
    setAttachments(data ?? []);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);

    const folder = outreachEventId ? `events/${outreachEventId}` : `animals/${animalId}`;
    const path = `${folder}/${Date.now()}_${file.name}`;

    const { error: uploadErr } = await supabase.storage
      .from('attachments')
      .upload(path, file, { upsert: false });

    if (uploadErr) {
      setUploading(false);
      e.target.value = '';
      return;
    }

    const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);

    await supabase.from('attachments').insert({
      file_name: file.name,
      storage_path: urlData.publicUrl,
      file_type: file.type || null,
      file_size: file.size,
      outreach_event_id: outreachEventId || null,
      animal_id: animalId || null,
      created_by: user.id,
    });

    setUploading(false);
    e.target.value = '';
    loadAttachments();
  }

  async function handleDelete(att: Attachment) {
    // Extract storage path from URL to delete from storage
    const urlParts = att.storage_path.split('/storage/v1/object/public/attachments/');
    if (urlParts[1]) {
      await supabase.storage.from('attachments').remove([decodeURIComponent(urlParts[1])]);
    }
    await supabase.from('attachments').delete().eq('id', att.id);
    loadAttachments();
  }

  return (
    <div className="bg-white rounded-xl border border-night/5 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-muted" strokeWidth={1.75} />
          <span className="text-sm font-semibold text-night">
            Attachments{attachments.length > 0 ? ` (${attachments.length})` : ''}
          </span>
        </div>
        <span className="text-xs text-muted">{expanded ? 'Hide' : 'Show'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {attachments.map((att) => {
            const Icon = getFileIcon(att.file_type);
            return (
              <div key={att.id} className="flex items-center gap-3 p-2.5 bg-sand/40 rounded-lg group">
                <Icon className="w-4 h-4 text-muted shrink-0" strokeWidth={1.75} />
                <div className="flex-1 min-w-0">
                  <a
                    href={att.storage_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-night hover:text-primary truncate block"
                  >
                    {att.file_name}
                  </a>
                  <p className="text-xs text-muted">
                    {att.file_size ? formatFileSize(att.file_size) : ''}
                    {att.file_size ? ' · ' : ''}{formatDate(att.created_at)}
                  </p>
                </div>
                <a
                  href={att.storage_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary/10 transition-all shrink-0"
                  aria-label="Download"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(att)}
                    className="p-1.5 rounded-lg text-muted hover:text-ember hover:bg-ember/10 transition-all shrink-0 opacity-0 group-hover:opacity-100"
                    aria-label="Delete attachment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 w-full p-2.5 border border-dashed border-night/15 rounded-lg text-sm text-muted hover:text-night hover:border-night/30 hover:bg-sand/30 transition-all disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? 'Uploading...' : 'Upload file'}
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.heic,.webp"
          />
        </div>
      )}
    </div>
  );
}
