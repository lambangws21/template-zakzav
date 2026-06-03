"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Info,
  Check,
  X,
  Eye,
  Sliders,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  ChevronDown,
  Download,
  Activity,
  Plus,
  Minus,
  RotateCw,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

const IMPLANT_DATABASE = {
  cup: [
    { id: 'trilogy', label: 'Trilogy Cup (48-58)', name: 'Trilogy Acetabular Cup', brand: 'Zimmer Biomet', sizes: [48, 50, 52, 54, 56, 58], defaultSize: 52, material: 'Titanium Porous Fiber Metal', spec: 'Hemispherical shell with multiple screw options.' },
    { id: 'pinnacle', label: 'Pinnacle Cup (46-60)', name: 'Pinnacle Acetabular Sector', brand: 'DePuy Synthes', sizes: [46, 48, 50, 52, 54, 56, 58, 60], defaultSize: 54, material: 'Gription Coated Titanium', spec: 'Modular acetabular platform with high-stability liners.' }
  ],
  stem: [
    { id: 'corail', label: 'Corail Stem (8-14)', name: 'Corail Femoral Stem', brand: 'DePuy Synthes', sizes: [8, 9, 10, 11, 12, 13, 14], defaultSize: 11, material: 'HA Coated Titanium Alloy', spec: 'Collarless compaction stem with fully hydroxyapatite coating.' },
    { id: 'summit', label: 'Summit Stem (5-12)', name: 'Summit Tapered hip', brand: 'DePuy Synthes', sizes: [5, 6, 7, 8, 9, 10, 11, 12], defaultSize: 8, material: 'Porous Coated Titanium', spec: 'Direct taper femoral prosthesis for standard bone geometries.' }
  ],
  knee: [
    { id: 'vanguard', label: 'Vanguard Knee CR', name: 'Vanguard Femoral Component', brand: 'Zimmer Biomet', sizes: [55, 60, 65, 70, 75], defaultSize: 65, material: 'Cobalt-Chromium-Molybdenum', spec: 'Cruciate-retaining surface design with optimized contact stress.' },
    { id: 'persona', label: 'Persona Tibial Tray', name: 'Persona Anatomical Plate', brand: 'Zimmer Biomet', sizes: [3, 4, 5, 6, 7, 8], defaultSize: 5, material: 'Ti-6Al-4V Alloy', spec: 'Anatomic shape matching with modular porous stem/peg accessories.' }
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState('cup'); // 'stem' | 'cup' | 'knee'
  const [selectedImplantId, setSelectedImplantId] = useState('trilogy');
  const [selectedSize, setSelectedSize] = useState(52);
  const [implantApplied, setImplantApplied] = useState(false);
  
  // Custom interactive toast
  const [toastMsg, setToastMsg] = useState('Pilih kategori implan dan tekan "Preview" atau "Pakai" untuk menaruh di kanvas.');
  const [toastType, setToastType] = useState('info'); // 'info' | 'success'

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewSize, setPreviewSize] = useState(52);

  // Canvas Transform states
  const [transform, setTransform] = useState({
    x: 180,
    y: 160,
    rotate: 0,
    scale: 1.0
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  // Sync state selected implant on tab change
  const currentImplantsList = useMemo(() => IMPLANT_DATABASE[activeTab], [activeTab]);
  
  useEffect(() => {
    const defaultImp = currentImplantsList[0];
    setSelectedImplantId(defaultImp.id);
    setSelectedSize(defaultImp.defaultSize);
    setPreviewSize(defaultImp.defaultSize);
    setImplantApplied(false);
  }, [activeTab, currentImplantsList]);

  const activeImplantData = useMemo(() => {
    return currentImplantsList.find(i => i.id === selectedImplantId) || currentImplantsList[0];
  }, [currentImplantsList, selectedImplantId]);

  const drawRadiograph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // X-ray slate backdrop
    ctx.save();
    let gradient = ctx.createRadialGradient(w/2, h/2, 10, w/2, h/2, Math.max(w, h)*0.8);
    gradient.addColorStop(0, '#161920');
    gradient.addColorStop(1, '#08090c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Anatomical bone mockup silhouettes (Pelvis / Femur)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.03)';
    ctx.shadowBlur = 30;

    if (activeTab === 'cup' || activeTab === 'stem') {
      // Pelvic joint cavity drawing
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.4, 65, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.4);
      ctx.lineTo(w * 0.5 + 40, h * 0.9);
      ctx.lineTo(w * 0.5 - 20, h * 0.9);
      ctx.closePath();
      ctx.fill();
    } else {
      // Knee bone femur distal drawing
      ctx.beginPath();
      ctx.roundRect(w * 0.35, 10, w * 0.3, h * 0.45, [10, 10, 25, 25]);
      ctx.fill();
      // Tibial bone proximal mockup
      ctx.beginPath();
      ctx.roundRect(w * 0.38, h * 0.55, w * 0.24, h * 0.4, [20, 20, 10, 10]);
      ctx.fill();
    }
    ctx.restore();

    // Render applied Neumorphic template overlay
    if (implantApplied) {
      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.rotate((transform.rotate * Math.PI) / 180);
      ctx.scale(transform.scale, transform.scale);

      ctx.shadowColor = 'rgba(16, 185, 129, 0.3)';
      ctx.shadowBlur = 15;

      const physicalScale = selectedSize * 0.8; // Map size value directly to canvas pixel dimensions

      if (activeTab === 'cup') {
        // Hemispherical Acetabular Cup Shape
        ctx.beginPath();
        ctx.arc(0, 0, physicalScale, Math.PI, 0, false);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 4.5;
        ctx.stroke();

        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.fill();

        // Inner liner groove
        ctx.beginPath();
        ctx.arc(0, 0, physicalScale - 8, Math.PI, 0, false);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (activeTab === 'stem') {
        // Compaction Hip stem layout
        ctx.beginPath();
        ctx.moveTo(0, -physicalScale * 0.3);
        ctx.lineTo(physicalScale * 0.5, -physicalScale * 0.2);
        ctx.bezierCurveTo(physicalScale * 0.2, physicalScale * 0.5, -physicalScale * 0.1, physicalScale * 1.1, -physicalScale * 0.2, physicalScale * 1.5);
        ctx.lineTo(-physicalScale * 0.4, physicalScale * 1.5);
        ctx.bezierCurveTo(-physicalScale * 0.3, physicalScale * 0.8, -physicalScale * 0.2, physicalScale * 0.2, 0, -physicalScale * 0.3);
        ctx.closePath();

        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.fill();
      } else if (activeTab === 'knee') {
        // CR Knee component shape
        ctx.beginPath();
        ctx.roundRect(-physicalScale * 0.7, -15, physicalScale * 1.4, 30, 8);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3.5;
        ctx.stroke();
        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.fill();

        // Central stabilization keel anchor
        ctx.beginPath();
        ctx.rect(-5, 15, 10, 20);
        ctx.fillStyle = '#10b981';
        ctx.fill();
      }

      // Drag core handle node indicator
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.restore();
    }
  }, [activeTab, implantApplied, transform, selectedSize]);

  // Handle Resize canvas to keep sharpness
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
      drawRadiograph();
    }
  }, [drawRadiograph]);

  useEffect(() => {
    drawRadiograph();
  }, [drawRadiograph]);

  const handlePointerDown = (e) => {
    if (!implantApplied) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check click proximity to implant position coordinates
    const distance = Math.sqrt((mx - transform.x) ** 2 + (my - transform.y) ** 2);
    if (distance < 50) {
      setIsDragging(true);
      dragStart.current = { x: mx - transform.x, y: my - transform.y };
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    setTransform((prev) => ({
      ...prev,
      x: mx - dragStart.current.x,
      y: my - dragStart.current.y
    }));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const applyImplantToCanvas = () => {
    setImplantApplied(true);
    setToastType('success');
    setToastMsg(`SUKSES: Template ${activeImplantData.name} (Size ${selectedSize}) berhasil dipasang pada koordinat target.`);
  };

  const applyFromModal = (size) => {
    setSelectedSize(size);
    setImplantApplied(true);
    setIsModalOpen(false);
    setToastType('success');
    setToastMsg(`SUKSES: Template ${activeImplantData.name} (Size ${size}) dikonfirmasi dan dipasang dari modal pratinjau.`);
  };

  const openModalPreview = () => {
    setPreviewSize(selectedSize);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-8 bg-[#eef2f7]">
      
      {/* Neumorphic subtle shadows and tokens styled block */}
      <style dangerouslySetInnerHTML={{ __html: `
        .neu-flat {
          background: #eef2f7;
          box-shadow: 3px 3px 7px #cbd5e1, -3px -3px 7px #ffffff;
        }
        .neu-pressed {
          background: #eef2f7;
          box-shadow: inset 3px 3px 6px #cbd5e1, inset -3px -3px 6px #ffffff;
        }
        .neu-card {
          background: #eef2f7;
          box-shadow: 8px 8px 18px #cbd5e1, -8px -8px 18px #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.8);
        }
        .neu-button {
          background: #eef2f7;
          box-shadow: 3px 3px 7px #cbd5e1, -3px -3px 7px #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.6);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .neu-button:hover {
          box-shadow: 1.5px 1.5px 4px #cbd5e1, -1.5px -1.5px 4px #ffffff;
          transform: translateY(0.5px);
        }
        .neu-button:active, .neu-button-active {
          box-shadow: inset 2px 2px 4px #cbd5e1, inset -2px -2px 4px #ffffff;
          transform: translateY(1.5px);
        }
        .neu-input {
          background: #edf1f6;
          box-shadow: inset 2.5px 2.5px 5px #c4cfdc, inset -2.5px -2.5px 5px #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.9);
        }
        .active-blue {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          box-shadow: inset 2px 2px 5px rgba(0,0,0,0.25), 3px 3px 8px rgba(59, 130, 246, 0.3);
          border-color: #2563eb;
        }
      `}} />

      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 items-start justify-center">
        
        {/* LEFT MODULE: REDESIGNED NEUMORPHIC IMPLANT PANEL */}
        <div className="w-full lg:w-[460px] shrink-0 p-6 rounded-[32px] neu-card space-y-6">
          
          {/* Header Area */}
          <div className="flex justify-between items-center pb-2 border-b border-slate-300/20">
            <h1 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Implant</h1>
            
            {/* Redesigned Neumorphic Info Icon */}
            <button 
              onClick={openModalPreview}
              className="w-8 h-8 rounded-full bg-[#eef2f7] shadow-[2.5px_2.5px_6px_#cbd5e1,-2.5px_-2.5px_6px_#ffffff] border border-white flex items-center justify-center text-slate-500 hover:text-blue-600 transition-colors"
              title="Pratinjau Informasi Cetakan"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Selection Row (STEM, CUP, KNEE) */}
          <div className="p-1.5 bg-[#eef2f7] shadow-[inset_2.5px_2.5px_5px_#cbd5e1,inset_-2.5px_-2.5px_5px_#ffffff] rounded-2xl flex items-center justify-between border border-white/60">
            {['stem', 'cup', 'knee'].map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                    isActive
                      ? 'text-slate-800 bg-white shadow-[2px_2px_5px_#cbd5e1] border border-white'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Trilogy Dropdown Selector Field (Sleek Inset Shadows) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Pilih Model Implan</span>
            <div className="relative">
              <select
                value={selectedImplantId}
                onChange={(e) => {
                  setSelectedImplantId(e.target.value);
                  setImplantApplied(false);
                }}
                className="w-full pl-4 pr-10 py-3.5 rounded-2xl text-xs font-bold text-slate-800 bg-[#edf1f6] shadow-[inset_2.5px_2.5px_5px_#c4cfdc,inset_-2.5px_-2.5px_5px_#ffffff] border border-white focus:outline-none appearance-none cursor-pointer"
              >
                {currentImplantsList.map((imp) => (
                  <option key={imp.id} value={imp.id}>
                    {imp.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-4.5 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Size Multi Selector Dropdown */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Pilih Ukuran Target</span>
            <div className="relative">
              <select
                value={selectedSize}
                onChange={(e) => {
                  setSelectedSize(parseInt(e.target.value));
                  setImplantApplied(false);
                }}
                className="w-full pl-4 pr-10 py-3.5 rounded-2xl text-xs font-bold text-slate-800 bg-[#edf1f6] shadow-[inset_2.5px_2.5px_5px_#c4cfdc,inset_-2.5px_-2.5px_5px_#ffffff] border border-white focus:outline-none appearance-none cursor-pointer"
              >
                {activeImplantData.sizes.map((sz) => (
                  <option key={sz} value={sz}>
                    Size {sz} mm
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-4.5 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Dual Action Bottom Bar (Pakai & Preview Template) */}
          <div className="grid grid-cols-2 gap-3.5 pt-2">
            
            {/* Mint Green Neumorphic Master Apply Button */}
            <button
              onClick={applyImplantToCanvas}
              className="py-3.5 rounded-2xl text-xs font-black text-emerald-800 bg-emerald-100 border border-emerald-300 hover:bg-emerald-200 shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff] active:scale-[0.98] active:shadow-inner transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5px]" />
              Pakai
            </button>

            {/* Preview Template Action Button */}
            <button
              onClick={openModalPreview}
              className="py-3.5 rounded-2xl text-xs font-black text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
            >
              <Eye className="w-4 h-4 text-blue-600" />
              Preview Template
            </button>
          </div>

          {/* Feedback Toast banner well */}
          <div className="p-3.5 rounded-2xl bg-[#edf1f6] shadow-[inset_2px_2px_5px_#cbd5e1,inset_-2px_-2px_5px_#ffffff] border border-white/60 flex items-start gap-2.5">
            <Info className={`w-4.5 h-4.5 shrink-0 mt-0.5 ${toastType === 'success' ? 'text-emerald-500' : 'text-blue-500'}`} />
            <span className="text-[11px] font-bold text-slate-600 leading-relaxed">
              {toastMsg}
            </span>
          </div>

        </div>

        {/* RIGHT MODULE: INTERACTIVE DIAGNOSTIC VIEWPORT */}
        <div className="flex-1 w-full space-y-6">
          
          <div className="p-4 rounded-[32px] neu-card bg-[#0d0f14] border border-slate-800 text-white space-y-3">
            <div className="flex justify-between items-center px-2">
              <span className="text-xs font-extrabold text-slate-400 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                PACS Diagnostic Workspace View
              </span>
              <span className="text-[10px] font-mono text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700/50">
                PROJECTION MAP
              </span>
            </div>


            {/* Manual Transformation slider adjustments */}
            {implantApplied && (
              <div className="p-3 bg-slate-900/60 rounded-xl space-y-3 border border-slate-800/40">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span className="font-bold flex items-center gap-1"><RotateCw className="w-3.5 h-3.5" /> Rotasi Template</span>
                  <span className="font-mono text-white font-bold">{transform.rotate}°</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setTransform(t => ({ ...t, rotate: Math.max(-180, t.rotate - 5) }))} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 text-white font-bold">-5°</button>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={transform.rotate}
                    onChange={(e) => setTransform(t => ({ ...t, rotate: parseInt(e.target.value) }))}
                    className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <button onClick={() => setTransform(t => ({ ...t, rotate: Math.min(180, t.rotate + 5) }))} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 text-white font-bold">+5°</button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] text-slate-500 leading-relaxed">
                Tarik gagang tengah implan berwarna hijau di atas kanvas untuk menempatkannya pada sasaran anatomi secara presisi.
              </span>
              <button 
                onClick={() => setTransform({ x: 180, y: 160, rotate: 0, scale: 1.0 })}
                className="text-xs text-blue-400 hover:text-blue-300 font-bold shrink-0 flex items-center gap-1"
                title="Reset Posisi Implan"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset Posisi
              </button>
            </div>
          </div>

        </div>

      </div>

      {}
      {/* HIGH FIDELITY NEUMORPHIC MODAL PREVIEW OVERLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-[32px] bg-[#eef2f7] border border-white/80 p-6 shadow-[10px_10px_30px_rgba(71,85,105,0.25)] space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Exit Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#eef2f7] shadow-[2px_2px_5px_#cbd5e1,-2px_-2px_5px_#ffffff] border border-white flex items-center justify-center text-slate-400 hover:text-slate-800 transition-colors"
              title="Tutup Preview"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="space-y-1 pr-10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                  <FolderOpen className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">Implant Blueprint Preview</h2>
              </div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{activeImplantData.brand} // Surgical Division</p>
            </div>

            {/* Modal Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              
              {/* Left Column: SVG Technical Blueprint Drawing */}
              <div className="aspect-square rounded-2xl bg-slate-950 border border-slate-800 relative flex items-center justify-center overflow-hidden shadow-inner p-4">
                <div className="absolute top-3 left-3 font-mono text-[8px] text-slate-500/80">TECHNICAL_SCHEMATIC</div>
                
                {/* Dynamic SVG Drawing based on Active Implant Tab */}
                <svg className="w-40 h-40 text-blue-500" viewBox="0 0 100 100" fill="none" stroke="currentColor">
                  {activeTab === 'cup' && (
                    <g>
                      {/* Acetabular cup hemispherical boundary */}
                      <path d="M15 50 A 35 35 0 0 1 85 50" strokeWidth="2" strokeDasharray="3,3" />
                      <path d="M10 50 A 40 40 0 0 1 90 50" strokeWidth="3" />
                      <path d="M10 50 L 90 50" strokeWidth="1" strokeColor="rgba(255,255,255,0.2)" />
                      {/* Dimension markings indicators */}
                      <path d="M10 58 L 10 70 M 90 58 L 90 70" strokeWidth="1" stroke="rgba(255, 255, 255, 0.4)" />
                      <path d="M10 65 L 90 65" strokeWidth="1.2" markerEnd="url(#arrow)" />
                      {/* Core screw hole mockup */}
                      <circle cx="50" cy="30" r="4" strokeWidth="1.5" />
                      <circle cx="35" cy="35" r="3" strokeWidth="1.5" />
                      <circle cx="65" cy="35" r="3" strokeWidth="1.5" />
                      
                      {/* Text showing responsive parameter scales */}
                      <text x="50" y="76" fill="#60a5fa" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                        OUTER DIA: {previewSize} mm
                      </text>
                    </g>
                  )}

                  {activeTab === 'stem' && (
                    <g>
                      {/* Hip Stem prosthesis profile */}
                      <path d="M35 15 L 65 15 C 65 15 55 45 60 55 C 55 65 52 80 52 95 L 48 95 C 48 80 43 65 38 55 C 43 45 35 15 35 15 Z" strokeWidth="2.5" />
                      {/* Neck center marking */}
                      <line x1="30" y1="20" x2="70" y2="20" strokeWidth="1" strokeDasharray="2,2" />
                      <text x="50" y="85" fill="#60a5fa" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                        LENGTH: {previewSize * 1.5} mm
                      </text>
                    </g>
                  )}

                  {activeTab === 'knee' && (
                    <g>
                      {/* Condyle Knee component curvature */}
                      <path d="M15 40 Q 30 55 50 55 Q 70 55 85 40" strokeWidth="3" />
                      <path d="M15 30 L 15 40 M 85 30 L 85 40" strokeWidth="2" />
                      <rect x="45" y="55" width="10" height="25" strokeWidth="2" />
                      <text x="50" y="92" fill="#60a5fa" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                        AP VIEW WIDTH: {previewSize} mm
                      </text>
                    </g>
                  )}
                </svg>

                {/* Grid guidelines overlay */}
                <div className="absolute inset-0 border border-slate-800/40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
              </div>

              {/* Right Column: Specifications Detail Card */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800">{activeImplantData.name}</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase mt-0.5">By {activeImplantData.brand}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#edf1f6] border border-white/60 space-y-1.5 text-xs text-slate-600 font-medium leading-relaxed">
                  <p><strong>Bahan:</strong> {activeImplantData.material}</p>
                  <p><strong>Spesifikasi:</strong> {activeImplantData.spec}</p>
                </div>

                {/* In-modal interactive size range selector */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>Ubah Dimensi Ukuran</span>
                    <span className="font-mono text-blue-600">{previewSize} mm</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        const idx = activeImplantData.sizes.indexOf(previewSize);
                        if (idx > 0) setPreviewSize(activeImplantData.sizes[idx - 1]);
                      }}
                      className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center font-black border"
                    >
                      <Minus className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                    <input
                      type="range"
                      min={activeImplantData.sizes[0]}
                      max={activeImplantData.sizes[activeImplantData.sizes.length - 1]}
                      step="2"
                      value={previewSize}
                      onChange={(e) => setPreviewSize(parseInt(e.target.value))}
                      className="flex-1 h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer"
                    />
                    <button 
                      onClick={() => {
                        const idx = activeImplantData.sizes.indexOf(previewSize);
                        if (idx < activeImplantData.sizes.length - 1) setPreviewSize(activeImplantData.sizes[idx + 1]);
                      }}
                      className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center font-black border"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                  </div>
                </div>

                {/* Direct Confirm Button inside modal */}
                <button
                  onClick={() => applyFromModal(previewSize)}
                  className="w-full py-3.5 rounded-2xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10"
                >
                  <Check className="w-4 h-4 stroke-[2.5px]" />
                  Gunakan Template Ukuran Ini
                </button>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}