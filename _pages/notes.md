---
layout: single
title: "笔记"
permalink: /notes/
author_profile: true
---

<div class="notes-hub">
  <p class="notes-hub-subtitle">零散的技术笔记与学习记录。将本地笔记目录复制到 <code>notes-src/</code>，构建时自动同步。</p>

  <div class="notes-series-grid">
  {% assign sorted_series = site.notes_series | sort: "order" %}
  {% for series in sorted_series %}
    {% assign series_notes = site.notes | where: "series", series.id | sort: "series_order" %}
    <div class="notes-series-card">
      <h3 class="notes-series-card-title">
        {% if series.first_note_url %}
        <a href="{{ series.first_note_url | relative_url }}">{{ series.title }}</a>
        {% elsif series_notes.size > 0 %}
        <a href="{{ series_notes[0].url | relative_url }}">{{ series.title }}</a>
        {% else %}
        {{ series.title }}
        {% endif %}
      </h3>
      <p class="notes-series-card-desc">{{ series.note_count }} 篇笔记</p>
      {% if series_notes.size > 0 %}
      <a href="{{ series_notes[0].url | relative_url }}" class="notes-series-card-link">开始阅读 →</a>
      {% endif %}
    </div>
  {% endfor %}
  </div>
</div>
