---
layout: archive
title: "Curriculum Vitae"
permalink: /cv/
author_profile: true
---

<div class="cv-hub">
  <p class="cv-hub-intro">
    Select a CV track tailored to the direction you're interested in.
    Each track highlights relevant research interests, projects, and skills.
  </p>

  <div class="cv-track-cards">
  {% for t in site.data.cv-tracks.tracks %}
    {% assign track_key = t[0] %}
    {% assign track_info = t[1] %}
    <div class="cv-track-card">
      <h3 class="cv-track-card-title">{{ track_info.name.en }}</h3>
      <p class="cv-track-card-desc">{{ track_info.description.en }}</p>
      <div class="cv-track-card-links">
        <a href="/cv-{{ track_key }}/" class="btn btn--primary btn--small">English CV</a>
        <a href="/cv-{{ track_key }}-zh/" class="btn btn--info btn--small">中文简历</a>
      </div>
    </div>
  {% endfor %}
  </div>
</div>

<style>
.cv-hub-intro {
  font-size: 1.1em;
  color: #555;
  margin-bottom: 2em;
  text-align: center;
}
.cv-track-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5em;
  margin-bottom: 2em;
}
.cv-track-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1.5em;
  transition: box-shadow 0.2s, transform 0.2s;
}
.cv-track-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}
.cv-track-card-title {
  font-size: 1.3em;
  margin: 0 0 0.5em 0;
  color: #2e8b9e;
}
.cv-track-card-desc {
  font-size: 0.95em;
  color: #666;
  margin-bottom: 1.2em;
  line-height: 1.5;
}
.cv-track-card-links {
  display: flex;
  gap: 0.75em;
  flex-wrap: wrap;
}
.btn--small {
  padding: 0.35em 1em;
  font-size: 0.85em;
}
</style>
