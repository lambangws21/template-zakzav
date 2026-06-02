"use client";
import React, { useState } from 'react';
import {
  Hand,
  PenTool,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('Measure'); // 'Setup' | 'Tool' | 'Measure' | 'Plan'
  const [activeTool, setActiveTool] = useState('draw'); // 'pan' | 'draw' | 'tools'


  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setPacsLog(`Navigasi diubah ke tab: [${tabName.toUpperCase()}].`);
  };

  const handleToolSelect = (toolId, toolLabel) => {
    setActiveTool(toolId);
    setPacsLog(`Alat aktif beralih ke: [${toolLabel.toUpperCase()}]. Silakan berinteraksi dengan kanvas rontgen.`);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-8 bg-[#090b11] relative overflow-hidden transition-colors duration-500">
      
      {/* Injecting CSS Custom Neumorphic Micro Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Premium Neumorphic Micro shadows (Smaller outset & inset depths) */
        .neu-tray-bg {
          background: #eef2f7;
          box-shadow: inset 1px 1px 3px rgba(165, 180, 203, 0.4), inset -1px -1px 3px #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.8);
        }
        .neu-btn-raised {
          background: #eef2f7;
          box-shadow: 1.5px 1.5px 4px rgba(165, 180, 203, 0.45), -1.5px -1.5px 4px #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.75);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .neu-btn-raised:hover {
          box-shadow: 1px 1px 2px rgba(165, 180, 203, 0.4), -1px -1px 2px #ffffff;
          transform: translateY(0.2px);
        }
        .neu-btn-pressed {
          background: #eef2f7;
          box-shadow: inset 1.5px 1.5px 4px rgba(165, 180, 203, 0.5), inset -1.5px -1.5px 4px #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.4);
          transform: translateY(0.5px);
          transition: all 0.15s ease-in-out;
        }
        .text-active-navy {
          color: #1e293b;
          font-weight: 800;
        }
        .text-inactive-slate {
          color: #64748b;
          font-weight: 600;
        }
      `}} />

      {/* Main Layout Container */}
      <div className="w-full max-w-4xl flex flex-col items-center space-y-12 z-10">
        
        {/* TOP BAR LAYOUT CONTROLLER */}
        <div className="w-full flex flex-wrap items-center justify-between gap-6 p-4 rounded-[32px] bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          
          {/* Left Segment: Navigation Tabs Bar Capsule */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-full neu-tray-bg relative">
            {['Setup', 'Tool', 'Measure', 'Plan'].map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`px-5 py-2.5 rounded-full text-xs transition-all duration-300 ease-out flex items-center justify-center min-w-[76px] ${
                    isActive 
                      ? 'neu-btn-pressed text-active-navy font-bold' 
                      : 'text-inactive-slate hover:text-slate-800'
                  }`}
                >
                  <span className="transform active:scale-95 transition-transform">{tab}</span>
                </button>
              );
            })}
          </div>

          {/* Right Segment: Active Surgical Tool Controllers Capsule */}
          <div className="flex items-center gap-2.5 p-1.5 rounded-full neu-tray-bg">
            {/* Tool 1: Hand / Pan Toggle */}
            <button
              onClick={() => handleToolSelect('pan', 'Move/Pan Canvas')}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ${
                activeTool === 'pan' ? 'neu-btn-pressed' : 'neu-btn-raised'
              }`}
              title="Move / Drag"
            >
              <Hand className={`w-4 h-4 ${activeTool === 'pan' ? 'text-blue-600' : 'text-slate-600'}`} />
            </button>

            {/* Tool 2: Pen / Line Measurement Toggle */}
            <button
              onClick={() => handleToolSelect('draw', 'Line Measurement')}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ${
                activeTool === 'draw' ? 'neu-btn-pressed' : 'neu-btn-raised'
              }`}
              title="Line Draw"
            >
              <PenTool className={`w-4 h-4 ${activeTool === 'draw' ? 'text-blue-600' : 'text-slate-600'}`} />
            </button>

            {/* Tool 3: Advanced Surgical Tools Button */}
            <button
              onClick={() => handleToolSelect('tools', 'Advanced Tools')}
              className={`px-5 py-2.5 rounded-full flex items-center justify-center gap-2 transition-all duration-300 ${
                activeTool === 'tools' ? 'neu-btn-pressed' : 'neu-btn-raised'
              }`}
              title="Advanced Tools"
            >
              <Hand className={`w-4 h-4 ${activeTool === 'tools' ? 'text-blue-600' : 'text-slate-600'}`} />
              <span className={`text-xs font-black uppercase tracking-wider ${activeTool === 'tools' ? 'text-blue-700' : 'text-slate-600'}`}>
                Tools
              </span>
            </button>
          </div>

        </div>


      </div>


    </div>
  );
}