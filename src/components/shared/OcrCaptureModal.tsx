import { useState, useRef } from 'react';
import { X, Check, Loader2, Camera, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  open: boolean;
  onClose: () => void;
  onExtracted: (value: string) => void;
  /** What we're looking for — shown in prompt and UI */
  fieldLabel: string;
  /** Optional: save photo to this animal's record */
  animalId?: string;
}

export default function OcrCaptureModal({ open, onClose, onExtracted, fieldLabel, animalId }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedValue, setExtractedValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setProcessing(false);
    setPreview(null);
    setExtractedValue(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreview(dataUrl);
      setProcessing(true);
      setError(null);

      try {
        // Get the base64 data (strip the data:image/...;base64, prefix)
        const base64 = dataUrl.split(',')[1];
        const mediaType = file.type || 'image/jpeg';

        // Call Supabase Edge Function for OCR
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-label`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              image: base64,
              media_type: mediaType,
              field_type: fieldLabel,
            }),
          }
        );

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || 'OCR request failed');
        }

        const result = await response.json();
        const value = result.value?.trim();

        if (!value || value === 'NONE') {
          setError("Couldn't read the number — please type it manually");
          setExtractedValue(null);
        } else {
          setExtractedValue(value);
        }

        // Optionally save the photo as an attachment
        if (animalId && file) {
          const ext = file.name.split('.').pop() || 'jpg';
          const path = `label-scans/${animalId}/${Date.now()}.${ext}`;
          await supabase.storage.from('animal-photos').upload(path, file, { contentType: file.type });
        }
      } catch (err: any) {
        setError(err.message || 'OCR failed — please type the number manually');
      } finally {
        setProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleConfirm() {
    if (extractedValue) {
      onExtracted(extractedValue);
      handleClose();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-night/5 shrink-0">
          <h3 className="font-heading font-bold text-night text-sm">Capture {fieldLabel}</h3>
          <button onClick={handleClose} className="p-2 rounded-lg text-muted hover:text-night hover:bg-sand transition-all" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Camera input */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCapture}
            className="hidden"
          />

          {!preview && !processing && (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted">Take a photo of the label to read the {fieldLabel.toLowerCase()} automatically.</p>
              <button
                onClick={() => fileRef.current?.click()}
                className="mx-auto flex items-center gap-2 px-5 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl shadow-sm transition-all text-sm"
              >
                <Camera className="w-4 h-4" />
                Open Camera
              </button>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="rounded-xl overflow-hidden border border-night/10">
              <img src={preview} alt="Captured label" className="w-full h-auto max-h-48 object-contain bg-sand" />
            </div>
          )}

          {/* Processing */}
          {processing && (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted">
              <Loader2 className="w-4 h-4 animate-spin" />
              Reading label...
            </div>
          )}

          {/* Extracted value confirmation */}
          {extractedValue && !processing && (
            <div className="space-y-3">
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-center">
                <p className="text-xs text-muted mb-1">Extracted {fieldLabel.toLowerCase()}</p>
                <p className="text-base font-mono font-bold text-night">{extractedValue}</p>
              </div>
              <p className="text-xs text-muted text-center">Does this look right?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { reset(); fileRef.current?.click(); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-night/10 text-sm font-medium text-muted hover:text-night hover:bg-sand transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Retake
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl shadow-sm transition-all text-sm"
                >
                  <Check className="w-3.5 h-3.5" /> Confirm
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && !processing && (
            <div className="space-y-3">
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200/50 rounded-xl px-3 py-2 text-center">
                {error}
              </p>
              <button
                onClick={() => { reset(); fileRef.current?.click(); }}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-night/10 text-sm font-medium text-muted hover:text-night hover:bg-sand transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
