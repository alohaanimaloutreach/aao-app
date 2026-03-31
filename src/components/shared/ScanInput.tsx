import { useState, useRef } from 'react';
import { ScanBarcode, Camera, Paperclip, Check, X } from 'lucide-react';
import BarcodeScannerModal from './BarcodeScannerModal';
import OcrCaptureModal from './OcrCaptureModal';
import { supabase } from '../../lib/supabase';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
  /** Show barcode scan button */
  barcode?: boolean;
  /** Show OCR camera button */
  ocr?: boolean;
  /** Show photo attach button */
  attach?: boolean;
  /** Label for OCR prompt context */
  fieldLabel?: string;
  /** Animal ID for saving attachments */
  animalId?: string;
  /** Input class override */
  inputClassName?: string;
  /** Label class override */
  labelClassName?: string;
}

export default function ScanInput({
  value,
  onChange,
  placeholder,
  label,
  barcode,
  ocr,
  attach,
  fieldLabel,
  animalId,
  inputClassName,
  labelClassName,
}: Props) {
  const [showScanner, setShowScanner] = useState(false);
  const [showOcr, setShowOcr] = useState(false);
  const [attachedPhoto, setAttachedPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const attachRef = useRef<HTMLInputElement>(null);

  const hasBarcodeApi = typeof window !== 'undefined' && 'BarcodeDetector' in window;
  // If barcode requested but not supported, fall back to OCR
  const showBarcodeBtn = barcode && hasBarcodeApi;
  const showOcrBtn = ocr || (barcode && !hasBarcodeApi);

  async function handleAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !animalId) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `label-scans/${animalId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('animal-photos').upload(path, file, { contentType: file.type });
      if (!error) {
        const reader = new FileReader();
        reader.onload = (ev) => setAttachedPhoto(ev.target?.result as string);
        reader.readAsDataURL(file);
      }
    } finally {
      setUploading(false);
      if (attachRef.current) attachRef.current.value = '';
    }
  }

  const hasButtons = showBarcodeBtn || showOcrBtn || attach;

  return (
    <div>
      {label && (
        <label className={labelClassName ?? 'block text-xs text-muted font-medium mb-0.5'}>{label}</label>
      )}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClassName ?? 'flex-1 min-w-0 px-3 py-2 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40'}
        />

        {showBarcodeBtn && (
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="shrink-0 p-2 rounded-lg bg-sand hover:bg-night/8 text-muted hover:text-night transition-colors"
            aria-label="Scan barcode"
            title="Scan barcode"
          >
            <ScanBarcode className="w-4 h-4" />
          </button>
        )}

        {showOcrBtn && (
          <button
            type="button"
            onClick={() => setShowOcr(true)}
            className="shrink-0 p-2 rounded-lg bg-sand hover:bg-night/8 text-muted hover:text-night transition-colors"
            aria-label="Photo capture"
            title="Read from photo"
          >
            <Camera className="w-4 h-4" />
          </button>
        )}

        {attach && (
          <>
            <button
              type="button"
              onClick={() => attachRef.current?.click()}
              disabled={uploading}
              className="shrink-0 p-2 rounded-lg bg-sand hover:bg-night/8 text-muted hover:text-night transition-colors disabled:opacity-40"
              aria-label="Attach photo"
              title="Attach photo"
            >
              {attachedPhoto ? (
                <Check className="w-4 h-4 text-primary" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </button>
            <input
              ref={attachRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleAttach}
              className="hidden"
            />
          </>
        )}
      </div>

      {/* Attached photo thumbnail */}
      {attachedPhoto && (
        <div className="mt-1.5 flex items-center gap-2">
          <img src={attachedPhoto} alt="Attached" className="w-8 h-8 rounded object-cover border border-night/10" />
          <span className="text-xs text-muted">Photo attached</span>
          <button
            type="button"
            onClick={() => setAttachedPhoto(null)}
            className="p-0.5 rounded text-muted hover:text-night"
            aria-label="Remove photo"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Modals */}
      <BarcodeScannerModal
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScanned={onChange}
      />
      <OcrCaptureModal
        open={showOcr}
        onClose={() => setShowOcr(false)}
        onExtracted={onChange}
        fieldLabel={fieldLabel ?? label ?? 'number'}
        animalId={animalId}
      />
    </div>
  );
}
