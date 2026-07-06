/**
 * Sidebar search on individual note pages.
 * Reads titles/URLs from the rendered sidebar DOM.
 */
(function() {
  var input = document.getElementById('notes-sidebar-search-input');
  var box   = document.getElementById('notes-sidebar-search-results');
  if (!input || !box) { console.log('Sidebar search: missing elements'); return; }

  // Prove script loaded
  input.placeholder = '✓ 搜索本专题…';

  // Build index from sidebar DOM links
  var items = [];
  var links = document.querySelectorAll('.notes-chapter-link');
  for (var i = 0; i < links.length; i++) {
    var titleEl = links[i].querySelector('.notes-chapter-title');
    if (titleEl) {
      items.push({
        t: titleEl.textContent.trim(),
        u: links[i].getAttribute('href')
      });
    }
  }
  console.log('Sidebar search: ' + items.length + ' notes indexed');

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

  input.addEventListener('input', function() {
    var qr = this.value.trim();
    console.log('Sidebar search: typing "' + qr + '"');
    if (qr.length < 1) { box.style.display = 'none'; box.innerHTML = ''; return; }
    var ql = qr.toLowerCase();
    var hits = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].t.toLowerCase().indexOf(ql) !== -1) hits.push(items[i]);
    }
    console.log('Sidebar search: ' + hits.length + ' matches');
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
    console.log('Sidebar search: dropdown visible, innerHTML length ' + box.innerHTML.length);
  });

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { box.style.display = 'none'; box.innerHTML = ''; this.blur(); }
  });

  box.addEventListener('click', function(e) {
    var link = e.target.closest('.notes-sidebar-search-hit');
    if (link && link.dataset.q) sessionStorage.setItem('notes-search-q', link.dataset.q);
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('#notes-sidebar-search')) { box.style.display = 'none'; box.innerHTML = ''; }
  });
})();
