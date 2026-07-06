/**
 * NOTES Page — Build TOC from DOM + ScrollSpy + Mobile Sidebar
 *
 * TOC is built entirely in JS from rendered .notes-body headings.
 * This eliminates Liquid HTML-parsing bugs (inline code, LaTeX, etc).
 */
(function() {
  var tocList = document.getElementById('notes-toc-list');
  var tocAside = document.getElementById('notes-toc');
  var content  = document.querySelector('.notes-body');
  var sidebar  = document.getElementById('notes-sidebar');
  var toggleBtn = document.getElementById('notes-sidebar-toggle');

  if (!tocList || !content) return;

  // ── 1. Build TOC from DOM headings ──
  var headings = content.querySelectorAll('h2, h3, h4');
  if (headings.length === 0) {
    if (tocAside) tocAside.style.display = 'none';
    return;
  }

  // Ensure all headings have IDs (Kramdown auto_ids does this, but just in case)
  headings.forEach(function(h, i) {
    if (!h.id) {
      h.id = 'heading-' + i;
    }
  });

  // Build TOC list items
  var fragment = document.createDocumentFragment();
  headings.forEach(function(h) {
    var level = parseInt(h.tagName.charAt(1), 10); // 2, 3, or 4
    var text  = h.textContent.trim();              // Browser handles all HTML stripping
    if (!text) return;                             // Skip empty headings

    var li = document.createElement('li');
    li.className = 'notes-toc-item toc-level-' + level;

    var a = document.createElement('a');
    a.href = '#' + h.id;
    a.className = 'notes-toc-link';
    a.setAttribute('data-toc-target', h.id);
    a.textContent = text;

    li.appendChild(a);
    fragment.appendChild(li);
  });
  tocList.appendChild(fragment);

  // ── 2. Mobile sidebar toggle ──
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', function() {
      sidebar.classList.toggle('open');
      toggleBtn.classList.toggle('open');
    });
    sidebar.addEventListener('click', function(e) {
      if (e.target.tagName === 'A') {
        sidebar.classList.remove('open');
        toggleBtn.classList.remove('open');
      }
    });
  }

  // ── 3. ScrollSpy ──
  var tocLinks = tocList.querySelectorAll('.notes-toc-link');
  var activeLink = null;

  function highlightToc() {
    var scrollPos = window.scrollY || window.pageYOffset;
    var headerOffset = 100;
    var activeIndex = -1;

    for (var i = 0; i < tocLinks.length; i++) {
      var targetId = tocLinks[i].getAttribute('data-toc-target');
      var targetEl = document.getElementById(targetId);
      if (!targetEl) continue;
      var top = targetEl.getBoundingClientRect().top + scrollPos;
      if (scrollPos >= top - headerOffset) {
        activeIndex = i;
      } else {
        break;
      }
    }

    var newActive = activeIndex >= 0 ? tocLinks[activeIndex] : null;
    if (newActive !== activeLink) {
      if (activeLink) activeLink.classList.remove('active');
      if (newActive) {
        newActive.classList.add('active');
        var tocInner = document.querySelector('.notes-toc-inner');
        if (tocInner) {
          var tr = newActive.getBoundingClientRect();
          var cr = tocInner.getBoundingClientRect();
          if (tr.bottom > cr.bottom - 30) {
            newActive.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          } else if (tr.top < cr.top + 30) {
            newActive.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }
      }
      activeLink = newActive;
    }
  }

  // ── 4. Collapsible sidebar sections ──
  var sectionToggles = sidebar ? sidebar.querySelectorAll('.notes-section-toggle') : [];
  sectionToggles.forEach(function(toggle) {
    toggle.addEventListener('click', function() {
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    });
  });

  // ── 5. Smooth scroll on click ──
  tocLinks.forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      var targetId = this.getAttribute('data-toc-target');
      var targetEl = document.getElementById(targetId);
      if (targetEl) {
        window.scrollTo({
          top: targetEl.getBoundingClientRect().top + window.scrollY - 80,
          behavior: 'smooth'
        });
        history.pushState(null, null, '#' + targetId);
      }
    });
  });

  window.addEventListener('scroll', highlightToc, { passive: true });
  highlightToc();

  // ── 6. Search term highlight + scroll (from URL hash #q=...) ──
  (function() {
    var hash = location.hash;
    console.log('notes-toc: hash=' + hash);
    if (hash.indexOf('#q=') !== 0) return;
    console.log('notes-toc: search term=' + decodeURIComponent(hash.slice(3)));
    var q = decodeURIComponent(hash.slice(3));
    if (!q || q.length < 2) return;
    var body = document.querySelector('.notes-body');
    if (!body) return;

    // Clear hash to prevent browser scroll interference
    history.replaceState(null, '', location.pathname + location.search);

    function doHighlight() {
      var walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
      var textNodes = [];
      while (walker.nextNode()) {
        var p = walker.currentNode.parentNode;
        if (p.closest('script,style,mark,.notes-search-hit,.notes-sidebar-search-hit')) continue;
        textNodes.push(walker.currentNode);
      }

      var ql = q.toLowerCase(), firstMark = null;
      textNodes.forEach(function(node) {
        var text = node.textContent, idx = text.toLowerCase().indexOf(ql);
        if (idx === -1) return;
        var frag = document.createDocumentFragment(), lastIdx = 0;
        while (idx !== -1) {
          if (idx > lastIdx) frag.appendChild(document.createTextNode(text.slice(lastIdx, idx)));
          var mark = document.createElement('mark');
          mark.className = 'notes-search-mark';
          mark.textContent = text.slice(idx, idx + q.length);
          frag.appendChild(mark);
          if (!firstMark) firstMark = mark;
          lastIdx = idx + q.length;
          idx = text.toLowerCase().indexOf(ql, lastIdx);
        }
        if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.slice(lastIdx)));
        node.parentNode.replaceChild(frag, node);
      });

      if (firstMark) {
        var top = firstMark.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    }

    // Try immediately, retry after MathJax settles
    doHighlight();
    setTimeout(doHighlight, 800);
  })();
})();
