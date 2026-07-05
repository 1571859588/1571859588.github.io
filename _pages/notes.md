---
layout: single
title: "笔记"
permalink: /notes/
author_profile: true
---

<div class="notes-hub">
  <p class="notes-hub-subtitle">零散的技术笔记与学习记录，按主题整理为系列。</p>

  <div class="notes-series-grid">
  {% for series in site.data.notes.series %}
    {% assign series_notes = site.notes | where: "series", series.id | sort: "series_order" %}
    <div class="notes-series-card">
      <h3 class="notes-series-card-title">
        <a href="{{ series_notes[0].url | relative_url }}">{{ series.title }}</a>
      </h3>
      <p class="notes-series-card-desc">{{ series.description }}</p>
      <p class="notes-series-card-meta">{{ series_notes.size }} 篇笔记</p>
      {% if series_notes.size > 0 %}
      <a href="{{ series_notes[0].url | relative_url }}" class="notes-series-card-link">开始阅读 →</a>
      {% endif %}
    </div>
  {% endfor %}
  </div>
</div>
