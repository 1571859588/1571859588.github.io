/**
 * CV Single-Page Vector PDF Download
 *
 * Extracts CV content from the DOM, builds a clean minimal HTML page
 * with compact CSS in a narrower centered layout, opens a new window,
 * and triggers print → "Microsoft Print to PDF" for vector output.
 */

function downloadCV(filename) {
  var cvEl = document.getElementById('cv-content');
  if (!cvEl) { alert('CV content not found'); return; }

  // Clone and clean the content
  var clone = cvEl.cloneNode(true);
  var scripts = clone.querySelectorAll('script, .cv-actions');
  for (var i = 0; i < scripts.length; i++) {
    scripts[i].parentNode.removeChild(scripts[i]);
  }

  // Build compact CSS — narrower layout with proper margins
  var css = [
    '@page {',
    '  size: A4;',
    '  margin: 10mm 18mm;',  // Wider side margins → narrower content → professional look
    '}',
    '@media print {',
    '  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
    '}',
    '* { margin: 0; padding: 0; box-sizing: border-box; }',
    'body {',
    '  font-family: "Segoe UI", "Noto Sans SC", "Microsoft YaHei", "PingFang SC", Arial, Helvetica, sans-serif;',
    '  font-size: 9px;',
    '  line-height: 1.3;',
    '  color: #222;',
    '  background: #fff;',
    '}',

    // ── Header ──
    '.cv-header {',
    '  display: flex; align-items: flex-start; gap: 10px;',
    '  margin-bottom: 4px; padding-bottom: 4px;',
    '  border-bottom: 2.5px solid #2e8b9e;',
    '}',
    '.cv-photo img {',
    '  width: 64px; height: 80px; object-fit: cover; border: 1px solid #ccc;',
    '}',
    '.cv-header-info { flex: 1; }',
    '.cv-name {',
    '  font-size: 16px; font-weight: 700; text-align: center;',
    '  margin: 0 0 3px; color: #111;',
    '}',
    '.cv-contact {',
    '  display: flex; flex-wrap: wrap; gap: 1px 10px;',
    '  justify-content: center;',
    '  font-size: 8px; color: #555;',
    '}',
    '.cv-contact span { display: inline-flex; align-items: center; gap: 2px; }',
    '.cv-contact a { color: #2a7a92; text-decoration: none; }',
    '.cv-contact i { font-size: 7px; }',

    // ── Section titles ──
    '.cv-section-title {',
    '  font-size: 11px; font-weight: 700; color: #1a1a1a;',
    '  margin: 5px 0 2px; padding-bottom: 1px;',
    '  border-bottom: 1.5px solid #2e8b9e;',
    '}',

    // ── Entries ──
    '.cv-entry { margin-bottom: 2px; }',
    '.cv-entry:last-child { margin-bottom: 0; }',
    '.cv-entry-header {',
    '  display: flex; justify-content: space-between;',
    '  align-items: baseline; gap: 6px; margin-bottom: 0;',
    '}',
    '.cv-entry-header strong { font-size: 9px; color: #111; }',
    '.cv-date { font-size: 8px; color: #666; white-space: nowrap; }',
    '.cv-entry-content {',
    '  font-size: 8.5px; line-height: 1.3; color: #333;',
    '}',
    '.cv-entry-content em { font-style: italic; }',
    '.cv-entry-content a { color: #2a7a92; text-decoration: none; }',

    // ── Lists ──
    'ul.cv-list { margin: 0; padding-left: 13px; list-style: disc; }',
    'ul.cv-list li {',
    '  margin-bottom: 0.5px; line-height: 1.25; font-size: 8.5px;',
    '}',
    'ul.cv-highlights {',
    '  margin: 1px 0 0; padding-left: 13px; list-style: disc;',
    '}',
    'ul.cv-highlights li {',
    '  margin-bottom: 0.5px; line-height: 1.25; font-size: 8px;',
    '}',

    // ── Publications ──
    '.cv-publication { margin-bottom: 1.5px; }',
    '.cv-publication .cv-entry-content {',
    '  font-size: 8px; line-height: 1.25;',
    '}',

    // ── Contribution ──
    '.cv-contribution {',
    '  margin-top: 1px; padding: 2px 4px; font-size: 7.5px;',
    '  background: #f5f5f5; border-left: 2px solid #2e8b9e;',
    '}',
    '.cv-contribution ul { margin: 1px 0 0; padding-left: 13px; }',
    '.cv-contribution li { margin-bottom: 0.5px; font-size: 7.5px; }',

    // ── FA icons ──
    '.fa { font-size: 7px; margin-right: 1px; }'
  ].join('\n');

  // Get Font Awesome CSS
  var faLink = '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">';

  // Build the HTML document
  var html = [
    '<!DOCTYPE html>',
    '<html><head>',
    '<meta charset="utf-8">',
    '<title>' + filename + '</title>',
    faLink,
    '<style>' + css + '</style>',
    '</head><body>',
    clone.innerHTML,
    '</body></html>'
  ].join('\n');

  // Open new window
  var w = window.open('', '_blank', 'width=800,height=1000');
  if (!w) {
    alert('请允许弹出窗口后重试 / Please allow popups and try again');
    return;
  }

  w.document.open();
  w.document.write(html);
  w.document.close();

  // Print after resources load
  var printed = false;
  w.onload = function() {
    if (printed) return;
    printed = true;
    setTimeout(function() {
      w.focus();
      w.print();
    }, 500);
  };

  // Fallback timer
  setTimeout(function() {
    if (!printed && !w.closed) {
      printed = true;
      try { w.focus(); w.print(); } catch(e) {}
    }
  }, 3000);
}
