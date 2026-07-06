/**
 * Sidebar search on individual note pages — searches within current series.
 * Reads window.SERIES_INDEX (defined in _includes/scripts.html).
 */
(function() {
  if (typeof SERIES_INDEX === 'undefined' || !SERIES_INDEX.length) return;

  var input = document.getElementById('notes-sidebar-search-input');
  var box   = document.getElementById('notes-sidebar-search-results');
  if (!input || !box) return;

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function highlight(text, q) {
    var out = '', last = 0, lower = text.toLowerCase(), ql = q.toLowerCase(), idx;
    while ((idx = lower.indexOf(ql, last)) !== -1) {
      out += esc(text.substring(last, idx));
      out += '<mark class="notes-search-highlight">' + esc(text.substring(idx, idx + q.length)) + '</mark>';
      last = idx + q.length;
    }
    out += esc(text.substring(last));
    return out;
  }

  function search(val) {
    var qr = val.trim(), q = qr.toLowerCase();
    if (q.length < 1) { box.style.display = 'none'; box.innerHTML = ''; return; }
    var hits = [];
    for (var i = 0; i < SERIES_INDEX.length; i++) {
      if (SERIES_INDEX[i].t.toLowerCase().indexOf(q) !== -1) {
        hits.push(SERIES_INDEX[i]);
      }
    }
    if (hits.length === 0) {
      box.innerHTML = '<div class="notes-sidebar-search-empty">无匹配</div>';
    } else {
      var html = '';
      for (var j = 0; j < Math.min(hits.length, 15); j++) {
        var h = hits[j];
        html += '<a href="' + h.u + '" class="notes-sidebar-search-hit" data-q="' + esc(qr) + '">' +
                '<span class="notes-sidebar-search-hit-title">' + highlight(h.t, qr) + '</span></a>';
      }
      box.innerHTML = html;
    }
    box.style.display = 'block';
  }

  input.addEventListener('input', function() { search(this.value); });
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); search(this.value); }
    if (e.key === 'Escape') { box.style.display = 'none'; box.innerHTML = ''; this.blur(); }
  });

  // Store query for highlight on target page
  box.addEventListener('click', function(e) {
    var link = e.target.closest('.notes-sidebar-search-hit');
    if (link && link.dataset.q) sessionStorage.setItem('notes-search-q', link.dataset.q);
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('#notes-sidebar-search')) { box.style.display = 'none'; box.innerHTML = ''; }
  });
})();
