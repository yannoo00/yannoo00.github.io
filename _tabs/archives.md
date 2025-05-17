---
layout: vintage
title: Archives
---

<h1>Archives</h1>

<div class="archives">
  {% assign posts_by_year = site.posts | group_by_exp: "post", "post.date | date: '%Y'" %}
  {% for year_group in posts_by_year %}
  <div class="archive-year" id="{{ year_group.name }}">
    <h2>{{ year_group.name }}</h2>
    <ul>
      {% for post in year_group.items %}
      <li>
        <span class="date">{{ post.date | date: "%b %d" }}</span>
        <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
      </li>
      {% endfor %}
    </ul>
  </div>
  {% endfor %}
</div>

<style>
  .archives .date {
    display: inline-block;
    width: 80px;
    color: #777;
  }
  .archives ul {
    list-style-type: none;
    padding-left: 0;
  }
  .archives li {
    margin-bottom: 5px;
  }
  .archive-year {
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 1px solid #ccc;
  }
  .archive-year:last-child {
    border-bottom: none;
  }
  .archive-year h2 {
    color: #444;
    background-color: #f5f5f5;
    padding: 8px 12px;
    border-radius: 4px;
    margin-top: 25px;
  }
</style>
