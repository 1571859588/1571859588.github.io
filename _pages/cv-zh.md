---
layout: archive
title: "个人简历"
permalink: /cv-zh/
author_profile: true
---

<div class="cv-hub">
  <p class="cv-hub-intro">
    简历分为两个板块：<strong>科研CV</strong>（用于升学 / 读博申请）与<strong>就业CV</strong>（用于求职投递）。
    两个板块均包含相同的研究方向分类，每个方向突出展示相关的研究兴趣、项目经历与技能。
  </p>

  <section class="cv-hub-region">
    <h2 class="cv-hub-region-title">科研CV</h2>
    <p class="cv-hub-region-desc">学术导向排版——论文与研究兴趣前置。</p>
    <div class="cv-track-cards">
    {% for t in site.data.cv-tracks.tracks %}
      {% assign track_key = t[0] %}
      {% assign track_info = t[1] %}
      <div class="cv-track-card">
        <h3 class="cv-track-card-title">{{ track_info.name.zh }}</h3>
        <p class="cv-track-card-desc">{{ track_info.description.zh }}</p>
        <div class="cv-track-card-links">
          <a href="/cv-{{ track_key }}-zh/" class="btn btn--primary btn--small">中文简历</a>
          <a href="/cv-{{ track_key }}/" class="btn btn--info btn--small">English CV</a>
        </div>
      </div>
    {% endfor %}
    </div>
  </section>

  <section class="cv-hub-region">
    <h2 class="cv-hub-region-title">就业CV</h2>
    <p class="cv-hub-region-desc">求职导向排版——实习、项目、量化业务成果前置，论文后置弱化。</p>
    <div class="cv-track-cards">
    {% for t in site.data.cv-tracks.tracks %}
      {% assign track_key = t[0] %}
      {% assign track_info = t[1] %}
      <div class="cv-track-card cv-track-card--job">
        <h3 class="cv-track-card-title">{{ track_info.name.zh }}</h3>
        <p class="cv-track-card-desc">{{ track_info.description.zh }}</p>
        {% if track_info.job_objective.zh %}
        <p class="cv-track-card-obj"><strong>求职意向：</strong>{{ track_info.job_objective.zh }}</p>
        {% endif %}
        <div class="cv-track-card-links">
          <a href="/cv-job-{{ track_key }}-zh/" class="btn btn--primary btn--small">中文简历</a>
          <a href="/cv-job-{{ track_key }}/" class="btn btn--info btn--small">English CV</a>
        </div>
      </div>
    {% endfor %}
    </div>
  </section>
</div>
