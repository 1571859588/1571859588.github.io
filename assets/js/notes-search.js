/**
 * Notes hub page — search with keyword highlighting in results
 */
(function() {
  if (typeof NOTES_INDEX === 'undefined') return;

  var input      = document.getElementById('notes-search-input');
  var resultsBox = document.getElementById('notes-search-results');
  if (!input || !resultsBox) return;

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // Wrap all occurrences of `q` in `text` with <mark> (case-insensitive),
  // preserving the original casing of matched text
  function highlight(text, q) {
    var idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return esc(text);
    var out = '';
    var last = 0;
    var lower = text.toLowerCase();
    var ql = q.toLowerCase();
    while ((idx = lower.indexOf(ql, last)) !== -1) {
      out += esc(text.substring(last, idx));
      out += '<mark class="notes-search-highlight">' + esc(text.substring(idx, idx + q.length)) + '</mark>';
      last = idx + q.length;
    }
    out += esc(text.substring(last));
    return out;
  }

  function search(query) {
    var qRaw = query.trim();
    var q = qRaw.toLowerCase();
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
      if (n.c && n.c.toLowerCase().indexOf(q) !== -1) {
        score += 50;
        // Store context for display
        var ci = n.c.toLowerCase().indexOf(q);
        var start = Math.max(0, ci - 40);
        var end   = Math.min(n.c.length, ci + qRaw.length + 60);
        n._ctx = n.c.substring(start, end);
        if (start > 0) n._ctx = '…' + n._ctx;
        if (end < n.c.length) n._ctx += '…';
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
        var ctxHtml = h.n._ctx
          ? '<span class="notes-search-hit-context">' + highlight(h.n._ctx, qRaw) + '</span>'
          : '';
        html += '<a href="' + h.n.u + '" class="notes-search-hit" data-q="' + esc(qRaw) + '">' +
                '<span class="notes-search-hit-title">' + highlight(h.n.t, qRaw) + '</span>' +
                '<span class="notes-search-hit-series">' + highlight(h.n.s, qRaw) + '</span>' +
                ctxHtml +
                '</a>';
      }
      resultsBox.innerHTML = html;
    }
    resultsBox.style.display = 'block';
  }

  // Store search query before navigating (so target page can highlight it)
  resultsBox.addEventListener('click', function(e) {
    var link = e.target.closest('.notes-search-hit');
    if (link && link.dataset.q) {
      sessionStorage.setItem('notes-search-q', link.dataset.q);
    }
  });

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
