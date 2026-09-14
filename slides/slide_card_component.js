/**
 * Process Development Monthly Report Automation System
 * Module: Slide Card Component
 * Formats task card with Lexend typography, AI fields, and photo/blank state
 * WALTON Hi-Tech Industries PLC
 */

const SlideCardComponent = {
  /**
   * Renders HTML for a single task card inside an engineer slide
   */
  renderCardHTML(task, index = 1) {
    const title = task.ai_report_title || task.task_name || "Untitled Engineering Task";
    const desc = task.ai_report_description || task.task_details || "Technical verification completed.";
    const impact = task.ai_report_impact || task.impact || "Process optimization achieved.";
    const photo = task.photo_1 || task.photo_2 || task.before_photo || task.after_photo || "";

    // Parse impact into clean bullet points
    const impactPoints = impact.split(/[;\n]/).map(s => s.trim()).filter(s => s.length > 0);

    return `
      <div class="slide-task-card flex flex-col justify-between bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg h-full overflow-hidden">
        
        <!-- Top: Title & Badges -->
        <div>
          <div class="flex items-start justify-between gap-2 mb-1.5">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              #${index} &bull; ${task.category || 'Process'}
            </span>
            ${task.annual_saving > 0 ? `
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                💰 ${HELPERS.formatBDT(task.annual_saving)}
              </span>
            ` : ''}
          </div>

          <h4 class="text-sm font-bold text-white tracking-tight leading-snug line-clamp-2" style="font-family: 'Lexend', sans-serif;">
            ${HELPERS.escapeHTML(title)}
          </h4>

          <p class="text-xs text-slate-300 mt-1.5 leading-relaxed line-clamp-3" style="font-family: 'Lexend', sans-serif;">
            ${HELPERS.escapeHTML(desc)}
          </p>
        </div>

        <!-- Middle: Photo Area or Intentional Blank State -->
        <div class="my-2.5 w-full h-32 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-center overflow-hidden">
          ${photo ? `
            <img src="${photo}" alt="Task Photo" class="w-full h-full object-cover">
          ` : `
            <div class="text-center p-3 text-slate-600">
              <svg class="w-7 h-7 mx-auto mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <span class="text-[10px] font-mono text-slate-500 font-medium tracking-wide">[ PHOTO PENDING ]</span>
            </div>
          `}
        </div>

        <!-- Bottom: Impact Points -->
        <div class="pt-2 border-t border-slate-800/80">
          <span class="text-[10px] font-bold uppercase tracking-wider text-cyan-400 font-mono">Impact Summary:</span>
          <ul class="text-[11px] text-slate-300 space-y-0.5 mt-1 list-disc list-inside line-clamp-2" style="font-family: 'Lexend', sans-serif;">
            ${impactPoints.slice(0, 2).map(pt => `<li>${HELPERS.escapeHTML(pt)}</li>`).join('')}
          </ul>
        </div>

      </div>
    `;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SlideCardComponent;
} else if (typeof window !== 'undefined') {
  window.SlideCardComponent = SlideCardComponent;
}
