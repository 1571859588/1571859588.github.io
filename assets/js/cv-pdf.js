/**
 * CV Single-Page Vector PDF Download
 *
 * Injects @media print CSS with LARGER, readable fonts.
 * Bigger fonts → text fills more width per line → dates align close to content.
 * Carefully tuned vertical spacing to fit all content on exactly one A4 page.
 */

function downloadCV(filename) {
  var cvEl = document.getElementById('cv-content');
  if (!cvEl) { alert('CV content not found'); return; }

  // Remove old injected style if any
  var old = document.getElementById('cv-print-override');
  if (old) old.parentNode.removeChild(old);

  var printCSS = [
    '@media print {',

    // ── Page: standard CV margins ──
    '  @page { size: A4; margin: 10mm 16mm; }',

    // ── Hide everything except CV ──
    '  body > *:not(#main) { display: none !important; }',
    '  .masthead, .page__footer, .greedy-nav, nav,',
    '  .sidebar, .author__avatar, .author__content,',
    '  .author__urls-wrapper, #sidebar, .page__title,',
    '  .page__hero, .breadcrumbs, .cv-actions { display: none !important; }',

    // ── Full width layout ──
    '  body {',
    '    margin: 0 !important; padding: 0 !important;',
    '    background: #fff !important;',
    '    -webkit-print-color-adjust: exact !important;',
    '    print-color-adjust: exact !important;',
    '  }',
    '  #main { max-width: 100% !important; margin: 0 !important; padding: 0 !important; float: none !important; width: 100% !important; }',
    '  .archive, .page, .page__inner-wrap, .wrapper { max-width: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; float: none !important; }',

    // ── CV content: readable font sizes ──
    '  #cv-content {',
    '    font-family: "Segoe UI", "Noto Sans SC", "Microsoft YaHei", "PingFang SC", Arial, sans-serif !important;',
    '    font-size: 10px !important;',
    '    line-height: 1.35 !important;',
    '    color: #222 !important;',
    '    max-width: 100% !important;',
    '  }',

    // ── Header ──
    '  .cv-header {',
    '    display: flex !important; align-items: flex-start !important; gap: 10px !important;',
    '    margin-bottom: 4px !important; padding-bottom: 4px !important;',
    '    border-bottom: 2px solid #2e8b9e !important;',
    '  }',
    '  .cv-photo img {',
    '    width: 64px !important; height: 80px !important;',
    '    object-fit: cover !important; border: 1px solid #ccc !important;',
    '  }',
    '  .cv-header-info { flex: 1 !important; }',
    '  .cv-name {',
    '    font-size: 18px !important; font-weight: 700 !important;',
    '    text-align: center !important;',
    '    margin: 0 0 3px 0 !important; padding: 0 !important;',
    '    color: #111 !important; border-bottom: none !important;',
    '  }',
    '  .cv-contact {',
    '    display: flex !important; flex-wrap: wrap !important;',
    '    gap: 1px 12px !important; justify-content: center !important;',
    '    font-size: 9px !important; color: #555 !important;',
    '    margin-bottom: 0 !important;',
    '  }',
    '  .cv-contact span { display: inline-flex !important; align-items: center !important; gap: 3px !important; }',
    '  .cv-contact a { color: #2a7a92 !important; text-decoration: none !important; }',

    // ── Section titles: clear but compact ──
    '  h2.cv-section-title, .cv-section-title {',
    '    font-size: 12px !important; font-weight: 700 !important; color: #1a1a1a !important;',
    '    margin: 5px 0 2px 0 !important; padding-bottom: 1px !important;',
    '    border-bottom: 1.5px solid #2e8b9e !important;',
    '    page-break-after: avoid !important;',
    '  }',

    // ── Entry blocks ──
    '  .cv-entry { margin-bottom: 3px !important; padding-bottom: 0 !important; }',
    '  .cv-entry:last-child { margin-bottom: 0 !important; }',
    '  .cv-entry-header {',
    '    display: flex !important; justify-content: space-between !important;',
    '    align-items: baseline !important; gap: 6px !important;',
    '    margin-bottom: 0 !important;',
    '  }',
    '  .cv-entry-header strong { font-size: 10px !important; font-weight: 600 !important; color: #111 !important; }',
    '  .cv-date { font-size: 9px !important; color: #555 !important; white-space: nowrap !important; }',
    '  .cv-entry-content {',
    '    font-size: 9.5px !important; line-height: 1.32 !important; color: #333 !important;',
    '  }',
    '  .cv-entry-content a { color: #2a7a92 !important; text-decoration: none !important; }',

    // ── Lists ──
    '  ul.cv-list { margin: 0 !important; padding-left: 14px !important; }',
    '  ul.cv-list li { margin-bottom: 0.5px !important; line-height: 1.3 !important; font-size: 9.5px !important; }',
    '  ul.cv-highlights { margin: 1px 0 0 0 !important; padding-left: 14px !important; }',
    '  ul.cv-highlights li { margin-bottom: 0.5px !important; line-height: 1.3 !important; font-size: 9px !important; }',

    // ── Publications ──
    '  .cv-publication { margin-bottom: 2px !important; }',
    '  .cv-publication .cv-entry-content { font-size: 9px !important; line-height: 1.28 !important; }',

    // ── Contribution ──
    '  .cv-contribution {',
    '    margin-top: 1px !important; padding: 2px 5px !important; font-size: 8.5px !important;',
    '    background: #f5f5f5 !important; border-left: 2px solid #2e8b9e !important;',
    '  }',
    '  .cv-contribution ul { margin: 1px 0 0 !important; padding-left: 14px !important; }',
    '  .cv-contribution li { margin-bottom: 0.5px !important; font-size: 8.5px !important; }',

    // ── Links ──
    '  a[href^="http"]:after { content: none !important; }',

    // ── Page breaks ──
    '  .cv-section-title { page-break-after: avoid !important; }',
    '  .cv-entry { page-break-inside: avoid !important; }',

    '}'
  ].join('\n');

  // Inject the print CSS
  var styleEl = document.createElement('style');
  styleEl.id = 'cv-print-override';
  styleEl.textContent = printCSS;
  document.head.appendChild(styleEl);

  window.scrollTo(0, 0);

  setTimeout(function() {
    window.print();
    // Remove injected CSS after dialog closes
    setTimeout(function() {
      var el = document.getElementById('cv-print-override');
      if (el) el.parentNode.removeChild(el);
    }, 1000);
  }, 100);
}
