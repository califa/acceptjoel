/*
 * acceptjoel.com interactions, rewritten without jQuery.
 * Replaces jQuery 1.4 + scrollTo + localScroll + ColorBox with the same behaviour:
 *   - a.mainlink       glides the whole page to the target section
 *   - #portnav links   slide the project carousel inside #portprojects
 *   - a.thiswindow     open in a lightbox (same markup/IDs as ColorBox, so js/colorbox.css still styles it)
 *   - a.newwindow      open in a new tab
 *   - #mailform        opens the visitor's email app (the original posted to a PHP mailer)
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- easing + tween helpers ----------
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }

  function tween(duration, ease, step, done) {
    if (reduceMotion || duration <= 0) { step(1); if (done) done(); return { cancel: function () {} }; }
    var start = null, raf, cancelled = false;
    function frame(now) {
      if (cancelled) return;
      if (start === null) start = now;
      var t = Math.min(1, (now - start) / duration);
      step(ease(t));
      if (t < 1) raf = requestAnimationFrame(frame);
      else if (done) done();
    }
    raf = requestAnimationFrame(frame);
    return { cancel: function () { cancelled = true; cancelAnimationFrame(raf); } };
  }

  function pageOffset(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + window.scrollX, y: r.top + window.scrollY };
  }

  // ---------- whole-page glide (a.mainlink) ----------
  var pageTween = null;

  function glideTo(target) {
    var el = document.getElementById(target);
    if (!el) return;
    if (pageTween) pageTween.cancel();
    var from = { x: window.scrollX, y: window.scrollY };
    var to = pageOffset(el);
    var maxX = document.documentElement.scrollWidth - window.innerWidth;
    var maxY = document.documentElement.scrollHeight - window.innerHeight;
    to.x = Math.max(0, Math.min(to.x, maxX));
    to.y = Math.max(0, Math.min(to.y, maxY));
    var dist = Math.hypot(to.x - from.x, to.y - from.y);
    if (dist < 1) return;
    // Longer trips take a little longer, but never drag: 0.9s to 1.8s.
    var duration = Math.min(1800, 900 + dist / 6);
    pageTween = tween(duration, easeInOutCubic, function (p) {
      window.scrollTo(from.x + (to.x - from.x) * p, from.y + (to.y - from.y) * p);
    }, function () { pageTween = null; });
  }

  // A wheel or touch from the visitor cancels an in-flight glide instead of fighting it.
  ['wheel', 'touchstart', 'keydown'].forEach(function (type) {
    window.addEventListener(type, function (e) {
      if (type === 'keydown' && lightbox.isOpen) return;
      if (pageTween) { pageTween.cancel(); pageTween = null; }
    }, { passive: true });
  });

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.mainlink');
    if (!a) return;
    var hash = a.getAttribute('href');
    if (!hash || hash.charAt(0) !== '#') return;
    e.preventDefault();
    glideTo(hash.slice(1));
  });

  // ---------- project carousel (#portnav -> #portprojects) ----------
  var carousel = document.getElementById('portprojects');
  var carouselTween = null;

  function showProject(id, animate) {
    var item = document.getElementById(id);
    if (!carousel || !item || !carousel.contains(item)) return false;
    if (carouselTween) carouselTween.cancel();
    var from = carousel.scrollLeft;
    var to = item.offsetLeft;
    if (!animate) { carousel.scrollLeft = to; return true; }
    carouselTween = tween(900, easeOutQuart, function (p) {
      carousel.scrollLeft = from + (to - from) * p;
    }, function () { carouselTween = null; });
    return true;
  }

  document.querySelectorAll('#portnav a.portlink').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelectorAll('#portnav li').forEach(function (li) { li.classList.remove('highlighted'); });
      a.parentNode.classList.add('highlighted');
      showProject(a.getAttribute('href').slice(1), true);
    });
  });

  // ---------- deep links on load (#project5, #contact, ...) ----------
  function handleInitialHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    if (showProject(id, false)) {
      var navLink = document.querySelector('#portnav a[href="#' + id + '"]');
      if (navLink) {
        document.querySelectorAll('#portnav li').forEach(function (li) { li.classList.remove('highlighted'); });
        navLink.parentNode.classList.add('highlighted');
      }
      id = 'portfolio';
    }
    var el = document.getElementById(id);
    if (el) { var o = pageOffset(el); window.scrollTo(o.x, o.y); }
  }

  // ---------- new-tab links ----------
  document.querySelectorAll('a.newwindow').forEach(function (a) {
    a.target = '_blank';
    a.rel = 'noopener';
  });

  // ---------- lightbox (ColorBox look-alike) ----------
  var lightbox = (function () {
    var BORDER = 21;          // width of the ColorBox corner/edge images
    var TITLE_W = 200;        // #cboxLoadedContent margin-left from colorbox.css

    function div(id, parent) {
      var d = document.createElement('div');
      if (id) d.id = id;
      if (parent) parent.appendChild(d);
      return d;
    }

    var overlay = div('cboxOverlay', document.body);
    var box = div('colorbox', document.body);
    var wrapper = div('cboxWrapper', box);
    var rowTop = div(null, wrapper), rowMid = div(null, wrapper), rowBot = div(null, wrapper);
    var tl = div('cboxTopLeft', rowTop), tc = div('cboxTopCenter', rowTop), tr = div('cboxTopRight', rowTop);
    var ml = div('cboxMiddleLeft', rowMid), content = div('cboxContent', rowMid), mr = div('cboxMiddleRight', rowMid);
    var bl = div('cboxBottomLeft', rowBot), bc = div('cboxBottomCenter', rowBot), br = div('cboxBottomRight', rowBot);
    [tl, tc, tr, ml, content, mr, bl, bc, br].forEach(function (d) { d.style.float = 'left'; });

    var loaded = div('cboxLoadedContent', content);
    var loadingOverlay = div('cboxLoadingOverlay', content);
    var loadingGraphic = div('cboxLoadingGraphic', content);
    var title = div('cboxTitle', content);
    var next = div('cboxNext', content), prev = div('cboxPrevious', content), close = div('cboxClose', content);
    next.textContent = 'next'; prev.textContent = 'previous'; close.textContent = 'close';
    [next, prev, close].forEach(function (btn) {
      btn.setAttribute('role', 'button');
      btn.tabIndex = 0;
      btn.addEventListener('mouseenter', function () { btn.classList.add('hover'); });
      btn.addEventListener('mouseleave', function () { btn.classList.remove('hover'); });
    });

    // Positioning: fixed to the viewport instead of ColorBox's absolute + scroll math.
    overlay.style.cssText = 'display:none; opacity:0; transition:opacity .35s ease;';
    box.style.cssText = 'display:none; position:fixed; opacity:0; transition:opacity .3s ease;';
    loaded.style.transition = 'opacity .25s ease';
    title.style.transition = 'opacity .25s ease';

    var group = [], index = 0, isOpen = false, size = null, sizeTween = null, token = 0;

    function layout(w, h) {
      // w, h: inner content size (title column + image)
      size = { w: w, h: h };
      var outerW = w + BORDER * 2, outerH = h + BORDER * 2;
      box.style.width = outerW + 'px';
      box.style.height = outerH + 'px';
      box.style.left = Math.round((window.innerWidth - outerW) / 2) + 'px';
      box.style.top = Math.round((window.innerHeight - outerH) / 2) + 'px';
      wrapper.style.width = outerW + 'px';
      wrapper.style.height = outerH + 'px';
      tc.style.width = bc.style.width = content.style.width = w + 'px';
      ml.style.height = mr.style.height = content.style.height = h + 'px';
      loaded.style.width = (w - TITLE_W) + 'px';
      loaded.style.height = h + 'px';
    }

    function animateTo(w, h, done) {
      if (sizeTween) sizeTween.cancel();
      if (!size) { layout(w, h); done(); return; }
      var from = size;
      sizeTween = tween(350, easeInOutCubic, function (p) {
        layout(Math.round(from.w + (w - from.w) * p), Math.round(from.h + (h - from.h) * p));
      }, function () { sizeTween = null; done(); });
    }

    function measureTitle(html) {
      title.innerHTML = html;
      return title.scrollHeight + 8;
    }

    function fit(imgW, imgH, titleH) {
      var maxW = window.innerWidth * 0.95 - BORDER * 2 - TITLE_W;
      var maxH = window.innerHeight * 0.95 - BORDER * 2;
      var scale = Math.min(1, maxW / imgW, maxH / imgH);
      var w = Math.round(imgW * scale), h = Math.round(imgH * scale);
      return { imgW: w, imgH: h, boxW: w + TITLE_W, boxH: Math.max(h, Math.min(titleH, maxH)) };
    }

    function show(i) {
      index = (i + group.length) % group.length;
      var link = group[index];
      var my = ++token;
      var caption = link.getAttribute('caption') || '';
      prev.style.display = next.style.display = group.length > 1 ? '' : 'none';
      loaded.style.opacity = '0';
      title.style.opacity = '0';
      loadingOverlay.style.display = loadingGraphic.style.display = '';

      var img = new Image();
      img.alt = '';
      img.onload = function () {
        if (my !== token) return;
        var titleH = measureTitle(caption);
        var f = fit(img.naturalWidth, img.naturalHeight, titleH);
        img.style.cssText = 'display:block; width:' + f.imgW + 'px; height:' + f.imgH + 'px; cursor:pointer;';
        img.addEventListener('click', function () { if (group.length > 1) show(index + 1); else hide(); });
        // Fade out old content, resize the frame, then fade the new image in.
        setTimeout(function () {
          if (my !== token) return;
          animateTo(f.boxW, f.boxH, function () {
            if (my !== token) return;
            loaded.innerHTML = '';
            loaded.appendChild(img);
            loadingOverlay.style.display = loadingGraphic.style.display = 'none';
            requestAnimationFrame(function () { loaded.style.opacity = '1'; title.style.opacity = '1'; });
          });
        }, size ? 150 : 0);
        // Warm up the neighbours so next/previous feel instant.
        [index + 1, index - 1].forEach(function (n) {
          var g = group[(n + group.length) % group.length];
          if (g) { var pre = new Image(); pre.src = g.href; }
        });
      };
      img.onerror = img.onload;
      img.src = link.href;
    }

    function open(link) {
      var rel = link.getAttribute('rel');
      group = rel ? Array.prototype.slice.call(document.querySelectorAll('a.thiswindow[rel="' + rel + '"]')) : [link];
      if (group.indexOf(link) < 0) group = [link];
      isOpen = true;
      api.isOpen = true;
      size = null;
      layout(320, 240);
      overlay.style.display = box.style.display = 'block';
      requestAnimationFrame(function () { overlay.style.opacity = '0.9'; box.style.opacity = '1'; });
      show(group.indexOf(link));
    }

    function hide() {
      if (!isOpen) return;
      isOpen = false;
      api.isOpen = false;
      token++;
      overlay.style.opacity = '0';
      box.style.opacity = '0';
      setTimeout(function () {
        if (isOpen) return;
        overlay.style.display = box.style.display = 'none';
        loaded.innerHTML = '';
        title.innerHTML = '';
      }, 350);
    }

    overlay.addEventListener('click', hide);
    close.addEventListener('click', hide);
    next.addEventListener('click', function () { show(index + 1); });
    prev.addEventListener('click', function () { show(index - 1); });
    document.addEventListener('keydown', function (e) {
      if (!isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); hide(); }
      else if (e.key === 'ArrowRight' && group.length > 1) { e.preventDefault(); show(index + 1); }
      else if (e.key === 'ArrowLeft' && group.length > 1) { e.preventDefault(); show(index - 1); }
    });
    window.addEventListener('resize', function () {
      if (!isOpen || !size) return;
      var img = loaded.querySelector('img');
      if (!img) return;
      var f = fit(img.naturalWidth, img.naturalHeight, title.scrollHeight + 8);
      img.style.width = f.imgW + 'px'; img.style.height = f.imgH + 'px';
      layout(f.boxW, f.boxH);
    });

    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a.thiswindow');
      if (!a) return;
      e.preventDefault();
      open(a);
    });

    var api = { isOpen: false };
    return api;
  })();

  // ---------- contact form ----------
  var form = document.getElementById('mailform');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var question = form.elements.question.value.trim();
      var msg = form.querySelector('.mailmessage');
      if (!name || !email || !question) {
        msg.classList.add('mailerror');
        msg.innerHTML = '*please fill in <strong>all</strong> items';
        return;
      }
      if (!/^[a-zA-Z0-9._+-]+@[a-zA-Z0-9-]+\.[a-zA-Z.]{2,}$/.test(email)) {
        msg.classList.add('mailerror');
        msg.innerHTML = '*<strong>invalid</strong> email address';
        return;
      }
      var body = '[name]\n ' + name + '\n\n[email]\n ' + email + '\n\n[question]\n ' + question + '\n';
      window.location.href = 'mailto:joel@joelcalifa.com?subject=' + encodeURIComponent('AcceptJoel Email Form') +
        '&body=' + encodeURIComponent(body);
      msg.classList.remove('mailerror');
      msg.innerHTML = 'Your email is <strong>ready to send</strong>';
    });
  }

  if (document.readyState === 'complete') handleInitialHash();
  else window.addEventListener('load', handleInitialHash);
})();
