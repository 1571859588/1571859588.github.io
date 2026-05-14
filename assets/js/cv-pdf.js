/**
 * CV Single-Page PDF Download
 * 
 * Uses html2pdf.js to capture the #cv-content element, apply compact styles,
 * render it to a canvas, and scale it to fit exactly one A4 page.
 */

function downloadCV(filename) {
  var element = document.getElementById('cv-content');
  if (!element) {
    alert('CV content not found');
    return;
  }

  // Clone the element so we can apply print-specific compact styles
  // without affecting the on-screen layout
  var clone = element.cloneNode(true);
  clone.setAttribute('id', 'cv-content-clone');

  // Create a wrapper container that simulates A4 width for proper rendering
  var wrapper = document.createElement('div');
  wrapper.style.cssText = [
    'position: fixed',
    'left: -9999px',
    'top: 0',
    'width: 190mm',          // A4 width (210mm) minus margins (10mm each side)
    'background: #fff',
    'z-index: -9999',
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans SC", sans-serif',
    'color: #333',
    'padding: 0',
    'box-sizing: border-box'
  ].join('; ');

  // Apply compact styles to the clone via inline style overrides
  applyCompactStyles(clone);

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  // A4 dimensions in mm
  var pageWidth = 210;
  var pageHeight = 297;
  var marginX = 8;   // mm
  var marginY = 6;   // mm
  var contentWidth = pageWidth - (marginX * 2);  // usable width
  var contentHeight = pageHeight - (marginY * 2); // usable height

  // Configure html2pdf
  var opt = {
    margin: [marginY, marginX, marginY, marginX],
    filename: filename + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 3,               // High resolution capture
      useCORS: true,
      letterRendering: true,
      width: wrapper.scrollWidth,
      windowWidth: wrapper.scrollWidth
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    },
    // Key: pagebreak mode 'avoid-all' prevents automatic page splitting
    pagebreak: { mode: 'avoid-all' }
  };

  // Use html2pdf to generate the PDF
  // The approach: capture as canvas, measure, scale to fit one page
  html2pdf().set(opt).from(wrapper).toPdf().get('pdf').then(function(pdf) {
    // Get the internal page dimensions
    var pdfWidth = pdf.internal.pageSize.getWidth();
    var pdfHeight = pdf.internal.pageSize.getHeight();
    
    // If there are multiple pages, we need to re-render scaled to one page
    var totalPages = pdf.internal.getNumberOfPages();
    
    if (totalPages > 1) {
      // Re-generate with scaling: capture as single canvas then scale to fit
      document.body.removeChild(wrapper);
      generateScaledPDF(element, filename, marginX, marginY);
      return;
    }
    
    // Single page - clean up and save
    document.body.removeChild(wrapper);
    pdf.save(filename + '.pdf');
  }).catch(function() {
    // Fallback: try scaled approach
    if (document.body.contains(wrapper)) {
      document.body.removeChild(wrapper);
    }
    generateScaledPDF(element, filename, marginX, marginY);
  });
}

/**
 * Fallback: Capture the CV as a single canvas image, then scale it
 * to fit exactly within one A4 page.
 */
function generateScaledPDF(element, filename, marginX, marginY) {
  // Clone and apply compact styles
  var clone = element.cloneNode(true);
  clone.setAttribute('id', 'cv-content-scaled');
  
  var wrapper = document.createElement('div');
  wrapper.style.cssText = [
    'position: fixed',
    'left: -9999px',
    'top: 0',
    'width: 800px',           // Render at a fixed width for consistency
    'background: #fff',
    'z-index: -9999',
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans SC", sans-serif',
    'color: #333',
    'padding: 12px 16px',
    'box-sizing: border-box'
  ].join('; ');

  applyCompactStyles(clone);
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  // Use html2canvas to capture the entire content as one image
  html2canvas(wrapper, {
    scale: 3,
    useCORS: true,
    letterRendering: true,
    width: wrapper.scrollWidth,
    height: wrapper.scrollHeight,
    windowWidth: wrapper.scrollWidth
  }).then(function(canvas) {
    document.body.removeChild(wrapper);

    // Create PDF with A4 dimensions
    var pdf = new jspdf.jsPDF('portrait', 'mm', 'a4');
    var pdfWidth = 210;
    var pdfHeight = 297;
    
    // Usable area after margins
    var usableWidth = pdfWidth - (marginX * 2);
    var usableHeight = pdfHeight - (marginY * 2);
    
    // Calculate scale to fit on one page
    var canvasAspect = canvas.height / canvas.width;
    var imgWidth = usableWidth;
    var imgHeight = imgWidth * canvasAspect;
    
    // If the content is taller than the page, scale down to fit
    if (imgHeight > usableHeight) {
      imgHeight = usableHeight;
      imgWidth = imgHeight / canvasAspect;
    }
    
    // Center horizontally if needed
    var offsetX = marginX + (usableWidth - imgWidth) / 2;
    var offsetY = marginY;
    
    var imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', offsetX, offsetY, imgWidth, imgHeight);
    pdf.save(filename + '.pdf');
  }).catch(function(err) {
    if (document.body.contains(wrapper)) {
      document.body.removeChild(wrapper);
    }
    console.error('PDF generation failed:', err);
    // Ultimate fallback: browser print
    window.print();
  });
}

