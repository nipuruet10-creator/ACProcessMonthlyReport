/**
 * Process Development Monthly Report Automation System
 * Module: SlidesEngine - Google Slides Monthly Report Deck Generator
 * WALTON Hi-Tech Industries PLC
 */

const SlidesEngine = {
  createMonthlyReportDeck(payload) {
    // payload: { month, engineerGroups: [ { engineer, tasks: [...] } ], kpis: {...} }
    const month = payload.month || 'August 2026';
    const presentationTitle = `AC_Process_Monthly_Report_${month.replace(/\s+/g, '_')}`;
    
    // Create new Google Slides presentation
    const presentation = SlidesApp.create(presentationTitle);
    const slides = presentation.getSlides();
    const coverSlide = slides[0]; // First slide as cover

    // Configure Cover Slide (16:9 Lexend)
    coverSlide.getBackground().setSolidFill('#090D16');
    const titleBox = coverSlide.insertTextBox(`MONTHLY REPORT - ${month.toUpperCase()}\nPROCESS DEVELOPMENT DEPARTMENT (AC)`, 80, 200, 800, 150);
    titleBox.getText().getTextStyle().setFontFamily('Lexend').setFontSize(28).setForegroundColor('#38BDF8').setBold(true);

    const subBox = coverSlide.insertTextBox('WALTON Hi-Tech Industries PLC', 80, 360, 600, 50);
    subBox.getText().getTextStyle().setFontFamily('Lexend').setFontSize(16).setForegroundColor('#94A3B8');

    // Build 1 Main Slide per Engineer
    payload.engineerGroups.forEach(group => {
      const engSlide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
      engSlide.getBackground().setSolidFill('#0F172A');

      // Header Bar
      const headerBox = engSlide.insertTextBox(`${group.engineer} | ${month}`, 50, 30, 800, 50);
      headerBox.getText().getTextStyle().setFontFamily('Lexend').setFontSize(20).setForegroundColor('#38BDF8').setBold(true);

      const deptBox = engSlide.insertTextBox('Process Development Department | WALTON', 50, 75, 600, 30);
      deptBox.getText().getTextStyle().setFontFamily('Lexend').setFontSize(11).setForegroundColor('#94A3B8');

      // Layout task cards
      let yOffset = 120;
      group.tasks.forEach((task, idx) => {
        const cardBox = engSlide.insertTextBox(`• ${task.ai_report_title || task.task_name}\n  ${task.ai_report_description || task.task_details}\n  Impact: ${task.ai_report_impact || task.impact}`, 50, yOffset, 650, 100);
        cardBox.getText().getTextStyle().setFontFamily('Lexend').setFontSize(11).setForegroundColor('#F1F5F9');
        yOffset += 115;
      });
    });

    const file = DriveApp.getFileById(presentation.getId());
    const folder = DriveStorage.getReportFolder();
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);

    return {
      success: true,
      presentationId: presentation.getId(),
      presentationUrl: presentation.getUrl(),
      pdfUrl: `https://docs.google.com/presentation/d/${presentation.getId()}/export/pdf`
    };
  }
};
