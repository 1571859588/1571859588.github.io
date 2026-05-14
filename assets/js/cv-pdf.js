/**
 * CV Single-Page Vector PDF Download
 *
 * Extracts CV content from the DOM, builds a clean HTML page with
 * narrow content area so dates align close to the longest text line.
 * Opens in a new window for print → vector PDF.
 */

function downloadCV(filename) {
  var cvEl = document.getElementById('cv-content');
  if (!cvEl) { alert('CV content not found'); return; }

  var clone = cvEl.cloneNode(true);
  var remove = clone.querySelectorAll('script, .cv-actions');
  for (var i = 0; i < remove.length; i++) remove[i].parentNode.removeChild(remove[i]);

  var css = [
    // ── Page setup: wide side margins → narrow content area ──
    '@page {',
    '  size: A4;',
    '  margin: 8mm 28mm;',   // 28mm sides → content width ~154mm, dates hug the text
    '}',
    '@media print {',
    '  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
    '}',
    '* { margin: 0; padding: 0; box-sizing: border-box; }',
    'body {',
    '  font-family: "Segoe UI", "Noto Sans SC", "Microsoft YaHei", "PingFang SC", Arial, sans-serif;',
    '  font-size: 8.5px;',
    '  line-height: 1.28;',
    '  color: #222;',
    '  background: #fff;',
    '}',

    // ── Header ──
    '.cv-header {',
    '  display: flex; align-items: flex-start; gap: 8px;',
    '  margin-bottom: 3px; padding-bottom: 3px;',
    '  border-bottom: 2px solid #2e8b9e;',
    '}',
    '.cv-photo img { width: 58px; height: 72px; object-fit: cover; border: 1px solid #ccc; }',
    '.cv-header-info { flex: 1; }',
    '.cv-name {',
    '  font-size: 15px; font-weight: 700; text-align: center;',
    '  margin: 0 0 2px; color: #111;',
    '}',
    '.cv-contact {',
    '  display: flex; flex-wrap: wrap; gap: 1px 8px;',
    '  justify-content: center;',
    '  font-size: 7.5px; color: #555;',
    '}',
    '.cv-contact span { display: inline-flex; align-items: center; gap: 2px; }',
    '.cv-contact a { color: #2a7a92; text-decoration: none; }',
    '.cv-contact i { font-size: 7px; }',

    // ── Section titles ──
    '.cv-section-title {',
    '  font-size: 10.5px; font-weight: 700; color: #1a1a1a;',
    '  margin: 4px 0 1.5px; padding-bottom: 1px;',
    '  border-bottom: 1.5px solid #2e8b9e;',
    '}',

    // ── Entries ──
    '.cv-entry { margin-bottom: 2px; }',
    '.cv-entry:last-child { margin-bottom: 0; }',
    '.cv-entry-header {',
    '  display: flex; justify-content: space-between;',
    '  align-items: baseline; gap: 4px; margin-bottom: 0;',
    '}',
    '.cv-entry-header strong { font-size: 9px; color: #111; }',
    '.cv-date { font-size: 8px; color: #555; white-space: nowrap; }',
    '.cv-entry-content { font-size: 8px; line-height: 1.28; color: #333; }',
    '.cv-entry-content em { font-style: italic; }',
    '.cv-entry-content a { color: #2a7a92; text-decoration: none; }',

    // ── Lists ──
    'ul.cv-list { margin: 0; padding-left: 12px; list-style: disc; }',
    'ul.cv-list li { margin-bottom: 0.3px; line-height: 1.22; font-size: 8px; }',
    'ul.cv-highlights { margin: 0.5px 0 0; padding-left: 12px; list-style: disc; }',
    'ul.cv-highlights li { margin-bottom: 0.3px; line-height: 1.22; font-size: 7.5px; }',

    // ── Publications ──
    '.cv-publication { margin-bottom: 1px; }',
    '.cv-publication .cv-entry-content { font-size: 7.5px; line-height: 1.22; }',

    // ── Contribution ──
    '.cv-contribution {',
    '  margin-top: 1px; padding: 1px 4px; font-size: 7px;',
    '  background: #f5f5f5; border-left: 1.5px solid #2e8b9e;',
    '}',
    '.cv-contribution ul { margin: 0.5px 0 0; padding-left: 12px; }',
    '.cv-contribution li { margin-bottom: 0.3px; font-size: 7px; }',

    // ── FA icons ──
    '.fa { font-size: 7px; margin-right: 1px; }'
  ].join('\n');

  var faLink = '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">';

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

  var w = window.open('', '_blank', 'width=700,height=900');
  if (!w) {
    alert('请允许弹出窗口后重试 / Please allow popups and try again');
    return;
  }

  w.document.open();
  w.document.write(html);
  w.document.close();

  var printed = false;
  w.onload = function() {
    if (printed) return;
    printed = true;
    setTimeout(function() { w.focus(); w.print(); }, 500);
  };
  setTimeout(function() {
    if (!printed && !w.closed) {
      printed = true;
      try { w.focus(); w.print(); } catch(e) {}
    }
  }, 3000);
}
