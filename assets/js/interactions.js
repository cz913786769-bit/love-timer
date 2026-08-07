(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function setVisible(el, delay) {
    if (delay) el.style.transitionDelay = delay + 'ms';
    requestAnimationFrame(function () {
      el.classList.add('is-visible');
    });
  }

  ready(function () {
    document.body.classList.add('page-ready');

    // 入场动画：页面加载后直接显示
    document.querySelectorAll('.page-enter').forEach(function (el) {
      var delay = parseFloat(el.dataset.delay) || 0;
      setTimeout(function () { setVisible(el); }, delay);
    });

    // 滚动显现
    var revealEls = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && revealEls.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var delay = parseFloat(entry.target.dataset.delay) || 0;
            setTimeout(function () { setVisible(entry.target); }, delay);
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { setVisible(el); });
    }

    // 按钮点击涟漪
    document.querySelectorAll('.btn-primary, .btn-secondary, .love-admin-btn').forEach(function (btn) {
      if (btn.dataset.ripple === 'off') return;
      var computed = window.getComputedStyle(btn);
      if (computed.position === 'static') btn.style.position = 'relative';
      if (computed.overflow !== 'hidden') btn.style.overflow = 'hidden';

      btn.addEventListener('click', function (e) {
        var rect = btn.getBoundingClientRect();
        var size = Math.max(rect.width, rect.height);
        var x = e.clientX - rect.left - size / 2;
        var y = e.clientY - rect.top - size / 2;
        var circle = document.createElement('span');
        circle.style.cssText = 'position:absolute;border-radius:50%;background:rgba(255,255,255,0.35);pointer-events:none;width:' + size + 'px;height:' + size + 'px;left:' + x + 'px;top:' + y + 'px;transform:scale(0);animation:ripple .55s cubic-bezier(.2,.8,.2,1);';
        btn.appendChild(circle);
        setTimeout(function () { circle.remove(); }, 560);
      });
    });

    // 数字变化时弹跳反馈
    var timerIds = ['days', 'hours', 'minutes', 'seconds'];
    timerIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          if (m.type === 'childList' && el.textContent) {
            el.classList.remove('timer-pop');
            void el.offsetWidth;
            el.classList.add('timer-pop');
          }
        });
      });
      observer.observe(el, { childList: true });
    });
  });

  window.Interactions = {
    popNumber: function (el) {
      if (!el) return;
      el.classList.remove('timer-pop');
      void el.offsetWidth;
      el.classList.add('timer-pop');
    }
  };
})();
