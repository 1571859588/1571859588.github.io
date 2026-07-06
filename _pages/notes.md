---
layout: single
title: "笔记"
permalink: /notes/
author_profile: true
toc: false
---

<div class="notes-hub-layout">
  <div class="notes-hub-main">
    <p class="notes-hub-subtitle">零散的技术笔记与学习记录，按主题整理为系列。</p>

    <!-- Search -->
    <div class="notes-search" id="notes-search">
      <input type="text" class="notes-search-input" id="notes-search-input"
             placeholder="搜索笔记…" autocomplete="off">
      <div class="notes-search-results" id="notes-search-results" style="display:none"></div>
    </div>

    {% assign series_list = "" | split: "" %}
    {% for note in site.notes %}
      {% assign st = note.series_title | default: note.series %}
      {% unless series_list contains st %}
        {% assign series_list = series_list | push: st %}
      {% endunless %}
    {% endfor %}

    <div class="notes-series-grid" id="notes-series-grid">
    {% for st in series_list %}
      {% assign series_notes = "" | split: "" %}
      {% for note in site.notes %}
        {% assign nt = note.series_title | default: note.series %}
        {% if nt == st %}
          {% assign series_notes = series_notes | push: note %}
        {% endif %}
      {% endfor %}
      {% assign sorted = series_notes | sort: "series_order" %}
      {% assign first = sorted | first %}
      {% assign count = sorted | size %}

      {% if first and count > 0 %}
      <div class="notes-series-card" id="series-{{ forloop.index }}">
        <div class="notes-series-card-top">
          <h3 class="notes-series-card-title">
            <a href="{{ first.url | relative_url }}">{{ st }}</a>
          </h3>
          <span class="notes-series-card-count">{{ count }} 篇</span>
        </div>
        <ul class="notes-series-card-toc">
          {% for note in sorted limit:5 %}
          <li><a href="{{ note.url | relative_url }}">{{ note.title }}</a></li>
          {% endfor %}
          {% assign remaining = count | minus: 5 %}
          {% if remaining > 0 %}
          <li class="notes-series-card-more">…还有 {{ remaining }} 篇</li>
          {% endif %}
        </ul>
      </div>
      {% endif %}
    {% endfor %}
    </div>
  </div>

  <aside class="notes-hub-sidebar" id="notes-hub-sidebar">
    <div class="notes-hub-sidebar-inner">
      <h4 class="notes-hub-sidebar-title">快速索引</h4>
      <nav>
        <ul class="notes-hub-index-list">
        {% assign sidx = 0 %}
        {% for st in series_list %}
          {% assign series_notes = "" | split: "" %}
          {% for note in site.notes %}
            {% assign nt = note.series_title | default: note.series %}
            {% if nt == st %}{% assign series_notes = series_notes | push: note %}{% endif %}
          {% endfor %}
          {% assign count = series_notes | size %}
          {% assign sidx = sidx | plus: 1 %}
          <li class="notes-hub-index-item">
            <a href="#series-{{ sidx }}" class="notes-hub-index-link" data-target="series-{{ sidx }}">
              <span class="notes-hub-index-name">{{ st }}</span>
              <span class="notes-hub-index-count">{{ count }}</span>
            </a>
          </li>
        {% endfor %}
        </ul>
      </nav>
    </div>
  </aside>
</div>

<!-- Search index — stored in <textarea> to safely contain any characters -->
<textarea id="notes-search-data" style="display:none">[
{% for note in site.notes %}
  {"t":{{ note.title | jsonify }},"s":{{ note.series_title | default: note.series | jsonify }},"u":{{ note.url | relative_url | jsonify }}}{% unless forloop.last %},{% endunless %}
{% endfor %}
]</textarea>

<script>
(function() {
  var input  = document.getElementById('notes-search-input');
  var resultsBox = document.getElementById('notes-search-results');
  var dataEl = document.getElementById('notes-search-data');
  if (!input || !resultsBox || !dataEl) return;

  // Parse from <textarea> — safe for any characters including </script>
  var notes;
  try { notes = JSON.parse(dataEl.value); } catch(e) { return; }

  function search(query) {
    var q = query.toLowerCase().trim().replace(/[.*+?^${}()|[\]\\]/g, '');
    if (q.length < 1) { resultsBox.style.display = 'none'; return; }

    var hits = [];
    notes.forEach(function(n) {
      var score = 0;
      // Title match (high weight)
      if (n.t.toLowerCase().indexOf(q) !== -1) score += 100;
      // Series match
      if (n.s.toLowerCase().indexOf(q) !== -1) score += 80;
      if (score > 0) hits.push({ note: n, score: score });
    });

    hits.sort(function(a, b) { return b.score - a.score; });
    hits = hits.slice(0, 20);

    if (hits.length === 0) {
      resultsBox.innerHTML = '<div class="notes-search-empty">无匹配结果</div>';
    } else {
      var html = '';
      hits.forEach(function(h) {
        html += '<a href="' + encodeURI(h.note.u) + '" class="notes-search-hit">' +
                '<span class="notes-search-hit-title">' + esc(h.note.t) + '</span>' +
                '<span class="notes-search-hit-series">' + esc(h.note.s) + '</span>' +
                '</a>';
      });
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
  input.addEventListener('focus', function() { if (this.value.trim()) search(this.value); });
  document.addEventListener('click', function(e) {
    if (!e.target.closest('#notes-search')) resultsBox.style.display = 'none';
  });
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { resultsBox.style.display = 'none'; this.blur(); }
  });
})();
</script>

<script>
(function() {
  var links = document.querySelectorAll('.notes-hub-index-link');
  var activeLink = null;
  if (!links.length) return;

  function scrollspy() {
    var scrollY = window.scrollY + 150;
    var best = null;
    for (var i = 0; i < links.length; i++) {
      var card = document.getElementById(links[i].getAttribute('data-target'));
      if (!card) continue;
      if (scrollY >= card.getBoundingClientRect().top + window.scrollY) best = links[i];
    }
    if (best !== activeLink) {
      if (activeLink) activeLink.classList.remove('active');
      if (best) best.classList.add('active');
      activeLink = best;
    }
  }

  links.forEach(function(l) {
    l.addEventListener('click', function(e) {
      e.preventDefault();
      var card = document.getElementById(this.getAttribute('data-target'));
      if (card) { card.scrollIntoView({ behavior: 'smooth' }); history.pushState(null,null,'#'+this.getAttribute('data-target')); }
    });
  });

  window.addEventListener('scroll', scrollspy, { passive: true });
  scrollspy();
})();
</script>
