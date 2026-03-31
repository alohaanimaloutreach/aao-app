import { useEffect, useRef, useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onScanned: (value: string) => void;
}

export default function BarcodeScannerModal({ open, onClose, onScanned }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [scannedValue, setScannedValue] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setScannedValue(null);
    startCamera();
    return () => stopCamera();
  }, [open]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        startDetection();
      }
    } catch {
      setError('Camera access required — check browser permissions');
    }
  }

  function stopCamera() {
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startDetection() {
    if (!('BarcodeDetector' in window)) {
      setError('Barcode scanning not supported in this browser — use photo capture instead');
      return;
    }

    const detector = new (window as any).BarcodeDetector({
      formats: ['code_128', 'code_39', 'qr_code', 'ean_13', 'data_matrix'],
    });

    async function detect() {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animRef.current = requestAnimationFrame(detect);
        return;
      }
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          const value = barcodes[0].rawValue;
          setScannedValue(value);
          stopCamera();
          return;
        }
      } catch {
        // detection frame error, continue
      }
      animRef.current = requestAnimationFrame(detect);
    }
    detect();
  }

  function handleConfirm() {
    if (scannedValue) {
      onScanned(scannedValue);
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 z-10">
        <h3 className="text-white font-semibold text-sm">Scan Barcode</h3>
        <button onClick={() => { stopCamera(); onClose(); }} className="p-2 rounded-lg text-white/70 hover:text-white transition-colors" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Camera viewfinder */}
      <div className="flex-1 relative overflow-hidden">
        {!scannedValue && !error && (
          <>
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
            />
            {/* Targeting rectangle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-72 h-32 border-2 border-white/70 rounded-xl relative">
                <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-3 border-l-3 border-white rounded-tl-lg" />
                <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-3 border-r-3 border-white rounded-tr-lg" />
                <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-3 border-l-3 border-white rounded-bl-lg" />
                <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-3 border-r-3 border-white rounded-br-lg" />
              </div>
            </div>
            <div className="absolute bottom-8 left-0 right-0 text-center">
              <p className="text-white/80 text-sm bg-black/40 inline-block px-3 py-1.5 rounded-full">
                Point at barcode
              </p>
            </div>
          </>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black p-8">
            <div className="text-center">
              <p className="text-white/80 text-sm mb-4">{error}</p>
              <button
                onClick={() => { stopCamera(); onClose(); }}
                className="px-4 py-2 bg-white/10 text-white rounded-xl text-sm hover:bg-white/20 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Success state */}
        {scannedValue && (
          <div className="absolute inset-0 flex items-center justify-center bg-black p-8">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide mb-1">Scanned</p>
                <p className="text-white font-mono text-lg">{scannedValue}</p>
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => { setScannedValue(null); startCamera(); }}
                  className="px-4 py-2.5 bg-white/10 text-white rounded-xl text-sm hover:bg-white/20 transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Use This
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