/**
 * Apply compact inline styles to the cloned CV element for PDF rendering.
 * This ensures tight spacing and small fonts regardless of the site's CSS.
 */
function applyCompactStyles(container) {
  // Overall container
  container.style.cssText = 'font-size: 11px; line-height: 1.3; color: #333; max-width: 100%;';

  // Section titles
  var sectionTitles = container.querySelectorAll('.cv-section-title');
  for (var i = 0; i < sectionTitles.length; i++) {
    sectionTitles[i].style.cssText = 'font-size: 14px; font-weight: 600; margin: 8px 0 4px 0; padding-bottom: 2px; border-bottom: 2px solid #52adc8; color: #333;';
  }

  // CV name
  var name = container.querySelector('.cv-name');
  if (name) {
    name.style.cssText = 'font-size: 20px; font-weight: 700; margin: 0 0 4px 0; padding: 0; text-align: center; border: none;';
  }

  // CV header
  var header = container.querySelector('.cv-header');
  if (header) {
    header.style.cssText = 'display: flex; align-items: flex-start; gap: 12px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 3px solid #52adc8;';
  }

  // CV photo
  var photoImg = container.querySelector('.cv-photo img');
  if (photoImg) {
    photoImg.style.cssText = 'width: 75px; height: 95px; object-fit: cover; border: 1px solid #ddd;';
  }

  // Contact
  var contact = container.querySelector('.cv-contact');
  if (contact) {
    contact.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px 14px; margin-bottom: 2px; font-size: 10px; color: #666;';
  }

  // Entries
  var entries = container.querySelectorAll('.cv-entry');
  for (var i = 0; i < entries.length; i++) {
    entries[i].style.cssText = 'margin-bottom: 4px; padding-bottom: 2px;';
  }

  // Entry headers
  var entryHeaders = container.querySelectorAll('.cv-entry-header');
  for (var i = 0; i < entryHeaders.length; i++) {
    entryHeaders[i].style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1px; gap: 4px;';
  }

  // Dates
  var dates = container.querySelectorAll('.cv-date');
  for (var i = 0; i < dates.length; i++) {
    dates[i].style.cssText = 'font-size: 10px; color: #888; white-space: nowrap;';
  }

  // Entry content
  var entryContents = container.querySelectorAll('.cv-entry-content');
  for (var i = 0; i < entryContents.length; i++) {
    entryContents[i].style.cssText = 'font-size: 10.5px; line-height: 1.3; color: #333;';
  }

  // Lists (research interests, awards, skills)
  var cvLists = container.querySelectorAll('.cv-list');
  for (var i = 0; i < cvLists.length; i++) {
    cvLists[i].style.cssText = 'margin: 0; padding-left: 16px;';
    var items = cvLists[i].querySelectorAll('li');
    for (var j = 0; j < items.length; j++) {
      items[j].style.cssText = 'margin-bottom: 1px; line-height: 1.25; font-size: 10.5px;';
    }
  }

  // Highlights (project and internship bullet points)
  var highlights = container.querySelectorAll('.cv-highlights');
  for (var i = 0; i < highlights.length; i++) {
    highlights[i].style.cssText = 'margin: 2px 0 0 0; padding-left: 16px;';
    var items = highlights[i].querySelectorAll('li');
    for (var j = 0; j < items.length; j++) {
      items[j].style.cssText = 'margin-bottom: 1px; line-height: 1.25; font-size: 10px;';
    }
  }

  // Publication entries
  var pubs = container.querySelectorAll('.cv-publication .cv-entry-content');
  for (var i = 0; i < pubs.length; i++) {
    pubs[i].style.cssText = 'font-size: 10.5px; line-height: 1.25;';
  }

  // Contribution blocks
  var contributions = container.querySelectorAll('.cv-contribution');
  for (var i = 0; i < contributions.length; i++) {
    contributions[i].style.cssText = 'margin-top: 2px; padding: 3px 6px; font-size: 10px; background: #f8f9fa; border-left: 2px solid #52adc8;';
  }

  // Links — make them black for print-like appearance
  var links = container.querySelectorAll('a');
  for (var i = 0; i < links.length; i++) {
    links[i].style.cssText = 'color: #333; text-decoration: none;';
  }
}
