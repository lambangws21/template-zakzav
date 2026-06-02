import React, { useState } from 'react';
import {
  Settings,
  X,
  ChevronDown,
  Layers,
  Compass,
  Sliders,
  RotateCw,
  Eye,
  Trash2,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Move,
  Minimize,
  Palette,
  Copy,
  LayoutGrid,
  Check
} from 'lucide-react';

export default function App() {
  // Layer Identity States
  const [selectedLayer, setSelectedLayer] = useState('CuP Acetabulum | 2/2');
  const [layerName, setLayerName] = useState('CuP Acetabulum');
  const [activeColor, setActiveColor] = useState('blue');
  const [isLocked, setIsLocked] = useState(false);

  // Geometric Parameter States (Matches Screenshot Values)
  const [width, setWidth] = useState(134);
  const [height, setHeight] = useState(171);
  const [posX, setPosX] = useState(828);
  const [posY, setPosY] = useState(104);
  const [rotate, setRotate] = useState(-24);

  // Rendering & Contrast Effect States
  const [contrast, setContrast] = useState(100);
  const [level, setLevel] = useState(100);
  const [opacity, setOpacity] = useState(58);

  // Simulation Feedback Logger State
  const [logMessage, setLogMessage] = useState('Panel konfigurasi layer siap digunakan.');

  // Simulated Color Options with hex tags
  const colors = [
    { id: 'blue', class: 'bg-[#3b82f6]', name: 'Biru' },
    { id: 'cyan', class: 'bg-[#06b6d4]', name: 'Sian' },
    { id: 'green', class: 'bg-[#10b981]', name: 'Hijau' },
    { id: 'orange', class: 'bg-[#f59e0b]', name: 'Oranye' },
    { id: 'red', class: 'bg-[#ef4444]', name: 'Merah' },
    { id: 'purple', class: 'bg-[#8b5cf6]', name: 'Ungu' },
    { id: 'black', class: 'bg-[#1e293b]', name: 'Gelap' },
    { id: 'gray', class: 'bg-[#94a3b8]', name: 'Abu-abu' }
  ];

  // Helper action trigger
  const triggerAction = (actionName) => {
    setLogMessage(`Aksi dipicu: [${actionName.toUpperCase()}] berhasil dieksekusi.`);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#eef2f7]">
      
      {}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Micro-neumorphism dengan bayangan luar super tipis & tajam */
        .neu-flat {
          background: #eef2f7;
          box-shadow: 2px 2px 5px rgba(165, 180, 203, 0.45), -2px -2px 5px #ffffff;
        }
        .neu-pressed {
          background: #eef2f7;
          box-shadow: inset 1.5px 1.5px 4px rgba(165, 180, 203, 0.5), inset -1.5px -1.5px 4px #ffffff;
        }
        .neu-card {
          background: #eef2f7;
          box-shadow: 6px 6px 14px rgba(165, 180, 203, 0.4), -6px -6px 14px #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.8);
        }
        .neu-button {
          background: #eef2f7;
          box-shadow: 2px 2px 5px rgba(165, 180, 203, 0.4), -2px -2px 5px #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.6);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .neu-button:hover {
          box-shadow: 1px 1px 3px rgba(165, 180, 203, 0.35), -1px -1px 3px #ffffff;
          transform: translateY(0.2px);
        }
        .neu-button:active, .neu-button-active {
          box-shadow: inset 1.5px 1.5px 3px rgba(165, 180, 203, 0.5), inset -1.5px -1.5px 3px #ffffff;
          transform: translateY(0.5px);
        }
        .neu-input {
          background: #edf1f6;
          box-shadow: inset 2px 2px 4px rgba(196, 207, 220, 0.7), inset -2px -2px 4px #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.9);
        }
        
        /* Custom thin scrollbar for neumorphic inner-scroll content */
        .custom-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: #eef2f7;
          border-radius: 9px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 9px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}} />

      {/* Main Container Wrapper */}
      <div className="w-full max-w-md rounded-[32px] neu-card p-5 space-y-4 relative overflow-hidden">
        
        {}
        {/* Main Sticky Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-300/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#eef2f7] shadow-[2px_2px_5px_rgba(165,180,203,0.45),-2px_-2px_5px_#ffffff] flex items-center justify-center text-slate-700">
              <Sliders className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-800 tracking-tight">Layer Settings</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase">2 Layer Tersedia</p>
            </div>
          </div>
          <button 
            onClick={() => triggerAction('Tutup')} 
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 neu-button active:scale-95 transition-transform"
          >
            Tutup
          </button>
        </div>

        {/* Dropdown Selector */}
        <div className="relative">
          <select 
            value={selectedLayer}
            onChange={(e) => {
              setSelectedLayer(e.target.value);
              setLogMessage(`Beralih konfigurasi ke layer: [${e.target.value}]`);
            }}
            className="w-full pl-4 pr-10 py-2.5 rounded-2xl text-xs font-black text-slate-700 bg-[#eef2f7] shadow-[inset_1.5px_1.5px_3px_rgba(165,180,203,0.4),inset_-1.5px_-1.5px_3px_#ffffff] border border-white focus:outline-none appearance-none cursor-pointer"
          >
            <option value="CuP Acetabulum | 2/2">CuP Acetabulum | 2/2</option>
            <option value="Femur Component | 1/2">Femur Component | 1/2</option>
          </select>
          <ChevronDown className="absolute right-4 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>

        {}
        {/* Inner Scrollable Workspace - Prevents overly long screens on mobile */}
        <div className="custom-scroll overflow-y-auto max-h-[62vh] pr-1 space-y-4">
          
          {/* Header Info Banner */}
          <div className="p-3.5 neu-pressed rounded-2xl border border-white/60 space-y-1">
            <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest block">Active Target:</span>
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-slate-800">{layerName}</span>
              <span className="text-[10px] font-mono font-bold text-slate-500 bg-white/60 px-2 py-0.5 rounded-md border border-white">
                W 7.23 cm | H 9.23 cm
              </span>
            </div>
          </div>

          {/* Nama & Warna Shape */}
          <div className="p-3.5 neu-flat rounded-2xl border border-white/60 space-y-2.5">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Nama &amp; Warna Shape</span>
            
            <input 
              type="text" 
              value={layerName}
              onChange={(e) => setLayerName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 neu-input focus:outline-none focus:ring-1 focus:ring-blue-500/20"
            />

            {/* Compact Color Picker Palette */}
            <div className="flex flex-wrap items-center gap-2 pt-1.5">
              {colors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => {
                    setActiveColor(color.id);
                    setLogMessage(`Ubah skema warna penanda ke: [${color.name.toUpperCase()}]`);
                  }}
                  className={`w-6 h-6 rounded-full ${color.class} transition-all duration-200 relative flex items-center justify-center ${
                    activeColor === color.id ? 'ring-2 ring-offset-2 ring-blue-500 scale-110 shadow-md' : 'opacity-85 hover:scale-105'
                  }`}
                  title={color.name}
                >
                  {activeColor === color.id && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                </button>
              ))}
              
              {/* Custom Multi-color Button */}
              <button 
                onClick={() => triggerAction('Custom Palette')}
                className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shadow-md hover:scale-105 active:scale-95 transition-transform"
                title="Warna Kustom"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {}
          {/* Geometri Section (Width, Height, Pos X, Pos Y - Arranged in clean 2-Column Grids) */}
          <div className="grid grid-cols-2 gap-3">
            
            {/* Width Adjustment */}
            <div className="p-3 rounded-2xl neu-flat border border-white/50 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                <span>Width</span>
                <span className="font-mono text-slate-800">{width}px</span>
              </div>
              <input 
                type="range" 
                min="50" 
                max="300" 
                value={width}
                onChange={(e) => setWidth(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer focus:outline-none"
              />
            </div>

            {/* Height Adjustment */}
            <div className="p-3 rounded-2xl neu-flat border border-white/50 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                <span>Height</span>
                <span className="font-mono text-slate-800">{height}px</span>
              </div>
              <input 
                type="range" 
                min="50" 
                max="300" 
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer focus:outline-none"
              />
            </div>

            {/* Position X Adjustment */}
            <div className="p-3 rounded-2xl neu-flat border border-white/50 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                <span>Pos X</span>
                <span className="font-mono text-slate-800">{posX}px</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1000" 
                value={posX}
                onChange={(e) => setPosX(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer focus:outline-none"
              />
            </div>

            {/* Position Y Adjustment */}
            <div className="p-3 rounded-2xl neu-flat border border-white/50 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                <span>Pos Y</span>
                <span className="font-mono text-slate-800">{posY}px</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1000" 
                value={posY}
                onChange={(e) => setPosY(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer focus:outline-none"
              />
            </div>

          </div>

          {}
          {/* Optical Effect & Rotate Section (Compact 2-Column Grid) */}
          <div className="grid grid-cols-2 gap-3">
            
            {/* Rotation Adjustment */}
            <div className="p-3 rounded-2xl neu-flat border border-white/50 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                <span>Rotate</span>
                <span className="font-mono text-slate-800">{rotate}°</span>
              </div>
              <input 
                type="range" 
                min="-180" 
                max="180" 
                value={rotate}
                onChange={(e) => setRotate(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer focus:outline-none"
              />
            </div>

            {/* Opacity Adjustment */}
            <div className="p-3 rounded-2xl neu-flat border border-white/50 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                <span>Opacity</span>
                <span className="font-mono text-slate-800">{opacity}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={opacity}
                onChange={(e) => setOpacity(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer focus:outline-none"
              />
            </div>

            {/* Contrast Adjustment */}
            <div className="p-3 rounded-2xl neu-flat border border-white/50 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                <span>Contrast</span>
                <span className="font-mono text-slate-800">{contrast}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="200" 
                value={contrast}
                onChange={(e) => setContrast(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer focus:outline-none"
              />
            </div>

            {/* Level Adjustment */}
            <div className="p-3 rounded-2xl neu-flat border border-white/50 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                <span>Level</span>
                <span className="font-mono text-slate-800">{level}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="200" 
                value={level}
                onChange={(e) => setLevel(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer focus:outline-none"
              />
            </div>

          </div>

          {}
          {/* Layer Actions Grid (Extremely Compact 3-Column Touch Layout) */}
          <div className="space-y-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block px-1">Aksi &amp; Susunan Layer</span>
            
            <div className="grid grid-cols-3 gap-2.5">
              
              {/* Column Group 1: Navigation & Visibility */}
              <button 
                onClick={() => triggerAction('Move')}
                className="py-2.5 px-1.5 rounded-xl text-[10px] font-black text-slate-700 neu-button flex flex-col items-center gap-1.5"
              >
                <Move className="w-4 h-4 text-cyan-600" />
                Move
              </button>

              <button 
                onClick={() => triggerAction('Center')}
                className="py-2.5 px-1.5 rounded-xl text-[10px] font-black text-slate-700 neu-button flex flex-col items-center gap-1.5"
              >
                <Minimize className="w-4 h-4 text-blue-600" />
                Center
              </button>

              <button 
                onClick={() => {
                  setIsLocked(!isLocked);
                  triggerAction(isLocked ? 'Unlock Layer' : 'Lock Layer');
                }}
                className={`py-2.5 px-1.5 rounded-xl text-[10px] font-black flex flex-col items-center gap-1.5 transition-all ${
                  isLocked ? 'neu-pressed text-indigo-600 border border-indigo-200' : 'neu-button text-slate-700'
                }`}
              >
                {isLocked ? <Lock className="w-4 h-4 text-indigo-600" /> : <Unlock className="w-4 h-4 text-slate-500" />}
                {isLocked ? 'Locked' : 'Lock'}
              </button>

              {/* Column Group 2: Layout Flip & Defaults */}
              <button 
                onClick={() => triggerAction('Flip H')}
                className="py-2.5 px-1.5 rounded-xl text-[10px] font-black text-slate-700 neu-button flex flex-col items-center gap-1.5"
              >
                <LayoutGrid className="w-4 h-4 text-emerald-600" />
                Flip H
              </button>

              <button 
                onClick={() => triggerAction('Flip V')}
                className="py-2.5 px-1.5 rounded-xl text-[10px] font-black text-slate-700 neu-button flex flex-col items-center gap-1.5"
              >
                <Sliders className="w-4 h-4 text-emerald-600" />
                Flip V
              </button>

              <button 
                onClick={() => {
                  setWidth(134);
                  setHeight(171);
                  setPosX(828);
                  setPosY(104);
                  setRotate(-24);
                  setContrast(100);
                  setLevel(100);
                  setOpacity(58);
                  triggerAction('Reset Default');
                }}
                className="py-2.5 px-1.5 rounded-xl text-[10px] font-black text-slate-700 neu-button flex flex-col items-center gap-1.5"
              >
                <Minimize className="w-4 h-4 text-amber-600" />
                Default
              </button>

              {/* Column Group 3: Structuring & Operations */}
              <button 
                onClick={() => triggerAction('Duplicate')}
                className="py-2.5 px-1.5 rounded-xl text-[10px] font-black text-slate-700 neu-button flex flex-col items-center gap-1.5"
              >
                <Copy className="w-4 h-4 text-indigo-600" />
                Duplicate
              </button>

              <button 
                onClick={() => triggerAction('Naik Order')}
                className="py-2.5 px-1.5 rounded-xl text-[10px] font-black text-slate-700 neu-button flex flex-col items-center gap-1.5"
                title="Pindahkan Ke Atas"
              >
                <ArrowUp className="w-4 h-4 text-slate-600" />
                Naik
              </button>

              <button 
                onClick={() => triggerAction('Turun Order')}
                className="py-2.5 px-1.5 rounded-xl text-[10px] font-black text-slate-700 neu-button flex flex-col items-center gap-1.5"
                title="Pindahkan Ke Bawah"
              >
                <ArrowDown className="w-4 h-4 text-slate-600" />
                Turun
              </button>

              <button 
                onClick={() => triggerAction('Atas Layer')}
                className="py-2.5 px-1.5 rounded-xl text-[10px] font-black text-slate-700 neu-button flex flex-col items-center gap-1.5"
              >
                <ChevronsUp className="w-4 h-4 text-slate-600" />
                Atas
              </button>

              <button 
                onClick={() => triggerAction('Bawah Layer')}
                className="py-2.5 px-1.5 rounded-xl text-[10px] font-black text-slate-700 neu-button flex flex-col items-center gap-1.5"
              >
                <ChevronsDown className="w-4 h-4 text-slate-600" />
                Bawah
              </button>

              <button 
                onClick={() => triggerAction('Delete Layer')}
                className="py-2.5 px-1.5 rounded-xl text-[10px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 shadow-md flex flex-col items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                Delete
              </button>

            </div>
          </div>

        </div>

        {/* Console / Action logs footer */}
        <div className="pt-2.5 border-t border-slate-300/30 flex flex-col gap-1">
          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Status Sistem Logs:</span>
          <p className="text-[10px] font-bold text-slate-600 font-mono transition-all duration-300">{logMessage}</p>
        </div>

      </div>
    </div>
  );
}