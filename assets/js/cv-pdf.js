/**
 * CV Single-Page Vector PDF Download
 *
 * Extracts CV content from the DOM, builds a clean minimal HTML page
 * with very compact CSS, opens it in a new window, and triggers print.
 * The result is a vector PDF with selectable text.
 */

function downloadCV(filename) {
  var cvEl = document.getElementById('cv-content');
  if (!cvEl) { alert('CV content not found'); return; }

  // Clone and clean the content
  var clone = cvEl.cloneNode(true);

  // Remove any scripts, buttons, or non-content elements
  var scripts = clone.querySelectorAll('script, .cv-actions');
  for (var i = 0; i < scripts.length; i++) {
    scripts[i].parentNode.removeChild(scripts[i]);
  }

  // Build compact CSS for single-page A4
  var css = [
    '@page { size: A4; margin: 6mm 8mm; }',
    '@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }',
    '* { margin: 0; padding: 0; box-sizing: border-box; }',
    'body {',
    '  font-family: "Segoe UI", "Noto Sans SC", "Microsoft YaHei", Arial, sans-serif;',
    '  font-size: 9px;',
    '  line-height: 1.28;',
    '  color: #222;',
    '  background: #fff;',
    '  max-width: 100%;',
    '  padding: 0;',
    '}',
    // Header
    '.cv-header {',
    '  display: flex; align-items: flex-start; gap: 10px;',
    '  margin-bottom: 5px; padding-bottom: 4px;',
    '  border-bottom: 2px solid #3a9cba;',
    '}',
    '.cv-photo img { width: 68px; height: 85px; object-fit: cover; border: 1px solid #ddd; }',
    '.cv-header-info { flex: 1; }',
    '.cv-name {',
    '  font-size: 17px; font-weight: 700; text-align: center;',
    '  margin: 0 0 3px 0; padding: 0; color: #111;',
    '}',
    '.cv-contact {',
    '  display: flex; flex-wrap: wrap; gap: 2px 12px;',
    '  font-size: 8.5px; color: #555; justify-content: center;',
    '}',
    '.cv-contact span { display: inline-flex; align-items: center; gap: 3px; }',
    '.cv-contact a { color: #2a7a92; text-decoration: none; }',
    '.cv-contact i { font-size: 8px; }',
    // Section titles
    'h2.cv-section-title, .cv-section-title {',
    '  font-size: 11.5px; font-weight: 600; color: #222;',
    '  margin: 5px 0 2px 0; padding-bottom: 1.5px;',
    '  border-bottom: 1.5px solid #3a9cba;',
    '}',
    // Entries
    '.cv-entry { margin-bottom: 2.5px; }',
    '.cv-entry:last-child { margin-bottom: 0; }',
    '.cv-entry-header {',
    '  display: flex; justify-content: space-between;',
    '  align-items: baseline; gap: 4px; margin-bottom: 0.5px;',
    '}',
    '.cv-entry-header strong { font-size: 9.5px; color: #111; }',
    '.cv-date { font-size: 8.5px; color: #666; white-space: nowrap; }',
    '.cv-entry-content { font-size: 8.5px; line-height: 1.28; color: #333; }',
    '.cv-entry-content em { font-style: italic; }',
    '.cv-entry-content a { color: #2a7a92; text-decoration: none; }',
    // Lists
    'ul.cv-list { margin: 0; padding-left: 14px; list-style: disc; }',
    'ul.cv-list li { margin-bottom: 0.5px; line-height: 1.25; font-size: 8.5px; }',
    'ul.cv-highlights { margin: 1px 0 0 0; padding-left: 14px; list-style: disc; }',
    'ul.cv-highlights li { margin-bottom: 0.5px; line-height: 1.25; font-size: 8px; }',
    // Publications
    '.cv-publication { margin-bottom: 2px; }',
    '.cv-publication .cv-entry-content { font-size: 8.5px; line-height: 1.25; }',
    // Contribution
    '.cv-contribution {',
    '  margin-top: 1px; padding: 2px 5px; font-size: 8px;',
    '  background: #f5f5f5; border-left: 2px solid #3a9cba;',
    '}',
    '.cv-contribution ul { margin: 1px 0 0; padding-left: 14px; }',
    '.cv-contribution li { margin-bottom: 0.5px; font-size: 7.5px; }',
    // Font Awesome icons - hide if not loaded
    '.fa { font-size: 8px; margin-right: 2px; }'
  ].join('\n');

  // Get the Font Awesome CSS link from the main page (if any)
  var faLinks = '';
  var allLinks = document.querySelectorAll('link[rel="stylesheet"]');
  for (var i = 0; i < allLinks.length; i++) {
    var href = allLinks[i].getAttribute('href') || '';
    if (href.indexOf('font-awesome') !== -1 || href.indexOf('fontawesome') !== -1) {
      faLinks += '<link rel="stylesheet" href="' + allLinks[i].href + '">';
    }
  }

  // If no font-awesome link found, add a CDN fallback
  if (!faLinks) {
    faLinks = '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">';
  }

  // Build the full HTML document
  var html = [
    '<!DOCTYPE html>',
    '<html><head>',
    '<meta charset="utf-8">',
    '<title>' + filename + '</title>',
    faLinks,
    '<style>' + css + '</style>',
    '</head><body>',
    clone.innerHTML,
    '</body></html>'
  ].join('\n');

  // Open a new window and write the clean HTML
  var printWindow = window.open('', '_blank', 'width=800,height=1000');
  if (!printWindow) {
    alert('请允许弹出窗口后重试 / Please allow popups and try again');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for resources (fonts, images) to load, then print
  printWindow.onload = function() {
    setTimeout(function() {
      printWindow.focus();
      printWindow.print();
      // Close after a delay to allow print dialog to complete
      setTimeout(function() { printWindow.close(); }, 1000);
    }, 300);
  };

  // Fallback: if onload doesn't fire (some browsers), try after a delay
  setTimeout(function() {
    if (!printWindow.closed) {
      try {
        printWindow.focus();
        printWindow.print();
      } catch(e) {}
    }
  }, 2000);
}
