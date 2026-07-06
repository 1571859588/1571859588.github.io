---
layout: single
title: "笔记"
permalink: /notes/
author_profile: true
---

<div class="notes-hub">
  <p class="notes-hub-subtitle">零散的技术笔记与学习记录。将本地笔记目录复制到 <code>notes-src/</code>，构建时自动同步。</p>

  <div class="notes-series-grid">
  {% comment %}
    Group notes by series_title (derived from _notes/ collection files).
    Works without the Jekyll plugin — pure Liquid grouping.
  {% endcomment %}

  {% assign seen = "" %}
  {% for note in site.notes %}
    {% assign st = note.series_title | default: note.series %}
    {% assign st_slug = st | slugify %}
    {% unless seen contains st_slug %}
      {% assign seen = seen | append: st_slug | append: "|" %}
    {% endunless %}
  {% endfor %}

  {% assign series_names = seen | split: "|" %}

  {% for sname in series_names %}
    {% assign sname_trimmed = sname | strip %}
    {% if sname_trimmed != "" %}
      {% comment %}Find all notes matching this series slug{% endcomment %}
      {% assign matched = "" | split: "" %}
      {% for note in site.notes %}
        {% assign st = note.series_title | default: note.series %}
        {% if st | slugify == sname_trimmed %}
          {% assign matched = matched | push: note %}
        {% endif %}
      {% endfor %}
      {% assign sorted_matched = matched | sort: "series_order" %}
      {% assign first = sorted_matched | first %}
      {% if first %}
      <div class="notes-series-card">
        <h3 class="notes-series-card-title">
          <a href="{{ first.url | relative_url }}">{{ first.series_title | default: first.series }}</a>
        </h3>
        <p class="notes-series-card-desc">{{ sorted_matched.size }} 篇笔记</p>
        <a href="{{ first.url | relative_url }}" class="notes-series-card-link">开始阅读 →</a>
      </div>
      {% endif %}
    {% endif %}
  {% endfor %}
  </div>
</div>
