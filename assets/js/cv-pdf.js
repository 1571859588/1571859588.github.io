/**
 * CV Single-Page Vector PDF Download
 *
 * Injects aggressive @media print CSS into the CURRENT page,
 * calls window.print(), then removes the injected CSS.
 * Because the browser prints real DOM text, output is always vector & selectable.
 */

function downloadCV(filename) {
  var cvEl = document.getElementById('cv-content');
  if (!cvEl) { alert('CV content not found'); return; }

  // Build print-only CSS that overrides everything
  var printCSS = [
    '@media print {',

    // ── Page setup ──
    '  @page { size: A4; margin: 10mm 15mm; }',

    // ── Hide everything except CV content ──
    '  body * { visibility: hidden !important; }',
    '  #cv-content, #cv-content * { visibility: visible !important; }',
    '  .cv-actions { display: none !important; }',
    '  .masthead, .page__footer, .greedy-nav, nav,',
    '  .sidebar, .author__avatar, .author__content,',
    '  .author__urls-wrapper, #sidebar, .page__title,',
    '  .page__hero, .breadcrumbs { display: none !important; }',

    // ── Position CV content to fill the page ──
    '  #cv-content {',
    '    position: fixed !important;',
    '    left: 0 !important; top: 0 !important;',
    '    width: 100% !important;',
    '    padding: 0 !important; margin: 0 !important;',
    '  }',

    // ── Global typography ──
    '  body {',
    '    font-family: "Segoe UI", "Noto Sans SC", "Microsoft YaHei", Arial, sans-serif !important;',
    '    font-size: 8.5px !important;',
    '    line-height: 1.28 !important;',
    '    color: #222 !important;',
    '    background: #fff !important;',
    '    -webkit-print-color-adjust: exact !important;',
    '    print-color-adjust: exact !important;',
    '  }',

    // ── Header ──
    '  .cv-header {',
    '    display: flex !important; align-items: flex-start !important; gap: 10px !important;',
    '    margin-bottom: 4px !important; padding-bottom: 3px !important;',
    '    border-bottom: 2px solid #2e8b9e !important;',
    '  }',
    '  .cv-photo img {',
    '    width: 60px !important; height: 75px !important;',
    '    object-fit: cover !important; border: 1px solid #ccc !important;',
    '  }',
    '  .cv-header-info { flex: 1 !important; }',
    '  .cv-name {',
    '    font-size: 16px !important; font-weight: 700 !important;',
    '    text-align: center !important;',
    '    margin: 0 0 2px 0 !important; padding: 0 !important;',
    '    color: #111 !important; border-bottom: none !important;',
    '  }',
    '  .cv-contact {',
    '    display: flex !important; flex-wrap: wrap !important;',
    '    gap: 1px 10px !important; justify-content: center !important;',
    '    font-size: 7.5px !important; color: #555 !important;',
    '    margin-bottom: 0 !important;',
    '  }',
    '  .cv-contact span { display: inline-flex !important; align-items: center !important; gap: 2px !important; }',
    '  .cv-contact a { color: #2a7a92 !important; text-decoration: none !important; }',
    '  .cv-contact i { font-size: 7px !important; }',

    // ── Section titles ──
    '  h2.cv-section-title, .cv-section-title {',
    '    font-size: 10.5px !important; font-weight: 700 !important; color: #1a1a1a !important;',
    '    margin: 5px 0 2px 0 !important; padding-bottom: 1px !important;',
    '    border-bottom: 1.5px solid #2e8b9e !important;',
    '    page-break-after: avoid !important;',
    '  }',

    // ── Entries ──
    '  .cv-entry { margin-bottom: 2px !important; padding-bottom: 0 !important; }',
    '  .cv-entry:last-child { margin-bottom: 0 !important; }',
    '  .cv-entry-header {',
    '    display: flex !important; justify-content: space-between !important;',
    '    align-items: baseline !important; gap: 4px !important;',
    '    margin-bottom: 0 !important;',
    '  }',
    '  .cv-entry-header strong { font-size: 9px !important; color: #111 !important; }',
    '  .cv-date { font-size: 8px !important; color: #555 !important; white-space: nowrap !important; }',
    '  .cv-entry-content {',
    '    font-size: 8px !important; line-height: 1.28 !important; color: #333 !important;',
    '  }',
    '  .cv-entry-content a { color: #2a7a92 !important; text-decoration: none !important; }',

    // ── Lists ──
    '  ul.cv-list { margin: 0 !important; padding-left: 13px !important; }',
    '  ul.cv-list li { margin-bottom: 0.3px !important; line-height: 1.22 !important; font-size: 8px !important; }',
    '  ul.cv-highlights { margin: 0.5px 0 0 0 !important; padding-left: 13px !important; }',
    '  ul.cv-highlights li { margin-bottom: 0.3px !important; line-height: 1.22 !important; font-size: 7.5px !important; }',

    // ── Publications ──
    '  .cv-publication { margin-bottom: 1px !important; }',
    '  .cv-publication .cv-entry-content { font-size: 7.5px !important; line-height: 1.22 !important; }',

    // ── Contribution ──
    '  .cv-contribution {',
    '    margin-top: 1px !important; padding: 1px 4px !important; font-size: 7px !important;',
    '    background: #f5f5f5 !important; border-left: 1.5px solid #2e8b9e !important;',
    '  }',
    '  .cv-contribution ul { margin: 0.5px 0 0 !important; padding-left: 12px !important; }',
    '  .cv-contribution li { margin-bottom: 0.3px !important; font-size: 7px !important; }',

    // ── Links: no URL expansion ──
    '  a[href^="http"]:after { content: none !important; }',

    // ── Prevent page breaks ──
    '  .cv-section-title { page-break-after: avoid !important; }',
    '  .cv-entry { page-break-inside: avoid !important; }',

    '}'  // end @media print
  ].join('\n');

  // Inject the print CSS
  var styleEl = document.createElement('style');
  styleEl.id = 'cv-print-override';
  styleEl.textContent = printCSS;
  document.head.appendChild(styleEl);

  // Scroll to top
  window.scrollTo(0, 0);

  // Small delay to let styles apply, then print
  setTimeout(function() {
    window.print();

    // Remove injected CSS after print dialog closes
    setTimeout(function() {
      var el = document.getElementById('cv-print-override');
      if (el) el.parentNode.removeChild(el);
    }, 1000);
  }, 100);
}
