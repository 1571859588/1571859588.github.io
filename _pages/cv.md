---
layout: archive
title: "Curriculum Vitae"
permalink: /cv/
author_profile: true
---

<div class="cv-hub">
  <p class="cv-hub-intro">
    CVs are organized into two tracks: a <strong>research-oriented CV</strong> (for graduate / PhD applications)
    and a <strong>job-seeking CV</strong> (for industry applications). Each track highlights relevant
    research interests, projects, internships, and skills.
  </p>

  <section class="cv-hub-region">
    <h2 class="cv-hub-region-title">Research CV</h2>
    <p class="cv-hub-region-desc">Academic-oriented layout — publications and research interests lead.</p>
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
  </section>

  <section class="cv-hub-region">
    <h2 class="cv-hub-region-title">Job-Seeking CV</h2>
    <p class="cv-hub-region-desc">Employment-oriented layout — internships, projects, and quantified outcomes lead; publications demoted.</p>
    <div class="cv-track-cards">
    {% for t in site.data.cv-tracks.tracks %}
      {% assign track_key = t[0] %}
      {% assign track_info = t[1] %}
      <div class="cv-track-card cv-track-card--job">
        <h3 class="cv-track-card-title">{{ track_info.name.en }}</h3>
        <p class="cv-track-card-desc">{{ track_info.description.en }}</p>
        {% if track_info.job_objective.en %}
        <p class="cv-track-card-obj"><strong>Objective:</strong> {{ track_info.job_objective.en }}</p>
        {% endif %}
        <div class="cv-track-card-links">
          <a href="/cv-job-{{ track_key }}/" class="btn btn--primary btn--small">English CV</a>
          <a href="/cv-job-{{ track_key }}-zh/" class="btn btn--info btn--small">中文简历</a>
        </div>
      </div>
    {% endfor %}
    </div>
  </section>
</div>
