/**
 * CV Single-Page Vector PDF Download
 *
 * Injects @media print CSS. Two modes:
 *   - research (default): the original PhD-application single-page layout.
 *   - job: employment-oriented — denser type, demoted academic weight,
 *     grouped awards, compressed trailing publications, muted supervisor.
 *
 * Mode is read from <div id="cv-content" data-mode="...">. The downloadCV
 * signature is unchanged; job pages pass a mode-suffixed filename.
 */

function downloadCV(filename) {
  var cvEl = document.getElementById('cv-content');
  if (!cvEl) { alert('CV content not found'); return; }

  var mode = (cvEl.getAttribute('data-mode') || 'research').toLowerCase();

  // Remove old injected style if any
  var old = document.getElementById('cv-print-override');
  if (old) old.parentNode.removeChild(old);

  // ── Shared base rules (both modes) ──
  var base = [
    '@media print {',
    '  @page { size: A4; margin: 10mm 16mm; }',
    '  body > *:not(#main) { display: none !important; }',
    '  .masthead, .page__footer, .greedy-nav, nav,',
    '  .sidebar, .author__avatar, .author__content,',
    '  .author__urls-wrapper, #sidebar, .page__title,',
    '  .page__hero, .breadcrumbs, .cv-actions, .cv-track-selector { display: none !important; }',
    '  body {',
    '    margin: 0 !important; padding: 0 !important;',
    '    background: #fff !important;',
    '    -webkit-print-color-adjust: exact !important;',
    '    print-color-adjust: exact !important;',
    '  }',
    '  #main { max-width: 100% !important; margin: 0 !important; padding: 0 !important; float: none !important; width: 100% !important; }',
    '  .archive, .page, .page__inner-wrap, .wrapper { max-width: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; float: none !important; }',
    '  a[href^="http"]:after { content: none !important; }',
    '  .cv-section-title { page-break-after: avoid !important; }',
    '  .cv-entry { page-break-inside: avoid !important; }'
  ];

  // ── Research-mode rules (original, larger readable fonts) ──
  var researchSpecific = [
    '  #cv-content {',
    '    font-family: "Segoe UI", "Noto Sans SC", "Microsoft YaHei", "PingFang SC", Arial, sans-serif !important;',
    '    font-size: 10px !important;',
    '    line-height: 1.35 !important;',
    '    color: #222 !important;',
    '    max-width: 100% !important;',
    '  }',
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
    '  h2.cv-section-title, .cv-section-title {',
    '    font-size: 12px !important; font-weight: 700 !important; color: #1a1a1a !important;',
    '    margin: 5px 0 2px 0 !important; padding-bottom: 1px !important;',
    '    border-bottom: 1.5px solid #2e8b9e !important;',
    '  }',
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
    '  ul.cv-list { margin: 0 !important; padding-left: 14px !important; }',
    '  ul.cv-list li { margin-bottom: 0.5px !important; line-height: 1.3 !important; font-size: 9.5px !important; }',
    '  ul.cv-highlights { margin: 1px 0 0 0 !important; padding-left: 14px !important; }',
    '  ul.cv-highlights li { margin-bottom: 0.5px !important; line-height: 1.3 !important; font-size: 9px !important; }',
    '  .cv-publication { margin-bottom: 2px !important; }',
    '  .cv-publication .cv-entry-content { font-size: 9px !important; line-height: 1.28 !important; }',
    '  .cv-contribution {',
    '    margin-top: 1px !important; padding: 2px 5px !important; font-size: 8.5px !important;',
    '    background: #f5f5f5 !important; border-left: 2px solid #2e8b9e !important;',
    '  }',
    '  .cv-contribution ul { margin: 1px 0 0 !important; padding-left: 14px !important; }',
    '  .cv-contribution li { margin-bottom: 0.5px !important; font-size: 8.5px !important; }'
  ];

  // ── Job-mode rules (employment-oriented, denser, single A4) ──
  var jobSpecific = [
    '  #cv-content {',
    '    font-family: "Segoe UI", "Noto Sans SC", "Microsoft YaHei", "PingFang SC", Arial, sans-serif !important;',
    '    font-size: 8.5px !important;',
    '    line-height: 1.25 !important;',
    '    color: #222 !important;',
    '    max-width: 100% !important;',
    '  }',
    '  .cv-header--job {',
    '    display: flex !important; align-items: flex-start !important; gap: 8px !important;',
    '    margin-bottom: 5px !important; padding-bottom: 5px !important;',
    '    border-bottom: 2px solid #2e8b9e !important;',
    '  }',
    '  .cv-photo--job { flex-shrink: 0 !important; }',
    '  .cv-photo--job img {',
    '    width: 56px !important; height: 70px !important;',
    '    object-fit: cover !important; border: 1px solid #ccc !important;',
    '  }',
    '  .cv-header-info { flex: 1 !important; }',
    '  .cv-name {',
    '    font-size: 17px !important; font-weight: 700 !important; text-align: center !important;',
    '    margin: 0 0 3px 0 !important; padding: 0 !important; color: #111 !important;',
    '    border-bottom: none !important;',
    '  }',
    '  .cv-contact--job {',
    '    display: flex !important; flex-wrap: wrap !important; justify-content: center !important;',
    '    gap: 0 5px !important; font-size: 8.5px !important; color: #555 !important;',
    '    margin-bottom: 3px !important;',
    '  }',
    '  .cv-contact--job a { color: #2a7a92 !important; text-decoration: none !important; }',
    '  .cv-contact-sep { color: #bbb !important; }',
    '  .cv-objective { font-size: 9px !important; color: #333 !important; margin-top: 0 !important;',
    '    text-align: center !important; }',
    '  .cv-objective-label { color: #2a7a92 !important; font-weight: 700 !important; }',
    '  h2.cv-section-title, .cv-section-title {',
    '    font-size: 11px !important; font-weight: 700 !important; color: #1a1a1a !important;',
    '    margin: 6px 0 3px 0 !important; padding-bottom: 1px !important;',
    '    border-bottom: 1.5px solid #2e8b9e !important;',
    '  }',
    '  .cv-section-title--minor {',
    '    font-size: 9px !important; color: #777 !important; border-bottom: 1px solid #ddd !important;',
    '    margin-top: 4px !important;',
    '  }',
    '  .cv-list--inline { display: flex !important; flex-wrap: wrap !important; gap: 0 8px !important; padding-left: 0 !important; }',
    '  .cv-list--inline li { font-size: 8px !important; color: #555 !important; }',
    '  .cv-entry { margin-bottom: 3px !important; padding-bottom: 0 !important; }',
    '  .cv-entry:last-child { margin-bottom: 0 !important; }',
    '  .cv-entry-header {',
    '    display: flex !important; justify-content: space-between !important;',
    '    align-items: baseline !important; gap: 6px !important; margin-bottom: 0 !important;',
    '  }',
    '  .cv-entry-header strong { font-size: 9px !important; font-weight: 600 !important; color: #111 !important; }',
    '  .cv-date { font-size: 8px !important; color: #555 !important; white-space: nowrap !important; }',
    '  .cv-entry-content { font-size: 8.5px !important; line-height: 1.3 !important; color: #333 !important; }',
    '  .cv-entry-content a { color: #2a7a92 !important; text-decoration: none !important; }',
    '  .cv-positioning { font-size: 8px !important; color: #444 !important; margin-bottom: 1px !important; }',
    '  .cv-supervisor--muted, .cv-supervisor--muted a { font-size: 7.5px !important; color: #999 !important; }',
    '  ul.cv-highlights { margin: 1px 0 0 0 !important; padding-left: 14px !important; }',
    '  ul.cv-highlights li { margin-bottom: 1px !important; line-height: 1.28 !important; font-size: 8.2px !important; }',
    '  .cv-awards-group { margin-bottom: 3px !important; }',
    '  .cv-award-group-title { font-size: 8px !important; color: #777 !important; font-weight: 600 !important; margin-bottom: 1px !important; }',
    '  .cv-award-row {',
    '    display: flex !important; justify-content: space-between !important; align-items: baseline !important;',
    '    gap: 6px !important; padding: 1px 0 !important; border-bottom: 1px solid #e8e8e8 !important; font-size: 8.2px !important;',
    '  }',
    '  .cv-award-row:last-child { border-bottom: none !important; }',
    '  .cv-award-title { flex: 1 1 auto !important; color: #333 !important; }',
    '  .cv-award-level { flex: 0 0 auto !important; min-width: 7em !important; text-align: center !important; font-weight: 700 !important; color: #2a7a92 !important; }',
    '  .cv-award-year { flex: 0 0 auto !important; min-width: 4em !important; text-align: right !important; color: #777 !important; }',
    '  .cv-skills-compact .cv-skill-row { font-size: 8.2px !important; line-height: 1.35 !important; margin-bottom: 1px !important; }',
    '  .cv-pub-group { margin-bottom: 3px !important; }',
    '  .cv-pub-compact { margin-bottom: 2px !important; padding-bottom: 0.5px !important; }',
    '  .cv-pub-line1 { font-size: 8px !important; line-height: 1.3 !important; }',
    '  .cv-pub-line1 em { color: #222 !important; font-style: italic !important; }',
    '  .cv-pub-line2 { font-size: 7.2px !important; color: #777 !important; line-height: 1.25 !important; }',
    '  .cv-pub-line2 strong { color: #2a7a92 !important; }'
  ];

  var printCSS;
  if (mode === 'job') {
    printCSS = base.concat(jobSpecific, ['}']).join('\n');
  } else {
    printCSS = base.concat(researchSpecific, ['}']).join('\n');
  }

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
