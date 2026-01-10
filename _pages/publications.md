---
layout: archive
title: "Publications"
permalink: /publications/
author_profile: true
---

<div class="paper-details-toggle">
  <input type="checkbox" id="show-paper-details">
  <label for="show-paper-details">Show detailed contribution, PDF, and GitHub links</label>
</div>

{% include base_path %}
{% assign sorted_papers = site.data.papers.papers | sort: "date" | reverse %}
{% assign current_year = "" %}

{% for paper in sorted_papers %}
{% assign paper_year = paper.date | date: "%Y" %}
{% if paper_year != current_year %}
{% assign current_year = paper_year %}

## {{ current_year }}

{% endif %}
<div class="publication-paper">
<div class="paper-title">{{ paper.title }}</div>
<div class="paper-meta">
{{ paper.authors | join: ", " }}<br>
<em>{{ paper.venue }}</em>
</div>
<div class="paper-details">
{% if paper.contribution %}
<h4>My Contribution</h4>
{{ paper.contribution | markdownify }}
{% endif %}
{% if paper.pdf_url or paper.slides_url or paper.github_url or paper.doi %}
<div class="paper-links">
{% if paper.pdf_url %}{% if paper.pdf_url contains "://" %}<a href="{{ paper.pdf_url }}" target="_blank" rel="noopener noreferrer"><i class="fa fa-file-pdf" aria-hidden="true"></i> PDF</a>{% else %}<a href="/{{ paper.pdf_url }}" target="_blank" rel="noopener noreferrer"><i class="fa fa-file-pdf" aria-hidden="true"></i> PDF</a>{% endif %}{% endif %}
{% if paper.slides_url %}{% if paper.slides_url contains "://" %}<a href="{{ paper.slides_url }}" target="_blank" rel="noopener noreferrer"><i class="fa fa-file-powerpoint" aria-hidden="true"></i> Slides</a>{% else %}<a href="/{{ paper.slides_url }}" target="_blank" rel="noopener noreferrer"><i class="fa fa-file-powerpoint" aria-hidden="true"></i> Slides</a>{% endif %}{% endif %}
{% if paper.github_url %}<a href="{{ paper.github_url }}" target="_blank" rel="noopener noreferrer"><i class="fa fa-github" aria-hidden="true"></i> Code</a>{% endif %}
{% if paper.doi %}<a href="{{ paper.doi }}" target="_blank" rel="noopener noreferrer"><i class="fa fa-external-link" aria-hidden="true"></i> DOI</a>{% endif %}
</div>
{% endif %}
</div>
</div>
{% endfor %}
