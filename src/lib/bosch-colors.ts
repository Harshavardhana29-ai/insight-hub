/**
 * Bosch Brand Colors — Single source of truth.
 *
 * All color values come from the official Bosch Design Guidelines.
 * Import from here everywhere — never hardcode hex values.
 */

// ─── Core Brand Colors (50 = primary shade) ───────────────────

export const boschBlue = {
  95: "#e8f1ff",
  90: "#d1e4ff",
  85: "#b8d6ff",
  80: "#9dc9ff",
  75: "#7ebdff",
  70: "#56b0ff",
  65: "#00a4fd",
  60: "#0096e8",
  55: "#0088d4",
  50: "#007bc0",  // ← Primary brand blue
  45: "#006ead",
  40: "#00629a",
  35: "#005587",
  30: "#004975",
  25: "#003e64",
  20: "#003253",
  15: "#002742",
  10: "#001d33",
  5:  "#001222",
} as const;

export const boschGray = {
  95: "#eff1f2",
  90: "#e0e2e5",
  85: "#d0d4d8",
  80: "#c1c7cc",
  75: "#b2b9c0",
  70: "#a4abb3",
  65: "#979ea4",
  60: "#8a9097",
  55: "#7d8389",
  50: "#71767c",
  45: "#656a6f",
  40: "#595e62",
  35: "#4e5256",
  30: "#43464a",
  25: "#383b3e",
  20: "#2e3033",
  15: "#232628",
  10: "#1a1c1d",
  5:  "#101112",
} as const;

export const boschTurquoise = {
  95: "#def5f3",
  90: "#b6ede8",
  85: "#a1dfdb",
  80: "#8dd2cd",
  75: "#79c5c0",
  70: "#66b8b2",
  65: "#54aba5",
  60: "#419e98",
  55: "#2e908b",
  50: "#18837e",
  45: "#147671",
  40: "#116864",
  35: "#0e5b57",
  30: "#0a4f4b",
  25: "#07423f",
  20: "#053634",
  15: "#032b28",
  10: "#02201e",
  5:  "#011413",
} as const;

export const boschGreen = {
  95: "#e2f5e7",
  90: "#b8efc9",
  85: "#9be4b3",
  80: "#86d7a2",
  75: "#72ca92",
  70: "#5ebd82",
  65: "#4ab073",
  60: "#37a264",
  55: "#219557",
  50: "#00884a",
  45: "#007a42",
  40: "#006c3a",
  35: "#005f32",
  30: "#00512a",
  25: "#004523",
  20: "#00381b",
  15: "#002c14",
  10: "#00210e",
  5:  "#001507",
} as const;

export const boschPurple = {
  95: "#f7eef6",
  90: "#f0dcee",
  85: "#ebcae8",
  80: "#e8b6e3",
  75: "#e5a2df",
  70: "#e48cdd",
  65: "#e472db",
  60: "#e552da",
  55: "#d543cb",
  50: "#c535bc",
  45: "#b12ea9",
  40: "#9e2896",
  35: "#8b2284",
  30: "#791d73",
  25: "#671761",
  20: "#551151",
  15: "#440c41",
  10: "#340731",
  5:  "#230421",
} as const;

// Warning colors — restricted usage per Bosch guidelines
export const boschYellow = {
  95: "#ffefd1",
  90: "#ffdf95",
  85: "#ffcf00",
  80: "#eec100",
  75: "#deb300",
  70: "#cda600",
  65: "#bd9900",
  60: "#ad8c00",
  55: "#9e7f00",
  50: "#8f7300",
  45: "#806700",
  40: "#725b00",
  35: "#644f00",
  30: "#564400",
  25: "#493900",
  20: "#3c2e00",
  15: "#2f2400",
  10: "#231a00",
  5:  "#171000",
} as const;

