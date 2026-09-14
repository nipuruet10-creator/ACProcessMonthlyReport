/**
 * Process Development Monthly Report Automation System
 * Module: Dashboard Charts Controller
 * Renders interactive visualizations with Chart.js
 * WALTON Hi-Tech Industries PLC
 */

const DashboardCharts = {
  instances: {},

  destroyAll() {
    Object.keys(this.instances).forEach(k => {
      if (this.instances[k]) {
        this.instances[k].destroy();
        delete this.instances[k];
      }
    });
  },

  /**
   * Render Monthly Cost Savings Trend Bar/Line Chart
   */
  renderSavingsTrendChart(canvasId, trendData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    if (this.instances[canvasId]) {
      this.instances[canvasId].destroy();
    }

    const labels = trendData.map(d => d.month);
    const dataValues = trendData.map(d => d.amount);

    this.instances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Cost Savings (BDT)',
          data: dataValues,
          backgroundColor: [
            'rgba(56, 189, 248, 0.4)',
            'rgba(99, 102, 241, 0.4)',
            'rgba(16, 185, 129, 0.4)',
            'rgba(245, 158, 11, 0.4)',
            'rgba(6, 182, 212, 0.7)'
          ],
          borderColor: [
            '#38BDF8',
            '#6366F1',
            '#10B981',
            '#F59E0B',
            '#06B6D4'
          ],
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` Saving: ${HELPERS.formatBDT(ctx.parsed.y)}`
            }
          }
        },
        scales: {
          y: {
            grid: { color: 'rgba(0, 0, 0, 0.06)' },
            ticks: {
              color: '#334155',
              font: { family: 'Lexend', size: 12, weight: '600' },
              callback: val => HELPERS.formatBDT(val)
            }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#334155', font: { family: 'Lexend', size: 12, weight: '600' } }
          }
        }
      }
    });
  },

  /**
   * Render Category Distribution Doughnut Chart
   */
  renderCategoryChart(canvasId, tasks = []) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    if (this.instances[canvasId]) {
      this.instances[canvasId].destroy();
    }

    const counts = {};
    tasks.forEach(t => {
      const c = t.category || 'Other';
      counts[c] = (counts[c] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const values = Object.values(counts);

    this.instances[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: [
            '#0284C7', '#4F46E5', '#059669', '#D97706', '#DB2777', '#7C3AED', '#2563EB', '#475569', '#0D9488', '#EA580C'
          ],
          borderWidth: 2,
          borderColor: '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#1E293B', font: { family: 'Lexend', size: 12.5, weight: '700' }, boxWidth: 16, padding: 10 }
          }
        }
      }
    });
  },

  /**
   * Render Engineer Contribution Horizontal Bar Chart
   */
  renderEngineerChart(canvasId, tasks = []) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    if (this.instances[canvasId]) {
      this.instances[canvasId].destroy();
    }

    const counts = {};
    tasks.forEach(t => {
      const eng = t.concern_engineer || 'Unassigned';
      counts[eng] = (counts[eng] || 0) + 1;
    });

    const sortedEngineers = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 6);
    const values = sortedEngineers.map(e => counts[e]);

    this.instances[canvasId] = new Chart(canvas, {
      type: 'bar',
      indexAxis: 'y',
      data: {
        labels: sortedEngineers,
        datasets: [{
          data: values,
          backgroundColor: 'rgba(99, 102, 241, 0.6)',
          borderColor: '#6366F1',
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94A3B8', stepSize: 1 } },
          y: { grid: { display: false }, ticks: { color: '#94A3B8', font: { family: 'Lexend' } } }
        }
      }
    });
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardCharts;
} else if (typeof window !== 'undefined') {
  window.DashboardCharts = DashboardCharts;
}
