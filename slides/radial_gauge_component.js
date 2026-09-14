/**
 * Process Development Monthly Report Automation System
 * Module: Radial Gauge Component
 * Renders the circular progress donut gauge matching Walton Reference Slide
 * WALTON Hi-Tech Industries PLC
 */

const RadialGaugeComponent = {
  /**
   * Generates SVG string for the radial gauge
   * @param {Number} percent - e.g. 100 or 75
   * @param {String} label - e.g. "Completed" or "In Progress"
   * @param {Number} size - Diameter in px
   */
  renderSVG(percent = 100, label = "Completed", size = 160) {
    const strokeWidth = 14;
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    const ringColor = percent >= 100 ? "#10B981" : (percent >= 50 ? "#0284C7" : "#F59E0B");

    return `
      <div class="radial-gauge-container flex flex-col items-center justify-center relative" style="width: ${size}px; height: ${size}px;">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="transform -rotate-90">
          <!-- Background Track -->
          <circle
            cx="${center}"
            cy="${center}"
            r="${radius}"
            fill="transparent"
            stroke="#E2E8F0"
            stroke-width="${strokeWidth}"
          />
          <!-- Progress Ring -->
          <circle
            cx="${center}"
            cy="${center}"
            r="${radius}"
            fill="transparent"
            stroke="${ringColor}"
            stroke-width="${strokeWidth}"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${strokeDashoffset}"
            stroke-linecap="round"
          />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span style="font-family: 'Lexend', sans-serif; font-size: 24px; font-weight: 800; color: #0B2038; line-height: 1;">
            ${percent}%
          </span>
          <span style="font-family: 'Lexend', sans-serif; font-size: 11px; font-weight: 600; color: #0B2038; margin-top: 4px;">
            ${label}
          </span>
        </div>
      </div>
    `;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RadialGaugeComponent;
} else if (typeof window !== 'undefined') {
  window.RadialGaugeComponent = RadialGaugeComponent;
}
