import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

const SCANNER_ELEMENT_ID = 'beme-barcode-scanner';

export function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const detectedRef = useRef(false);

  useEffect(() => {
    let scanner: Html5Qrcode | null = null;

    const start = async () => {
      try {
        scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 260, height: 140 },
            aspectRatio: 1.7,
          },
          (decodedText) => {
            if (detectedRef.current) return;
            detectedRef.current = true;
            void scanner?.stop().catch(() => {});
            onDetected(decodedText);
          },
          () => { /* ignore QR decode errors — they fire on every frame */ }
        );
        setStarting(false);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.toLowerCase().includes('permission')) {
          setError('Camera permission denied. Please allow camera access and try again.');
        } else {
          setError('Could not start camera. Make sure no other app is using it.');
        }
        setStarting(false);
      }
    };

    void start();

    return () => {
      detectedRef.current = true; // prevent callback after unmount
      scanner?.stop().catch(() => {});
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <p className="text-sm font-semibold">Scan Barcode</p>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={onClose}
          aria-label="Close scanner"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Viewfinder */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {starting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white z-10">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">Starting camera…</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-white z-10">
            <p className="text-center text-sm">{error}</p>
            <Button variant="outline" onClick={onClose} className="border-white text-white hover:bg-white/20">
              Close
            </Button>
          </div>
        )}

        {/* html5-qrcode mounts its video here */}
        <div id={SCANNER_ELEMENT_ID} className="w-full h-full" />

        {/* Overlay frame hint */}
        {!error && !starting && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-36 border-2 border-white rounded-lg opacity-70" />
          </div>
        )}
      </div>

      <p className="py-4 text-center text-xs text-white/60">
        Point your camera at the barcode on the packaging
      </p>
    </div>
  );
}
