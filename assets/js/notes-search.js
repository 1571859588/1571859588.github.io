/**
 * Notes hub page — search functionality
 * Reads NOTES_INDEX (defined inline in _pages/notes.md)
 */
(function() {
  if (typeof NOTES_INDEX === 'undefined') return;

  var input      = document.getElementById('notes-search-input');
  var resultsBox = document.getElementById('notes-search-results');
  if (!input || !resultsBox) return;

  function search(query) {
    var q = query.toLowerCase().trim();
    if (q.length < 1) {
      resultsBox.style.display = 'none';
      resultsBox.innerHTML = '';
      return;
    }

    var hits = [];
    for (var i = 0; i < NOTES_INDEX.length; i++) {
      var n = NOTES_INDEX[i];
      var score = 0;
      if (n.t.toLowerCase().indexOf(q) !== -1) score += 100;
      if (n.s.toLowerCase().indexOf(q) !== -1) score += 80;
      if (n.c) {
        var ci = n.c.toLowerCase().indexOf(q);
        if (ci !== -1) {
          score += 50;
          n._ctx = n.c.substring(Math.max(0, ci - 40), ci + q.length + 60);
          if (ci > 40) n._ctx = '…' + n._ctx;
          if (ci + q.length + 60 < n.c.length) n._ctx += '…';
        }
      }
      if (score > 0) hits.push({ n: n, score: score });
    }

    hits.sort(function(a, b) { return b.score - a.score; });
    hits = hits.slice(0, 20);

    if (hits.length === 0) {
      resultsBox.innerHTML = '<div class="notes-search-empty">无匹配结果</div>';
    } else {
      var html = '';
      for (var j = 0; j < hits.length; j++) {
        var h = hits[j];
        var ctx = h.n._ctx ? '<span class="notes-search-hit-context">' + esc(h.n._ctx) + '</span>' : '';
        var qParam = encodeURIComponent(input.value.trim());
        html += '<a href="' + h.n.u + '?q=' + qParam + '" class="notes-search-hit">' +
                '<span class="notes-search-hit-title">' + esc(h.n.t) + '</span>' +
                '<span class="notes-search-hit-series">' + esc(h.n.s) + '</span>' +
                ctx +
                '</a>';
      }
      resultsBox.innerHTML = html;
    }
    resultsBox.style.display = 'block';
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  input.addEventListener('input', function() { search(this.value); });
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); search(this.value); }
    if (e.key === 'Escape') { resultsBox.style.display = 'none'; resultsBox.innerHTML = ''; this.blur(); }
  });
  document.addEventListener('click', function(e) {
    if (!e.target.closest('#notes-search')) {
      resultsBox.style.display = 'none';
      resultsBox.innerHTML = '';
    }
  });
})();
