/* Mobile navigation keeps the document owning fullscreen alive. */
(function () {
  'use strict';
  const pages = new Map();
  const root = document.documentElement;
  let current, position = 0, visit, navigation = 0, controller, exiting = false, exitTimer;
  let status, pendingDestination, started = false;
  const nativeFrame = window.requestAnimationFrame.bind(window);
  const frame = () => new Promise(resolve => nativeFrame(resolve));
  const routeNames = {
    '/': 'home', '/index': 'home', '/index.html': 'home',
    '/product': 'book', '/product.html': 'book', '/products/ooga-booga-hardcover': 'book',
    '/tshirt': 'tshirt', '/tshirt.html': 'tshirt', '/plushie': 'plushie', '/plushie.html': 'plushie'
  };
  const documents = { home: '/index.html', book: '/product.html', tshirt: '/tshirt.html', plushie: '/plushie.html' };
  function route(url) {
    return url.origin === location.origin ? routeNames[url.pathname.replace(/\/$/, '') || '/'] : null;
  }
  function entry() { return window.OogaSiteEntry; }

  class PageScope {
    constructor() {
      this.active = true; this.disposed = false; this.listeners = []; this.frames = new Set(); this.timers = new Set();
      this.observers = []; this.triggers = []; this.clocks = []; this.cleanups = []; this.pausedClocks = new Map();
      this.frame = fn => {
        const job = { fn, id: null }; this.frames.add(job); this.scheduleFrame(job); return job;
      };
      this.timeout = (fn, delay = 0) => {
        const job = { fn, remaining: delay, id: null, start: 0 }; this.timers.add(job); this.scheduleTimer(job); return job;
      };
      const scope = this;
      this.Observer = window.ResizeObserver && class {
        constructor(callback) {
          this.targets = new Map(); this.native = new ResizeObserver((...args) => { if (scope.active) callback(...args); });
          scope.observers.push(this);
        }
        observe(target, options) { this.targets.set(target, options); if (scope.active) this.native.observe(target, options); }
        unobserve(target) { this.targets.delete(target); this.native.unobserve(target); }
        disconnect() { this.targets.clear(); this.native.disconnect(); }
      };
    }
    listen(target, type, handler, options) {
      if (!target) return;
      const item = { target, type, options, done: false };
      item.handler = function (...args) {
        if (item.options && item.options.once) item.done = true;
        return handler.apply(this, args);
      };
      this.listeners.push(item);
      if (this.active) target.addEventListener(type, item.handler, options);
    }
    scheduleFrame(job) {
      if (!this.active || this.disposed) return;
      job.id = nativeFrame(time => { this.frames.delete(job); if (this.active) job.fn(time); });
    }
    scheduleTimer(job) {
      if (!this.active || this.disposed) return;
      job.start = performance.now();
      job.id = window.setTimeout(() => { this.timers.delete(job); if (this.active) job.fn(); }, job.remaining);
    }
    suspend() {
      if (!this.active) return;
      this.active = false;
      this.listeners.forEach(l => l.target.removeEventListener(l.type, l.handler, l.options));
      this.frames.forEach(j => { cancelAnimationFrame(j.id); j.id = null; });
      this.timers.forEach(j => { clearTimeout(j.id); j.remaining = Math.max(0, j.remaining - (performance.now() - j.start)); j.id = null; });
      this.observers.forEach(o => o.native.disconnect());
      this.triggers.forEach(t => t.disable(false));
      this.clocks.forEach(clock => { clock.getDelta(); this.pausedClocks.set(clock, clock.elapsedTime); });
      if (this.video) {
        this.videoIntent = this.video.readyState === 0 ? this.video.autoplay || !this.video.paused : !this.video.paused;
        this.video.autoplay = false; this.video.pause();
      }
    }
    resume() {
      if (this.active || this.disposed) return;
      this.active = true;
      this.clocks.forEach(clock => { clock.getDelta(); if (this.pausedClocks.has(clock)) clock.elapsedTime = this.pausedClocks.get(clock); });
      this.listeners.filter(l => !l.done).forEach(l => l.target.addEventListener(l.type, l.handler, l.options));
      this.observers.forEach(o => o.targets.forEach((options, target) => o.native.observe(target, options)));
      this.triggers.forEach(t => t.enable(false));
      this.frames.forEach(j => this.scheduleFrame(j));
      this.timers.forEach(j => this.scheduleTimer(j));
      if (this.video && this.videoIntent) this.video.play().catch(() => {});
    }
    dispose() {
      this.suspend(); this.disposed = true;
      this.triggers.forEach(t => t.kill()); this.cleanups.forEach(fn => fn());
      this.frames.clear(); this.timers.clear(); this.listeners.length = 0;
    }
  }

  function metadata(index, url, saved) {
    return { ...(saved || {}), oogaSite: { visit, position: index, url: url.href } };
  }
  function saveVisit() {
    try { sessionStorage.setItem('ooga.siteVisit.v1', JSON.stringify({ visit })); } catch (_) { /* Storage is optional. */ }
  }
  function savePage(updateHistory = true) {
    if (!current) return;
    current.scroll = scrollY;
    current.focus = document.activeElement;
    const state = history.state;
    if (updateHistory && state && state.oogaSite && state.oogaSite.visit === visit && state.oogaSite.url === current.url.href) {
      history.replaceState({ ...state, oogaSite: { ...state.oogaSite, scroll: current.scroll } }, '', location.href);
    }
  }
  function persistent(node) {
    return node.nodeType === 1 && (node.matches('[data-site-persistent],#homeEntryScreen,#siteNavigationStatus,#siteCartTemplate') || node.tagName === 'SCRIPT');
  }
  function contentNodes(doc) { return Array.from(doc.body.childNodes).filter(n => !persistent(n)); }
  function capture(doc, key, url) {
    const styles = Array.from(doc.querySelectorAll('style[data-site-page-style]'));
    return { key, url, title: doc.title, description: doc.querySelector('meta[name="description"]')?.content || '',
      classes: doc.body.className, nodes: contentNodes(doc), styles, initialized: false, scroll: 0, focus: null, fragment: document.createDocumentFragment() };
  }
  function prepareHeader(doc) {
    const header = doc.querySelector('#SiteHeader'); if (!header) return;
    const nav = header.querySelector('.main-nav-wrapper'), actions = header.querySelector('.header-actions');
    if (!nav || !actions) return;
    nav.id = 'homeMobileNav';
    if (!actions.querySelector('.home-menu-toggle')) {
      const button = doc.createElement('button'); button.type = 'button'; button.className = 'home-menu-toggle';
      button.textContent = 'Menu'; button.setAttribute('aria-controls', nav.id); button.setAttribute('aria-expanded', 'false'); actions.append(button);
    }
    if (!nav.querySelector('.home-landscape-exit-item')) {
      const item = doc.createElement('li'); item.className = 'home-landscape-exit-item'; item.hidden = true;
      const button = doc.createElement('button'); button.type = 'button'; button.className = 'nav-link home-landscape-exit'; button.textContent = 'Exit landscape';
      item.append(button); nav.querySelector('ul').append(item);
    }
  }
  function ownCart() {
    if (!document.querySelector('#cartDrawer')) {
      const template = document.querySelector('#siteCartTemplate');
      if (template) document.body.append(template.content.cloneNode(true));
    }
    document.querySelectorAll('#cartDrawer,#cartOverlay').forEach(node => { node.dataset.sitePersistent = ''; });
  }
  function normalizeAssets(doc, responseUrl) {
    const assetBase = new URL('/', responseUrl);
    doc.body.querySelectorAll('[src],[href],[data-model-url],[data-home-video-src],[data-portrait-src]').forEach(el => {
      for (const name of ['src', 'href', 'data-model-url', 'data-home-video-src', 'data-portrait-src']) {
        const value = el.getAttribute(name); if (!value) continue;
        if (/^(?:\.\/)?assets\//.test(value)) {
          const absolute = new URL(value.replace(/^\.\//, ''), assetBase).href;
          if (el.tagName !== 'VIDEO' || name !== 'src' || el.src !== absolute) el.setAttribute(name, absolute);
        }
        else if (name === 'href' && /^(?:index|product|tshirt|plushie)\.html(?:[?#]|$)/.test(value)) el.setAttribute(name, new URL(value, assetBase).href);
      }
    });
  }
  async function loadPage(key, url, signal) {
    if (pages.has(key)) return pages.get(key);
    const source = new URL(documents[key], location.origin); source.search = url.search;
    const response = await fetch(source, { signal, credentials: 'same-origin', headers: { Accept: 'text/html' } });
    if (!response.ok || new URL(response.url).origin !== location.origin) throw new Error('Page unavailable');
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    if (doc.body.dataset.sitePage !== key || !doc.querySelector('#SiteHeader') || !doc.querySelector('main,.product-page-main')) throw new Error('Unexpected page');
    normalizeAssets(doc, response.url); prepareHeader(doc);
    doc.querySelectorAll('script,#cartDrawer,#cartOverlay,#siteCartTemplate,#homeEntryScreen').forEach(el => el.remove());
    const page = capture(doc, key, url); pages.set(key, page); return page;
  }
  async function waitForLandscape(signal) {
    while (!entry().isLandscape()) {
      if (signal.aborted || exiting) throw new DOMException('Navigation cancelled', 'AbortError');
      await frame();
    }
  }
  function showStatus(message, error) {
    status.replaceChildren(); status.hidden = false; status.setAttribute('role', error ? 'alert' : 'status');
    const text = document.createElement('span'); text.textContent = message; status.append(text);
    if (error) {
      for (const [label, action] of [['Try again', () => navigate(pendingDestination.url, pendingDestination.options)], ['Stay here', stayHere]]) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.addEventListener('click', action); status.append(button);
      }
    }
  }
  function stayHere() {
    navigation++; controller?.abort(); status.hidden = true;
    if (pendingDestination?.options.pop) history.replaceState(metadata(position, current.url, history.state), '', current.url);
    pendingDestination = null;
  }
  function hidePage(page) {
    window.OogaPageRuntime.suspend(page.key);
    page.styles.forEach(style => style.remove());
    page.nodes.forEach(node => page.fragment.append(node));
  }
  async function activate(page, url, options, token) {
    const previous = current;
    savePage(!options.pop);
    root.dataset.siteSwapping = 'true';
    hidePage(previous);
    page.styles.forEach(style => document.head.append(style));
    page.nodes.forEach(node => document.body.append(node));
    document.body.className = page.classes;
    document.body.dataset.sitePage = page.key;
    current = page;
    entry().refreshLayout();
    try {
      if (!page.initialized) document.querySelectorAll('video[data-home-video-src]').forEach(video => { video.src = video.dataset.homeVideoSrc; video.autoplay = true; });
      if (!page.initialized) { window.OogaPageRuntime.mount(page.key); page.initialized = true; }
      else window.OogaPageRuntime.resume(page.key);
      await frame(); await frame();
      if (exiting) {
        hidePage(page); previous.styles.forEach(style => document.head.append(style)); previous.nodes.forEach(node => document.body.append(node));
        current = previous; document.body.className = previous.classes; document.body.dataset.sitePage = previous.key;
        window.OogaPageRuntime.resume(previous.key); delete root.dataset.siteSwapping; return;
      }
      if (queued?.options.pop) { delete root.dataset.siteSwapping; return; }
      if (!options.pop) {
        position++; history.pushState(metadata(position, url), '', url.href);
      } else position = options.position;
      page.url = url;
      document.title = page.title;
      const description = document.querySelector('meta[name="description"]'); if (description) description.content = page.description;
      status.hidden = true; pendingDestination = null;
      delete root.dataset.siteSwapping;
      entry().refreshLayout();
      if (url.hash) {
        try { document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView({ behavior: 'instant' }); } catch (_) { /* Ignore malformed fragments. */ }
      } else scrollTo({ top: options.pop ? options.scroll ?? page.scroll : 0, behavior: 'instant' });
      const focus = options.pop && page.focus?.isConnected ? page.focus : document.querySelector('main,.product-page-main');
      if (focus && entry().isLandscape()) {
        if (!focus.hasAttribute('tabindex')) focus.setAttribute('tabindex', '-1');
        focus.focus({ preventScroll: true });
      }
    } catch (error) {
      hidePage(page); previous.styles.forEach(style => document.head.append(style)); previous.nodes.forEach(node => document.body.append(node));
      current = previous; document.body.className = previous.classes; document.body.dataset.sitePage = previous.key;
      window.OogaPageRuntime.resume(previous.key); delete root.dataset.siteSwapping; entry().refreshLayout();
      window.OogaPageRuntime.dispose(page.key); pages.delete(page.key);
      scrollTo({ top: previous.scroll, behavior: 'instant' }); throw error;
    }
  }
  let committing = false, queued;
  async function navigate(url, options = {}) {
    if (committing) { queued = { url, options }; return; }
    const key = route(url); if (!key || exiting) return;
    if (options.pop) position = options.position;
    const token = ++navigation;
    controller?.abort(); controller = new AbortController();
    const request = controller;
    let timeout;
    pendingDestination = { url, options }; showStatus('Loading page…', false);
    try {
      const page = await Promise.race([
        (async () => { const loaded = await loadPage(key, url, request.signal); await entry().preparePage(key); return loaded; })(),
        new Promise((_, reject) => { timeout = setTimeout(() => { reject(new Error('Page timed out')); request.abort(); }, 30000); })
      ]);
      clearTimeout(timeout);
      await waitForLandscape(request.signal);
      if (token !== navigation || exiting) return;
      committing = true;
      if (page === current) {
        savePage(!options.pop);
        if (!options.pop) { position++; history.pushState(metadata(position, url), '', url.href); }
        else position = options.position;
        page.url = url;
        if (url.hash) { try { document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView({ behavior: 'instant' }); } catch (_) {} }
        else scrollTo({ top: options.pop ? options.scroll ?? page.scroll : 0, behavior: 'instant' });
        status.hidden = true; pendingDestination = null;
      } else await activate(page, url, options, token);
    } catch (error) {
      if (token === navigation && !exiting && error.name !== 'AbortError') showStatus('We couldn’t open this page.', true);
    } finally {
      clearTimeout(timeout);
      committing = false;
      if (queued) { const next = queued; queued = null; navigate(next.url, next.options); }
    }
  }
  function exitSite(fromPosition = position) {
    if (exiting) return;
    exiting = true; navigation++; controller?.abort(); queued = null; status.hidden = true;
    entry().releaseLandscape();
    history.go(-(fromPosition + 1));
    exitTimer = setTimeout(() => {
      exiting = false;
      entry().exitUnavailable();
    }, 1500);
  }
  function start() {
    if (started) return;
    started = true;
    normalizeAssets(document, location.href);
    ownCart(); prepareHeader(document);
    const url = new URL(location.href), key = document.body.dataset.sitePage;
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem('ooga.siteVisit.v1')); } catch (_) { /* A fresh visit is fine. */ }
    const old = history.state?.oogaSite;
    const restored = typeof old?.visit === 'string' && Number.isInteger(old.position) && old.position >= 0 &&
      (old.visit === saved?.visit || typeof old.url === 'string');
    visit = restored ? old.visit : Date.now().toString(36) + Math.random().toString(36).slice(2);
    position = old?.visit === visit && Number.isInteger(old.position) ? old.position : 0;
    history.replaceState(metadata(position, url, history.state), '', url.href); history.scrollRestoration = 'manual'; saveVisit();
    status = document.createElement('div'); status.id = 'siteNavigationStatus'; status.dataset.sitePersistent = ''; status.hidden = true; document.body.append(status);
    current = capture(document, key, url); pages.set(key, current);
    window.OogaPageRuntime.mount(key); current.initialized = true;
    document.addEventListener('click', event => {
      const link = event.target.closest('a[href]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
      const destination = new URL(link.href);
      if (!/^https?:$/.test(destination.protocol) || !route(destination)) return;
      if (destination.href === location.href) { event.preventDefault(); return; }
      event.preventDefault(); navigate(destination);
    });
    window.addEventListener('popstate', event => {
      if (exiting) return;
      const target = event.state?.oogaSite;
      if (!target || target.visit !== visit) return;
      if (!entry().isLandscape() && target.position < position) { exitSite(target.position); return; }
      navigate(new URL(location.href), { pop: true, position: target.position, scroll: target.scroll });
    });
    window.addEventListener('pagehide', () => { savePage(); clearTimeout(exitTimer); navigation++; controller?.abort(); window.OogaPageRuntime.suspend(current.key); });
    window.addEventListener('pageshow', () => {
      if (!current) return;
      exiting = false;
      const target = history.state?.oogaSite;
      if (target?.visit === visit && (target.position !== position || location.href !== current.url.href)) {
        navigate(new URL(location.href), { pop: true, position: target.position, scroll: target.scroll });
      } else window.OogaPageRuntime.resume(current.key);
      entry().refreshLayout();
    });
  }
  window.OogaMobileSite = { start, exitSite, createScope: () => new PageScope(), get activePage() { return current?.key; } };
})();
