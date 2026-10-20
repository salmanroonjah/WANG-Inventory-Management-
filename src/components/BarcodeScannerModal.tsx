import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, Upload, Keyboard, CheckCircle, AlertCircle, Zap } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedAssetId: string) => void;
  title?: string;
  subtitle?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Asset Barcode',
  subtitle = 'Point your phone or webcam at the physical WANG barcode label'
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [lastScannedResult, setLastScannedResult] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'wang-html5-qrcode-reader';

  // Sample quick test barcodes
  const sampleBarcodes = [
    'WANG-ELE-001',
    'WANG-ELE-002',
    'WANG-ELE-003',
    'WANG-IT-001',
    'WANG-IT-002',
    'WANG-FUR-001',
    'WANG-COM-001'
  ];

  // Stop scanner safely
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Error clearing scanner', err);
      }
      scannerRef.current = null;
      setIsScanning(false);
    }
  };

  const handleSuccessfulScan = (decodedText: string) => {
    // Clean and normalize ID
    let cleaned = decodedText.trim();
    // In case the barcode is an encoded URL e.g. https://wang.org/asset/WANG-ELE-001
    if (cleaned.includes('/')) {
      const parts = cleaned.split('/');
      cleaned = parts[parts.length - 1];
    }
    cleaned = cleaned.toUpperCase();

    setLastScannedResult(cleaned);
    // Play light tone if supported
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 880; // A5 tone
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Audio not permitted or available
    }

    // Stop and fire callback
    setTimeout(() => {
      stopScanner();
      onScan(cleaned);
      onClose();
    }, 400);
  };

  // Start Camera
  const startCamera = async (cameraId?: string) => {
    setCameraError(null);
    try {
      await stopScanner();

      const html5QrCode = new Html5Qrcode(readerElementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13
        ],
        verbose: false
      });
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 160 },
        aspectRatio: 1.3333
      };

      const targetCamera = cameraId || { facingMode: 'environment' };

      await html5QrCode.start(
        targetCamera,
        config,
        (decodedText) => {
          handleSuccessfulScan(decodedText);
        },
        (_errorMessage) => {
          // ignore transient frame decode failures
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera startup error:', err);
      setCameraError(
        err?.message?.includes('Permission')
          ? 'Camera permission was denied. Please allow camera access in your browser settings or use manual lookup below.'
          : 'Unable to access device camera. Please verify camera hardware or switch to manual Asset ID entry.'
      );
      setIsScanning(false);
    }
  };

  // Initialize camera list
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices && devices.length > 0) {
            setCameras(devices.map(d => ({ id: d.id, label: d.label || `Camera ${d.id.substring(0, 5)}` })));
            // Prefer environment / back camera
            const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
            const chosenId = backCam ? backCam.id : devices[0].id;
            setSelectedCameraId(chosenId);
            startCamera(chosenId);
          } else {
            // Try standard environment mode
            startCamera();
          }
        })
        .catch(() => {
          startCamera();
        });
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, activeTab]);

  // Handle file upload scanning
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCameraError(null);
    try {
      const html5QrCode = new Html5Qrcode('wang-file-scan-dummy');
      const result = await html5QrCode.scanFile(file, true);
      handleSuccessfulScan(result);
    } catch (err: any) {
      setCameraError('No readable barcode found in this image. Please ensure good lighting and clear barcode focus.');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleSuccessfulScan(manualInput.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-slate-800" />
              <h3 className="font-semibold text-slate-900 text-base">{title}</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scan Mode Segmented Switch */}
        <div className="p-3 border-b border-slate-200 bg-slate-100 flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('camera');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'camera'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Live Camera
          </button>
          <button
            type="button"
            onClick={() => {
              stopScanner();
              setActiveTab('upload');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Photo
          </button>
          <button
            type="button"
            onClick={() => {
              stopScanner();
              setActiveTab('manual');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'manual'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            Manual Entry
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto">
          {activeTab === 'camera' && (
            <div className="space-y-4">
              {/* Camera device picker if multiple cameras */}
              {cameras.length > 1 && (
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Camera Sensor:</span>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => {
                      setSelectedCameraId(e.target.value);
                      startCamera(e.target.value);
                    }}
                    className="border border-slate-300 rounded px-2 py-1 bg-white text-xs max-w-[220px]"
                  >
                    {cameras.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Viewfinder Area */}
              <div className="relative rounded-lg overflow-hidden bg-slate-950 min-h-[260px] flex items-center justify-center border border-slate-800">
                <div id={readerElementId} className="w-full h-full" />

                {/* Overlaid Guide Frame */}
                {isScanning && !lastScannedResult && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-64 h-32 border-2 border-emerald-400/80 rounded-md shadow-[0_0_15px_rgba(52,211,153,0.3)] relative">
                      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-300" />
                      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-300" />
                      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-300" />
                      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-300" />
                      {/* Aim scan line animation */}
                      <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse absolute top-1/2 -translate-y-1/2" />
                    </div>
                    <span className="text-[11px] text-white/90 bg-slate-900/80 px-2.5 py-1 rounded mt-3 backdrop-blur-xs">
                      Align WANG barcode inside frame
                    </span>
                  </div>
                )}

                {/* Scanned Success Flash */}
                {lastScannedResult && (
                  <div className="absolute inset-0 bg-emerald-600/95 flex flex-col items-center justify-center text-white p-4">
                    <CheckCircle className="w-12 h-12 mb-2 animate-bounce" />
                    <span className="text-lg font-bold font-mono tracking-wider">{lastScannedResult}</span>
                    <span className="text-xs text-emerald-100 mt-1">Barcode verified! Loading asset...</span>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <p className="font-medium">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('manual')}
                      className="mt-1.5 underline font-semibold text-amber-900 block"
                    >
                      Use manual Asset ID search instead
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4 text-center py-6">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 hover:border-slate-400 transition-colors">
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-700">Upload or snap a barcode picture</p>
                <p className="text-xs text-slate-500 mt-1">Supports PNG, JPG, WEBP photos from mobile gallery</p>
                <label className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg cursor-pointer hover:bg-slate-800 transition-colors">
                  <Camera className="w-3.5 h-3.5" />
                  Select Image File
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <div id="wang-file-scan-dummy" className="hidden" />
              {cameraError && (
                <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded border border-rose-200">
                  {cameraError}
                </p>
              )}
            </div>
          )}

          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4 py-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Enter Exact WANG Asset ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                    placeholder="e.g. WANG-ELE-001"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-mono tracking-wide uppercase focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Prefix: WANG-[CAT]-[NUMBER] (e.g., WANG-ELE-002, WANG-IT-001)
                </p>
              </div>

              <button
                type="submit"
                disabled={!manualInput.trim()}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Find Asset Record
              </button>
            </form>
          )}

          {/* Quick Demo Test Buttons */}
          <div className="mt-5 pt-4 border-t border-slate-200">
            <span className="text-[11px] font-medium text-slate-500 block mb-2">
              Quick test barcodes (click to simulate instant scan):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {sampleBarcodes.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSuccessfulScan(id)}
                  className="px-2.5 py-1 text-[11px] font-mono font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-300 transition-colors"
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-5 py-3 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            WANG Mobile Scanner · Code 128 Compliant
          </span>
          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium rounded hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
