/**
 * Sidebar search on note pages — reads SERIES_INDEX (defined in scripts.html).
 * Same pattern as notes-search.js (Hub search) which is proven to work.
 */
(function() {
  if (typeof SERIES_INDEX === 'undefined' || !SERIES_INDEX.length) return;
  var inp = document.getElementById('notes-sidebar-search-input');
  var box = document.getElementById('notes-sidebar-search-results');
  if (!inp || !box) return;

  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function hl(t, q) {
    var o = '', L = 0, lo = t.toLowerCase(), ql = q.toLowerCase(), i;
    while ((i = lo.indexOf(ql, L)) !== -1) {
      o += esc(t.substring(L, i)) + '<mark class="notes-search-highlight">' + esc(t.substring(i, i + q.length)) + '</mark>';
      L = i + q.length;
    }
    return o + esc(t.substring(L));
  }

  inp.addEventListener('input', function() {
    var q = this.value.trim();
    if (!q) { box.style.display = 'none'; box.innerHTML = ''; return; }
    var ql = q.toLowerCase(), hits = [];
    for (var i = 0; i < SERIES_INDEX.length; i++) {
      if (SERIES_INDEX[i].t.toLowerCase().indexOf(ql) !== -1) hits.push(SERIES_INDEX[i]);
    }
    if (!hits.length) {
      box.innerHTML = '<div class="notes-sidebar-search-empty">无匹配</div>';
    } else {
      var h = '';
      for (var j = 0; j < Math.min(hits.length, 15); j++) {
        h += '<a href="' + hits[j].u + '" class="notes-sidebar-search-hit" data-q="' + esc(q) + '">' +
             '<span class="notes-sidebar-search-hit-title">' + hl(hits[j].t, q) + '</span></a>';
      }
      box.innerHTML = h;
    }
    box.style.display = 'block';
  });
  inp.addEventListener('keydown', function(e) { if (e.key === 'Escape') { box.style.display = 'none'; box.innerHTML = ''; this.blur(); } });
  box.addEventListener('click', function(e) { var a = e.target.closest('.notes-sidebar-search-hit'); if (a && a.dataset.q) sessionStorage.setItem('notes-search-q', a.dataset.q); });
  document.addEventListener('click', function(e) { if (!e.target.closest('#notes-sidebar-search')) { box.style.display = 'none'; box.innerHTML = ''; } });
})();
