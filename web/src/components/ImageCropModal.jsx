import { useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, Move, RefreshCw, X, Check } from "lucide-react";

export default function ImageCropModal({
  isOpen,
  imageSrc,
  onClose,
  onConfirm,
  circular = true,
  title = "Fotoğrafı Düzenle"
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);

  // Reset state when new image is loaded
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - offset.x,
      y: e.clientY - offset.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    setOffset({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.touches[0].clientX - offset.x,
      y: e.touches[0].clientY - offset.y
    };
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const newX = e.touches[0].clientX - dragStart.current.x;
    const newY = e.touches[0].clientY - dragStart.current.y;
    setOffset({ x: newX, y: newY });
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    const cropSize = 512;
    canvas.width = cropSize;
    canvas.height = cropSize;

    // Clear canvas
    ctx.clearRect(0, 0, cropSize, cropSize);

    // If circular crop, we can clip (optional since we upload square, but nice to crop properly)
    if (circular) {
      ctx.beginPath();
      ctx.arc(cropSize / 2, cropSize / 2, cropSize / 2, 0, Math.PI * 2);
      ctx.clip();
    }

    // Calculate drawing parameters
    // Find scale relative to the container view to map to actual image pixels
    const viewSize = 300; // 300px is the preview crop box size
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;

    // Fit image inside viewSize
    const minRatio = viewSize / Math.min(imgW, imgH);
    const baseW = imgW * minRatio;
    const baseH = imgH * minRatio;

    // Output dimensions on canvas
    const drawW = baseW * scale * (cropSize / viewSize);
    const drawH = baseH * scale * (cropSize / viewSize);

    // Offsets scaled to canvas
    const drawX = (cropSize - drawW) / 2 + offset.x * (cropSize / viewSize);
    const drawY = (cropSize - drawH) / 2 + offset.y * (cropSize / viewSize);

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    canvas.toBlob((blob) => {
      onConfirm(blob);
    }, "image/png");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 transform transition-all animate-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition cursor-pointer p-1 rounded-lg hover:bg-gray-150">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Crop Area */}
        <div className="p-6 flex flex-col items-center justify-center">
          <div 
            ref={containerRef}
            className="relative w-[300px] h-[300px] bg-slate-900 border border-slate-700 overflow-hidden shadow-inner flex items-center justify-center cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            {/* Cropping guide */}
            <div className={`absolute pointer-events-none inset-0 border-2 border-dashed border-white/60 z-10 ${circular ? "rounded-full" : ""}`} />
            {/* Dark overlays outside circle */}
            <div className="absolute pointer-events-none inset-0 bg-black/40 z-0" />

            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop preview"
              className="max-w-none origin-center pointer-events-none select-none"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                width: "100%",
                height: "100%",
                objectFit: "contain"
              }}
            />
          </div>

          <p className="text-xs text-gray-400 font-medium mt-3 flex items-center gap-1.5">
            <Move className="h-3.5 w-3.5" /> Resmi kaydırmak için sürükleyin
          </p>

          {/* Controls */}
          <div className="w-full mt-6 space-y-4">
            {/* Zoom Slider */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScale(prev => Math.max(1, parseFloat((prev - 0.2).toFixed(2))))}
                className="text-gray-400 hover:text-indigo-650 transition cursor-pointer p-1.5 hover:bg-gray-100 rounded-lg"
                title="Uzaklaştır"
              >
                <ZoomOut className="h-4.5 w-4.5 shrink-0" />
              </button>
              <input
                type="range"
                min="1"
                max="4"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <button
                type="button"
                onClick={() => setScale(prev => Math.min(4, parseFloat((prev + 0.2).toFixed(2))))}
                className="text-gray-400 hover:text-indigo-650 transition cursor-pointer p-1.5 hover:bg-gray-100 rounded-lg"
                title="Yakınlaştır"
              >
                <ZoomIn className="h-4.5 w-4.5 shrink-0" />
              </button>
            </div>

            {/* Scale Value & Reset */}
            <div className="flex justify-between items-center text-xs font-semibold text-gray-500 px-1">
              <span>Yakınlaştırma: {Math.round(scale * 100)}%</span>
              <button 
                onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}
                className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 transition cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" /> Sıfırla
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-bold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl transition cursor-pointer"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-slate-900/10 cursor-pointer"
          >
            <Check className="h-4 w-4" /> Fotoğrafı Uygula
          </button>
        </div>
      </div>

      {/* Hidden canvas for cropping */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