export const boschRed = {
  95: "#ffecec",
  90: "#ffd9d9",
  85: "#ffc6c6",
  80: "#ffb2b2",
  75: "#ff9d9d",
  70: "#ff8787",
  65: "#ff6e6f",
  60: "#ff5152",
  55: "#ff2124",
  50: "#ed0007",
  45: "#d50005",
  40: "#be0004",
  35: "#a80003",
  30: "#920002",
  25: "#7d0002",
  20: "#680001",
  15: "#540001",
  10: "#410000",
  5:  "#2d0000",
} as const;

// ─── Semantic / Functional Aliases ────────────────────────────

/** Primary brand color */
export const BOSCH_PRIMARY = boschBlue[50];        // #007bc0
/** Darker shade for headings/accents */
export const BOSCH_PRIMARY_DARK = boschBlue[30];   // #004975
/** Lighter shade for hover states and backgrounds */
export const BOSCH_PRIMARY_LIGHT = boschBlue[65];  // #00a4fd

/** Table header background */
export const BOSCH_TABLE_HEADER_BG = boschBlue[50];
/** Table header border */
export const BOSCH_TABLE_HEADER_BORDER = boschBlue[40];
/** Table row alt background */
export const BOSCH_TABLE_ROW_ALT = boschGray[95];
/** Table cell border */
export const BOSCH_TABLE_BORDER = boschGray[85];

/** Success accent */
export const BOSCH_SUCCESS = boschGreen[50];       // #00884a
/** Warning (yellow — restricted usage) */
export const BOSCH_WARNING = boschYellow[85];      // #ffcf00
/** Error (red — restricted usage) */
export const BOSCH_ERROR = boschRed[50];           // #ed0007

// ─── Chart Color Palettes ─────────────────────────────────────

/** 10-color palette for charts — uses distinct Bosch brand hues */
export const BOSCH_CHART_COLORS = [
  boschBlue[50],       // #007bc0
  boschTurquoise[50],  // #18837e
  boschGreen[50],      // #00884a
  boschPurple[50],     // #c535bc
  boschBlue[70],       // #56b0ff
  boschTurquoise[70],  // #66b8b2
  boschGreen[70],      // #5ebd82
  boschPurple[70],     // #e48cdd
  boschBlue[35],       // #005587
  boschGreen[35],      // #005f32
] as const;

/** Pie chart colors — slightly richer variants */
export const BOSCH_PIE_COLORS = [
  boschBlue[50],       // #007bc0
  boschTurquoise[50],  // #18837e
  boschGreen[50],      // #00884a
  boschPurple[50],     // #c535bc
  boschBlue[65],       // #00a4fd
  boschTurquoise[65],  // #54aba5
  boschGreen[65],      // #4ab073
  boschPurple[65],     // #e472db
  boschBlue[35],       // #005587
  boschGreen[35],      // #005f32
] as const;

// ─── Export Styling (PDF / Word) ──────────────────────────────

/** Colors for PDF / Word inline HTML (hex only, no HSL) */
export const exportColors = {
  /** Heading primary color */
  heading: boschBlue[50],
  /** H1 color (darker) */
  headingDark: boschBlue[30],
  /** Link color */
  link: boschBlue[50],
  /** Pre/code background */
  codeBg: boschGray[95],
  /** Pre/code border */
  codeBorder: boschGray[90],
  /** Inline code background */
  inlineCodeBg: boschGray[95],
  /** Table header background */
  tableHeaderBg: boschBlue[50],
  /** Table header border */
  tableHeaderBorder: boschBlue[40],
  /** Table row alt */
  tableRowAlt: boschGray[95],
  /** Table cell border */
  tableBorder: boschGray[85],
  /** Body text */
  text: boschGray[30],
  /** Muted/secondary text */
  textMuted: boschGray[55],
  /** Blockquote border */
  blockquoteBorder: boschBlue[50],
  /** Blockquote background */
  blockquoteBg: boschBlue[95],
  /** HR/separator */
  separator: boschGray[85],
  /** Footer text */
  footerText: boschGray[65],
} as const;

/** Parse hex color to RGB tuple — for use with jsPDF setFillColor/setTextColor */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}
