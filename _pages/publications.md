---
layout: archive
title: "Publications"
permalink: /publications/
author_profile: true
---

## Publications

<!-- Toggle for showing/hiding paper details -->
<div class="paper-details-toggle">
  <input type="checkbox" id="show-paper-details">
  <label for="show-paper-details">Show detailed contribution, PDF, and GitHub links</label>
</div>

<!-- Publications grouped by year -->
{% assign sorted_papers = site.data.papers.papers | sort: "date" | reverse %}
{% assign current_year = "" %}

{% for paper in sorted_papers %}
  {% assign paper_year = paper.date | date: "%Y" %}
  {% if paper_year != current_year %}
    {% if current_year != "" %}
      <br><br>
    {% endif %}
    {% assign current_year = paper_year %}
    <h2>{{ current_year }}</h2>
  {% endif %}
  <div class="publication-paper">
    <div class="paper-title">
      {{ paper.title }}
    </div>
    <div class="paper-meta">
      {{ paper.authors | join: ", " }}
      <br>
      <em>{{ paper.venue }}</em>
    </div>

    <!-- Detailed information (hidden by default, shown when checkbox is checked) -->
    <div class="paper-details">
      {% if paper.contribution %}
        <h4>My Contribution</h4>
        {{ paper.contribution | markdownify }}
      {% endif %}

      {% if paper.pdf_url or paper.github_url or paper.doi %}
        <div class="paper-links">
          {% if paper.pdf_url %}
            <a href="{{ paper.pdf_url }}" target="_blank" rel="noopener noreferrer">
              <i class="fa fa-file-pdf" aria-hidden="true"></i> PDF
            </a>
          {% endif %}
          {% if paper.github_url %}
            <a href="{{ paper.github_url }}" target="_blank" rel="noopener noreferrer">
              <i class="fa fa-github" aria-hidden="true"></i> Code
            </a>
          {% endif %}
          {% if paper.doi %}
            <a href="{{ paper.doi }}" target="_blank" rel="noopener noreferrer">
              <i class="fa fa-external-link" aria-hidden="true"></i> DOI
            </a>
          {% endif %}
        </div>
      {% endif %}
    </div>
  </div>
{% endfor %}
