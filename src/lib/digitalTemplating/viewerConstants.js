export const XRAY_BASE_WIDTH = 1429;
export const XRAY_BASE_HEIGHT = 742;

export const VIEWER_ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5];
export const VIEWER_ZOOM_MIN = 0.25;
export const VIEWER_ZOOM_MAX = 5;
export const VIEWER_ZOOM_STEP = 0.05;

export const VIEWER_COLORS = {
  ahka: "#ef4444",
  angle: "#CF0F47",
  drawLine: "#a855f7",
  lld: "#38bdf8",
  offset: "#f59e0b",
  ruler: "#22c55e",
  tibialCut: "#FFE100",
  tibialSlope: "#06b6d4",
  valgusCut: "#f97316",
};

export const VIEWER_MEASURE_STYLE = {
  angleFontSize: 11,
  angleLabelStrokeWidth: 2.5,
  anglePointRadius: 3.5,
  angleStrokeWidth: 2.5,
  fontSize: 11,
  handleRadius: 2.5,
  labelStrokeWidth: 2.5,
  strokeWidth: 1.5,
};

export const VIEWER_STORAGE_KEYS = {
  calibrationPresets: "templating-calibration-presets",
  session: "templating-session-v1",
  tour: "templating-tour-v2",
};

export const VIEWER_COLLAPSE_VARIANTS = {
  open: {
    height: "auto",
    opacity: 1,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1],
    },
  },
};
