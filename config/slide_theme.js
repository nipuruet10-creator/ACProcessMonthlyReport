/**
 * Process Development Monthly Report Automation System
 * Module: Slide Theme & Visual System
 * Defines 16:9 layout, Lexend typography, and Walton Corporate Reference palette
 * Matches Walton Reference Slide (media_1789013397250.png)
 */

const SLIDE_THEME = {
  // Dimensions for standard 16:9 Widescreen
  LAYOUT: {
    ASPECT_RATIO: "16:9",
    SLIDE_WIDTH_INCHES: 13.333,
    SLIDE_HEIGHT_INCHES: 7.5,
    SLIDE_WIDTH_PIXELS: 1920,
    SLIDE_HEIGHT_PIXELS: 1080,
    HEADER_HEIGHT_PIXELS: 120,
    FOOTER_HEIGHT_PIXELS: 40,
    CONTENT_PADDING_PIXELS: 40,
    CARD_GAP_PIXELS: 20,
    BORDER_RADIUS_PIXELS: 12
  },

  // Mandated Font: LEXEND
  TYPOGRAPHY: {
    FONT_FAMILY: "Lexend",
    FALLBACK: "Arial, sans-serif",
    WEIGHTS: {
      REGULAR: 400,
      MEDIUM: 500,
      SEMIBOLD: 600,
      BOLD: 700,
      EXTRABOLD: 800
    },
    SIZES: {
      SLIDE_TITLE: "26pt",
      SECTION_SUBTITLE: "14pt",
      ENGINEER_NAME: "17pt",
      CARD_TITLE: "15pt",
      CARD_BODY: "11.5pt",
      CARD_IMPACT: "11pt",
      BADGE: "10pt",
      FOOTER: "9.5pt",
      KPI_BIG_NUMBER: "36pt",
      KPI_LABEL: "11.5pt"
    }
  },

  // Color Palette (Hex values matching the Walton Reference Slide)
  COLORS: {
    // Walton Red Executive Palette (Matching media_1789014742407.jpg)
    RED_PRIMARY: "#C5161D",       // Walton signature red (headlines, badges, logo)
    RED_ACCENT: "#D0021B",        // Bright crimson accent
    RED_GRADIENT_START: "#E11D48",
    RED_GRADIENT_END: "#BE123C",
    RED_LIGHT: "#FEE2E2",         // Soft red badge tint
    RED_ICON_BG: "#DC2626",       // Icon circle backgrounds
    DARK_CHARCOAL: "#0F172A",     // Primary dark text / title line 1
    SLATE_DARK: "#1E293B",        // Secondary dark
    CARD_BG_LIGHT: "#F8FAFC",     // Overview card surface
    CARD_BORDER_LIGHT: "#E2E8F0", // Clean subtle card border
    GREEN_STATUS: "#10B981",      // Success green dot / positive metrics
    RED_METRIC_DOWN: "#EF4444",   // Reduction indicator (e.g. material waste)
    
    // Canvas & Surfaces
    BG_SLIDE: "#FFFFFF",
    NAVY_PRIMARY: "#0B2038",      // Bold dark headlines
    NAVY_DARK: "#07172B",         // Left sidebar bottom banner
    BLUE_CORPORATE: "#0284C7",    // Corporate blue, Proposed header, buttons
    BLUE_DARK: "#0052CC",         // Project impact header
    ORANGE_ACCENT: "#FF6B00",     // Action keyword highlight, Present Condition pill
    ORANGE_VIBRANT: "#F97316",    // Ongoing project badge, swoosh underlines
    GREEN_SUCCESS: "#10B981",     // Radial completion ring (100%), savings pill
    CARD_BG_BLUE: "#F0F9FF",      // Summary panel container
    CARD_BORDER_BLUE: "#BAE6FD",  // Summary panel border
    CARD_BG_GREY: "#F8FAFC",      // Empty photo container / neutral card
    
    // FY Comparison Dual Palettes (Images 4 & 5)
    FY25_BLUE: "#0052CC",
    FY25_LIGHT_BLUE: "#EBF3FF",
    FY25_BORDER_BLUE: "#90CDF4",
    FY25_ORANGE: "#FF6B00",
    FY26_GREEN: "#00875A",
    FY26_LIGHT_GREEN: "#E3FCEF",
    FY26_BORDER_GREEN: "#A7F3D0",
    BORDER_LIGHT: "#E2E8F0",      // Thin dividers & card borders
    TEXT_MUTED: "#64748B",        // Subtitles, metadata, footer
    TEXT_DARK: "#0F172A",         // Body text
    WHITE: "#FFFFFF",

    // Project Impact Pill Stack Colors
    PILL_PRODUCTIVITY_BG: "#E0F2FE",
    PILL_PRODUCTIVITY_TEXT: "#0369A1",
    PILL_QUALITY_BG: "#FEF3C7",
    PILL_QUALITY_TEXT: "#B45309",
    PILL_CAPACITY_BG: "#F1F5F9",
    PILL_CAPACITY_TEXT: "#334155",
    PILL_SAVINGS_BG: "#DCFCE7",
    PILL_SAVINGS_TEXT: "#15803D",

    // Dark Mode / Classic Fallbacks
    NAVY_950: "#090D16",
    NAVY_900: "#0F172A",
    NAVY_800: "#1E293B",
    SLATE_100: "#F1F5F9",
    SLATE_400: "#94A3B8"
  },

  // Master Slide Header & Branding Template
  HEADER: {
    ORG_NAME: "WALTON Hi-Tech Industries PLC",
    DEPT_NAME: "Process Development Department",
    TAGLINE: "INNOVATE | IMPROVE | DELIVER",
    SLOGAN_TOP: "SMALL CHANGES",
    SLOGAN_BOTTOM: "BIG IMPACT",
    SLOGAN_CLASSIC: "Continuous Improvement for Better Production",
    SIDEBAR_BANNER: "Small Changes Big Impact",
    QUOTE_DEFAULT: "Automation for a Smarter Tomorrow"
  },

  // Master Slide Footer Template
  FOOTER: {
    ORG_LINE1: "PROCESS DEVELOPMENT DEPARTMENT",
    ORG_LINE2: "WALTON HI-TECH INDUSTRIES PLC.",
    PILLARS: [
      { icon: "trophy", label: "Continuous Improvement" },
      { icon: "users", label: "Stronger Together" },
      { icon: "bulb", label: "A Smarter Tomorrow" }
    ],
    ATTRIBUTION: "Process Development, Air Conditioner, Walton Hi-Tech Industries PLC"
  },

  // Active Template Mode
  DEFAULT_TEMPLATE: "walton_red_executive"
};

if (typeof Object.freeze === 'function') {
  Object.freeze(SLIDE_THEME);
  Object.freeze(SLIDE_THEME.LAYOUT);
  Object.freeze(SLIDE_THEME.TYPOGRAPHY);
  Object.freeze(SLIDE_THEME.COLORS);
  Object.freeze(SLIDE_THEME.HEADER);
  Object.freeze(SLIDE_THEME.FOOTER);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SLIDE_THEME;
} else if (typeof window !== 'undefined') {
  window.SLIDE_THEME = SLIDE_THEME;
}
