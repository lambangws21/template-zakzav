"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

let cornerstoneBootstrapPromise;

async function bootstrapCornerstone() {
  if (cornerstoneBootstrapPromise) {
    return cornerstoneBootstrapPromise;
  }

  cornerstoneBootstrapPromise = (async () => {
    const [csCore, csTools, dicomImageLoader] = await Promise.all([
      import("@cornerstonejs/core"),
      import("@cornerstonejs/tools"),
      import("@cornerstonejs/dicom-image-loader"),
    ]);

    if (!csCore.isCornerstoneInitialized()) {
      csCore.init();
    }

    csTools.init();

    dicomImageLoader.init({
      maxWebWorkers:
        typeof navigator !== "undefined" && navigator.hardwareConcurrency
          ? Math.max(1, Math.floor(navigator.hardwareConcurrency / 2))
          : 1,
    });

    csTools.addTool(csTools.WindowLevelTool);
    csTools.addTool(csTools.PanTool);
    csTools.addTool(csTools.ZoomTool);
    csTools.addTool(csTools.LengthTool);
    csTools.addTool(csTools.StackScrollTool);

    return { csCore, csTools, dicomImageLoader };
  })();

  return cornerstoneBootstrapPromise;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const TOOL_OPTIONS = [
  { key: "windowLevel", label: "Window/Level" },
  { key: "pan", label: "Pan" },
  { key: "zoom", label: "Zoom" },
  { key: "length", label: "Length (mm)" },
];

export default function PacsDicomViewer() {
  const viewportRef = useRef(null);
  const modulesRef = useRef(null);
  const renderingEngineRef = useRef(null);
  const toolGroupRef = useRef(null);
  const stackListenerRef = useRef(null);

  const idsRef = useRef({
    renderingEngineId: `pacs-rendering-${Math.random().toString(36).slice(2)}`,
    viewportId: `pacs-viewport-${Math.random().toString(36).slice(2)}`,
    toolGroupId: `pacs-tools-${Math.random().toString(36).slice(2)}`,
  });

  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeToolKey, setActiveToolKey] = useState("windowLevel");
  const [imageIds, setImageIds] = useState([]);
  const [fileNames, setFileNames] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [pixelSpacing, setPixelSpacing] = useState(null);
  const [notice, setNotice] = useState(
    "Inisialisasi Cornerstone...",
  );

  const totalImages = imageIds.length;

  const toolNameByKey = useMemo(() => {
    const modules = modulesRef.current;
    if (!modules) return null;

    const { csTools } = modules;

    return {
      windowLevel: csTools.WindowLevelTool.toolName,
      pan: csTools.PanTool.toolName,
      zoom: csTools.ZoomTool.toolName,
      length: csTools.LengthTool.toolName,
      stackScroll: csTools.StackScrollTool.toolName,
    };
  }, [isReady]);

  const destroyStackListener = useCallback(() => {
    if (!stackListenerRef.current) return;

    const { element, eventName, handler } = stackListenerRef.current;
    element.removeEventListener(eventName, handler);
    stackListenerRef.current = null;
  }, []);

  const destroyViewer = useCallback(() => {
    destroyStackListener();

    if (renderingEngineRef.current) {
      renderingEngineRef.current.destroy();
      renderingEngineRef.current = null;
    }

    if (modulesRef.current) {
      const { csTools } = modulesRef.current;
      const { toolGroupId } = idsRef.current;

      if (csTools.ToolGroupManager.getToolGroup(toolGroupId)) {
        csTools.ToolGroupManager.destroyToolGroup(toolGroupId);
      }
    }

    toolGroupRef.current = null;
  }, [destroyStackListener]);

  const applyActivePrimaryTool = useCallback(
    (nextToolKey) => {
      if (!toolGroupRef.current || !toolNameByKey || !modulesRef.current) return;

      const { csTools } = modulesRef.current;
      const toolGroup = toolGroupRef.current;
      const primaryTools = [
        toolNameByKey.windowLevel,
        toolNameByKey.pan,
        toolNameByKey.zoom,
        toolNameByKey.length,
      ];

      primaryTools.forEach((toolName) => {
        toolGroup.setToolPassive(toolName, { removeAllBindings: true });
      });

      toolGroup.setToolActive(toolNameByKey[nextToolKey], {
        bindings: [
          {
            mouseButton: csTools.Enums.MouseBindings.Primary,
          },
        ],
      });

      toolGroup.setToolPassive(toolNameByKey.stackScroll, {
        removeAllBindings: true,
      });

      if (imageIds.length > 0) {
        toolGroup.setToolActive(toolNameByKey.stackScroll, {
          bindings: [
            {
              mouseButton: csTools.Enums.MouseBindings.Wheel,
            },
          ],
        });
      }
    },
    [imageIds.length, toolNameByKey],
  );

  const setupViewer = useCallback(async () => {
    if (!viewportRef.current) return;

    setIsLoading(true);

    try {
      const modules = await bootstrapCornerstone();
      modulesRef.current = modules;

      const { csCore, csTools } = modules;
      const { renderingEngineId, viewportId, toolGroupId } = idsRef.current;

      destroyViewer();

      const renderingEngine = new csCore.RenderingEngine(renderingEngineId);

      renderingEngine.enableElement({
        element: viewportRef.current,
        viewportId,
        type: csCore.Enums.ViewportType.STACK,
      });

      const toolGroup = csTools.ToolGroupManager.createToolGroup(toolGroupId);

      if (!toolGroup) {
        throw new Error("Gagal membuat tool group.");
      }

      [
        csTools.WindowLevelTool.toolName,
        csTools.PanTool.toolName,
        csTools.ZoomTool.toolName,
        csTools.LengthTool.toolName,
        csTools.StackScrollTool.toolName,
      ].forEach((toolName) => {
        toolGroup.addTool(toolName);
      });

      toolGroup.addViewport(viewportId, renderingEngineId);

      renderingEngineRef.current = renderingEngine;
      toolGroupRef.current = toolGroup;

      const stackEventName = csCore.Enums.Events.STACK_NEW_IMAGE;
      const stackHandler = (event) => {
        const detail = event.detail;
        if (detail.viewportId !== viewportId) return;
        setCurrentImageIndex(detail.imageIdIndex);
      };

      viewportRef.current.addEventListener(stackEventName, stackHandler);
      stackListenerRef.current = {
        element: viewportRef.current,
        eventName: stackEventName,
        handler: stackHandler,
      };

      setIsReady(true);
      setNotice("Viewer siap. Upload file DICOM untuk mulai.");
    } catch (error) {
      setNotice(
        `Gagal inisialisasi viewer: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    } finally {
      setIsLoading(false);
    }
  }, [destroyViewer]);

  useEffect(() => {
    setupViewer();

    return () => {
      destroyViewer();

      if (modulesRef.current) {
        modulesRef.current.dicomImageLoader.wadouri.fileManager.purge();
      }
    };
  }, [destroyViewer, setupViewer]);

  useEffect(() => {
    applyActivePrimaryTool(activeToolKey);
  }, [activeToolKey, imageIds.length, applyActivePrimaryTool]);

  useEffect(() => {
    const onResize = () => {
      if (!renderingEngineRef.current) return;
      renderingEngineRef.current.resize(true, true);
      renderingEngineRef.current.render();
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const loadDicomFiles = useCallback(async (files) => {
    if (!modulesRef.current || !renderingEngineRef.current) return;

    const { dicomImageLoader } = modulesRef.current;
    const { viewportId } = idsRef.current;

    setIsLoading(true);

    try {
      const cleanFiles = [...files].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true }),
      );

      let spacingInfo = null;
      try {
        const dicomParserModule = await import("dicom-parser");
        const dicomParser = dicomParserModule.default || dicomParserModule;
        const firstFile = cleanFiles[0];
        if (firstFile) {
          const buffer = await firstFile.arrayBuffer();
          const byteArray = new Uint8Array(buffer);
          const dataSet = dicomParser.parseDicom(byteArray);
          const rawSpacing =
            dataSet.string("x00280030") ||
            dataSet.string("x00181164") ||
            "";
          if (rawSpacing) {
            const parts = rawSpacing
              .split("\\")
              .map((value) => Number(value))
              .filter((value) => Number.isFinite(value) && value > 0);
            if (parts.length >= 2) {
              spacingInfo = {
                row: parts[0],
                column: parts[1],
              };
            }
          }
        }
      } catch {
        spacingInfo = null;
      }

      dicomImageLoader.wadouri.fileManager.purge();

      const nextImageIds = cleanFiles.map((file) =>
        dicomImageLoader.wadouri.fileManager.add(file),
      );

      const viewport = renderingEngineRef.current.getStackViewport(viewportId);
      await viewport.setStack(nextImageIds, 0);
      viewport.resetCamera();
      if (typeof viewport.setProperties === "function") {
        viewport.setProperties({ rotation: 0 });
      }
      viewport.render();

      setImageIds(nextImageIds);
      setFileNames(cleanFiles.map((file) => file.name));
      setCurrentImageIndex(0);
      setRotationDeg(0);
      setPixelSpacing(spacingInfo);
      setNotice(
        spacingInfo
          ? `Loaded ${nextImageIds.length} file DICOM. PixelSpacing ${spacingInfo.row.toFixed(4)} x ${spacingInfo.column.toFixed(4)} mm/px terdeteksi (true scale aktif).`
          : `Loaded ${nextImageIds.length} file DICOM. Tool Length akan tampil mm jika Pixel Spacing tersedia.`,
      );
    } catch (error) {
      setPixelSpacing(null);
      setNotice(
        `Gagal load DICOM: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFileChange = useCallback(
    async (event) => {
      const files = Array.from(event.target.files || []);
      if (!files.length) return;

      await loadDicomFiles(files);
      event.target.value = "";
    },
    [loadDicomFiles],
  );

  const goToImageIndex = useCallback(
    async (targetIndex) => {
      if (!renderingEngineRef.current || !imageIds.length) return;

      const { viewportId } = idsRef.current;
      const viewport = renderingEngineRef.current.getStackViewport(viewportId);
      const safeIndex = clamp(targetIndex, 0, imageIds.length - 1);

      await viewport.setImageIdIndex(safeIndex);
      viewport.render();
      setCurrentImageIndex(safeIndex);
    },
    [imageIds.length],
  );

  const setViewportRotation = useCallback((nextRotation) => {
    if (!renderingEngineRef.current) return;

    const { viewportId } = idsRef.current;
    const viewport = renderingEngineRef.current.getStackViewport(viewportId);
    const normalized = ((nextRotation % 360) + 360) % 360;

    if (typeof viewport.setProperties === "function") {
      viewport.setProperties({ rotation: normalized });
    } else if (
      typeof viewport.getViewPresentation === "function" &&
      typeof viewport.setViewPresentation === "function"
    ) {
      const presentation = viewport.getViewPresentation();
      viewport.setViewPresentation({
        ...presentation,
        rotation: normalized,
      });
    }

    viewport.render();
    setRotationDeg(normalized);
  }, []);

  const rotateViewport = useCallback(
    (delta) => {
      setViewportRotation(rotationDeg + delta);
    },
    [rotationDeg, setViewportRotation],
  );

  const resetView = useCallback(() => {
    if (!renderingEngineRef.current) return;

    const { viewportId } = idsRef.current;
    const viewport = renderingEngineRef.current.getStackViewport(viewportId);

    viewport.resetCamera();
    setViewportRotation(0);
  }, [setViewportRotation]);

  return (
    <div className="flex min-h-screen w-screen max-w-none flex-col gap-4 p-2 sm:p-4 lg:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-slate-900">PACS DICOM Viewer</h1>
        <p className="text-slate-600">
          Cornerstone3D + Tools. Upload DICOM lokal untuk preview slice dan measurement.
        </p>
      </header>

      <section className="grid flex-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="dicom-upload" className="text-sm font-medium text-slate-700">
              Upload DICOM (multi-file)
            </label>
            <input
              id="dicom-upload"
              type="file"
              accept=".dcm,application/dicom"
              multiple
              onChange={handleFileChange}
              disabled={!isReady || isLoading}
              className="block w-full cursor-pointer rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
            <p className="text-xs text-slate-500">
              {totalImages > 0
                ? `${totalImages} file dimuat.`
                : "Belum ada dataset DICOM yang dimuat."}
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
            <span className="text-sm font-semibold text-slate-700">Tools</span>
            <div className="grid grid-cols-2 gap-2">
              {TOOL_OPTIONS.map((tool) => (
                <button
                  key={tool.key}
                  type="button"
                  onClick={() => setActiveToolKey(tool.key)}
                  className={`rounded-md px-3 py-2 text-sm ${
                    activeToolKey === tool.key
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300 bg-white text-slate-700"
                  }`}
                  disabled={!isReady}
                >
                  {tool.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Wheel: scroll slice. Tool `Length` menampilkan mm jika metadata spacing ada.
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
            <span className="text-sm font-semibold text-slate-700">Navigation</span>
            <div className="text-xs text-slate-600">
              Slice: {totalImages ? currentImageIndex + 1 : 0} / {totalImages}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => goToImageIndex(currentImageIndex - 1)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading || !totalImages || currentImageIndex <= 0}
              >
                Prev
              </button>
              <button
                type="button"
                onClick={resetView}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading || !totalImages}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => goToImageIndex(currentImageIndex + 1)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading || !totalImages || currentImageIndex >= totalImages - 1}
              >
                Next
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => rotateViewport(-90)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading || !totalImages}
              >
                Rotate -90
              </button>
              <button
                type="button"
                onClick={() => rotateViewport(90)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading || !totalImages}
              >
                Rotate +90
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
            <span className="text-sm font-semibold text-slate-700">Dataset</span>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
              PixelSpacing:{" "}
              {pixelSpacing
                ? `${pixelSpacing.row.toFixed(4)} x ${pixelSpacing.column.toFixed(4)} mm/px`
                : "tidak terbaca"}
            </div>
            <div className="max-h-36 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
              {fileNames.length === 0 ? (
                <span>Tidak ada file.</span>
              ) : (
                <ul className="space-y-1">
                  {fileNames.map((name, index) => (
                    <li
                      key={`${name}-${index}`}
                      className={index === currentImageIndex ? "font-semibold text-slate-800" : ""}
                    >
                      {index + 1}. {name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {notice}
          </p>
        </aside>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div
            ref={viewportRef}
            className="relative h-[72vh] min-h-[460px] w-full overflow-hidden rounded-lg border border-slate-300 bg-black"
          />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            <span>Viewer: {isReady ? "ready" : "initializing"}</span>
            <span>Loading: {isLoading ? "yes" : "no"}</span>
            <span>Tool aktif: {TOOL_OPTIONS.find((t) => t.key === activeToolKey)?.label}</span>
            <span>Rotate: {rotationDeg}°</span>
            <span>
              PixelSpacing: {pixelSpacing ? `${pixelSpacing.row.toFixed(4)} x ${pixelSpacing.column.toFixed(4)} mm/px` : "n/a"}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
