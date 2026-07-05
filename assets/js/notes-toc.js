/**
 * NOTES Page — ScrollSpy TOC + Mobile Sidebar
 */
(function() {
  var tocLinks = document.querySelectorAll('#notes-toc-list .notes-toc-link');
  var sidebar = document.getElementById('notes-sidebar');
  var toggleBtn = document.getElementById('notes-sidebar-toggle');
  var body = document.body;

  // ── Mobile sidebar toggle ──
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', function() {
      sidebar.classList.toggle('open');
      toggleBtn.classList.toggle('open');
    });

    // Close sidebar when clicking on a link (mobile)
    sidebar.addEventListener('click', function(e) {
      if (e.target.tagName === 'A') {
        sidebar.classList.remove('open');
        toggleBtn.classList.remove('open');
      }
    });
  }

  // ── ScrollSpy for TOC ──
  if (tocLinks.length === 0) {
    var tocAside = document.getElementById('notes-toc');
    if (tocAside) tocAside.style.display = 'none';
    return;
  }

  var activeLink = null;

  function highlightToc() {
    var scrollPosition = window.scrollY || window.pageYOffset;
    var headerOffset = 100;
    var activeIndex = -1;

    for (var i = 0; i < tocLinks.length; i++) {
      var targetId = tocLinks[i].getAttribute('data-toc-target');
      var targetEl = document.getElementById(targetId);
      if (!targetEl) continue;
      var top = targetEl.getBoundingClientRect().top + scrollPosition;
      if (scrollPosition >= top - headerOffset) {
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
        // Auto-scroll TOC to keep active item visible
        var tocContainer = document.querySelector('.notes-toc-inner');
        if (tocContainer) {
          var tocRect = newActive.getBoundingClientRect();
          var containerRect = tocContainer.getBoundingClientRect();
          if (tocRect.bottom > containerRect.bottom - 30) {
            newActive.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          } else if (tocRect.top < containerRect.top + 30) {
            newActive.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }
      }
      activeLink = newActive;
    }
  }

  // Smooth scroll on TOC link click
  for (var i = 0; i < tocLinks.length; i++) {
    tocLinks[i].addEventListener('click', function(e) {
      e.preventDefault();
      var targetId = this.getAttribute('data-toc-target');
      var targetEl = document.getElementById(targetId);
      if (targetEl) {
        var offset = 80;
        window.scrollTo({
          top: targetEl.getBoundingClientRect().top + window.scrollY - offset,
          behavior: 'smooth'
        });
        history.pushState(null, null, '#' + targetId);
      }
    });
  }

  window.addEventListener('scroll', highlightToc, { passive: true });
  highlightToc();
})();
