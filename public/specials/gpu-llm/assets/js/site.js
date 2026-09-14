/* ============================================================
   GPU 大模型系统论文解读站 · 共享脚本（site.js）
   ------------------------------------------------------------
   原则：只做渐进增强，不做任何内容的前提依赖。
   - 禁用 JavaScript 时：阅读、导航、锚点、目录、清单全部可用。
   - 每个模块在缺少所需元素/能力时安静退出（safe exit）。
   - 模块：
       1) 主题切换（首页 [data-theme-toggle]，写入 localStorage）
       2) 首页论文搜索与筛选（[data-paper-filters] + .paper-card）
       3) 详情页移动目录折叠（details.toc + matchMedia）
       4) 详情页滚动高亮（目录链接 + IntersectionObserver）
       5) 返回顶部（注入按钮，滚过阈值后显示）
   ============================================================ */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var THEME_KEY = 'site-theme';

  function onReady(fn) {
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  /* 单模块失败不影响其他增强，也不污染页面控制台之外的行为。 */
  function safeInit(name, fn) {
    try {
      fn();
    } catch (err) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[site.js] ' + name + ' 初始化失败，已跳过该增强：', err);
      }
    }
  }

  function prefersReducedMotion() {
    try {
      return !!(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (err) {
      return false;
    }
  }

  /* localStorage 在 file:// 或隐私模式下可能抛异常：全部吞掉。 */
  function storeRead(key) {
    try { return window.localStorage.getItem(key); } catch (err) { return null; }
  }
  function storeWrite(key, value) {
    try { window.localStorage.setItem(key, value); } catch (err) { /* 忽略 */ }
  }

  /* ---------- 1. 主题切换（可选增强） ---------- */
  function initThemeToggle() {
    var btn = doc.querySelector('[data-theme-toggle]');
    if (!btn) { return; }

    var modes = [
      { value: 'auto',  label: '主题：跟随系统', next: '切换为明亮' },
      { value: 'light', label: '主题：明亮',     next: '切换为暗色' },
      { value: 'dark',  label: '主题：暗色',     next: '切换为跟随系统' }
    ];
    var index = 0;

    function apply() {
      var mode = modes[index].value;
      if (mode === 'light' || mode === 'dark') {
        root.setAttribute('data-theme', mode);
      } else {
        root.removeAttribute('data-theme');
      }
      btn.textContent = modes[index].label;
      btn.setAttribute('aria-label', '当前' + modes[index].label + '，激活' + modes[index].next);
    }

    var saved = storeRead(THEME_KEY);
    for (var i = 0; i < modes.length; i++) {
      if (modes[i].value === saved) { index = i; break; }
    }
    apply();
    btn.hidden = false;

    btn.addEventListener('click', function () {
      index = (index + 1) % modes.length;
      apply();
      if (modes[index].value === 'auto') {
        try { window.localStorage.removeItem(THEME_KEY); } catch (err) { /* 忽略 */ }
      } else {
        storeWrite(THEME_KEY, modes[index].value);
      }
    });
  }

  /* ---------- 2. 首页论文搜索与筛选 ---------- */
  function initHomeFilter() {
    var form = doc.querySelector('[data-paper-filters]');
    if (!form) { return; }
    var grid = doc.getElementById('paper-grid');
    if (!grid) { return; }

    var cards = Array.prototype.slice.call(grid.querySelectorAll('.paper-card'));
    if (!cards.length) { return; }

    var search = form.querySelector('[data-paper-search]');
    var selects = Array.prototype.slice.call(form.querySelectorAll('select[data-filter]'));
    var count = doc.querySelector('[data-paper-count]');
    var emptyMsg = doc.querySelector('[data-paper-empty]');
    var total = cards.length;

    function matches(card) {
      if (search) {
        var q = (search.value || '').trim().toLowerCase();
        if (q) {
          var haystack = (card.getAttribute('data-search') || card.textContent || '').toLowerCase();
          if (haystack.indexOf(q) === -1) { return false; }
        }
      }
      for (var i = 0; i < selects.length; i++) {
        var sel = selects[i];
        var value = sel.value;
        if (!value) { continue; }
        var name = sel.getAttribute('data-filter');
        var tokens = (card.getAttribute('data-' + name) || '').toLowerCase().split(/\s+/);
        if (tokens.indexOf(value.toLowerCase()) === -1) { return false; }
      }
      return true;
    }

    function apply() {
      var shown = 0;
      for (var i = 0; i < cards.length; i++) {
        var show = matches(cards[i]);
        if (show) { shown += 1; }
        /* [hidden]{display:none!important} 已在 site.css 声明 */
        if (show) { cards[i].removeAttribute('hidden'); }
        else { cards[i].setAttribute('hidden', ''); }
      }
      if (count) {
        count.textContent = (shown === total)
          ? '显示全部 ' + total + ' 篇论文。'
          : '筛选后显示 ' + shown + ' / ' + total + ' 篇论文。';
      }
      if (emptyMsg) {
        if (shown === 0) { emptyMsg.removeAttribute('hidden'); }
        else { emptyMsg.setAttribute('hidden', ''); }
      }
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      apply();
    });
    form.addEventListener('reset', function () {
      /* reset 清空控件发生在事件之后：推迟一拍再统计。 */
      window.setTimeout(apply, 0);
    });
    if (search) { search.addEventListener('input', apply); }
    for (var j = 0; j < selects.length; j++) {
      selects[j].addEventListener('change', apply);
    }
    apply();
  }

  /* ---------- 3. 详情页移动目录折叠 ----------
     仅处理正文流中的 details.toc（01/07/08/14 等模板）；
     02 类模板的 .toc-mobile 由其内联 CSS 自行响应式，不干预。 */
  function initMobileToc() {
    var details = doc.querySelector('details.toc');
    if (!details || !window.matchMedia) { return; }

    var mq = window.matchMedia('(max-width: 767px)');
    function sync(event) {
      if (event.matches) {
        details.removeAttribute('open');
      } else {
        details.setAttribute('open', '');
      }
    }
    sync(mq);
    if (mq.addEventListener) {
      mq.addEventListener('change', sync);
    } else if (mq.addListener) {
      mq.addListener(sync); /* 旧 Safari */
    }
  }

  /* ---------- 4. 详情页滚动高亮（scroll spy） ---------- */
  function initScrollSpy() {
    var links = Array.prototype.slice.call(doc.querySelectorAll(
      '.toc a[href^="#"], .toc-aside a[href^="#"], .toc-mobile a[href^="#"]'
    ));
    if (!links.length || !('IntersectionObserver' in window)) { return; }

    var entries = []; /* { id, link, section }，按 DOM 顺序 */
    var seen = {};
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href') || '';
      var id = href.slice(1);
      if (!id || seen[id]) { continue; }
      var section = doc.getElementById(id);
      if (!section) { continue; }
      seen[id] = true;
      entries.push({ id: id, link: links[i], section: section });
    }
    if (entries.length < 2) { return; }

    var intersecting = {};
    var activeId = null;

    function setActive(id) {
      if (id === activeId) { return; }
      activeId = id;
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (entry.id === id) {
          entry.link.setAttribute('aria-current', 'location');
          entry.link.className += ' toc-active';
        } else {
          entry.link.removeAttribute('aria-current');
          entry.link.className = entry.link.className
            .replace(/(^|\s)toc-active(\s|$)/g, '$1').replace(/\s+$/g, '');
        }
      }
    }

    function pick() {
      for (var i = 0; i < entries.length; i++) {
        if (intersecting[entries[i].id]) { setActive(entries[i].id); return; }
      }
      /* 视口带内无章节时保持上一个高亮，避免闪烁。 */
    }

    var observer = new IntersectionObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        intersecting[records[i].target.id] = records[i].isIntersecting;
      }
      pick();
    }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });

    for (var j = 0; j < entries.length; j++) {
      observer.observe(entries[j].section);
    }
    setActive(entries[0].id);
  }

  /* ---------- 5. 返回顶部（注入按钮） ---------- */
  function initBackToTop() {
    if (doc.getElementById('back-to-top')) { return; }
    if (!doc.body) { return; }

    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.id = 'back-to-top';
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', '返回页面顶部');
    btn.textContent = '返回顶部';
    btn.hidden = true;

    btn.addEventListener('click', function () {
      var options = { top: 0, left: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' };
      try {
        window.scrollTo(options);
      } catch (err) {
        window.scrollTo(0, 0); /* 旧浏览器不支持 options */
      }
    });

    doc.body.appendChild(btn);

    var ticking = false;
    function update() {
      ticking = false;
      var y = window.pageYOffset || root.scrollTop || 0;
      if (y > 480) { btn.hidden = false; }
      else { btn.hidden = true; }
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        if (window.requestAnimationFrame) {
          window.requestAnimationFrame(update);
        } else {
          window.setTimeout(update, 16);
        }
      }
    }, { passive: true });
    update();
  }

  /* ---------- 启动 ---------- */
  onReady(function () {
    safeInit('主题切换', initThemeToggle);
    safeInit('首页筛选', initHomeFilter);
    safeInit('移动目录', initMobileToc);
    safeInit('滚动高亮', initScrollSpy);
    safeInit('返回顶部', initBackToTop);
  });
})();
