/* 恋爱小站 - 封面亮度检测 & 文字自动反差 */
(function () {
  'use strict';

  /* 深色背景 → 纯白字 */
  var DARK_BG = {
    'title':    { color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.5)' },
    'subtitle': { color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.4)' },
    'caption':  { color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.4)' },
    'body':     { color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }
  };

  /* 浅色背景 → 纯黑字 */
  var LIGHT_BG = {
    'title':    { color: '#000', textShadow: 'none' },
    'subtitle': { color: '#222', textShadow: 'none' },
    'caption':  { color: '#444', textShadow: 'none' },
    'body':     { color: '#222', textShadow: 'none' }
  };

  function detectBrightness(url, callback) {
    var img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function () {
      try {
        var canvas = document.createElement('canvas');
        var size = 50;
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        var data = ctx.getImageData(0, 0, size, size).data;
        var total = 0, count = 0;
        for (var i = 0; i < data.length; i += 4) {
          total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          count++;
        }
        var avg = total / count;
        callback(avg > 128 ? 'light' : 'dark');
      } catch (e) {
        callback('dark');
      }
    };
    img.onerror = function () { callback('dark'); };
    img.src = url;
  }

  function applyTheme(theme) {
    var map = theme === 'dark' ? DARK_BG : LIGHT_BG;
    var els = document.querySelectorAll('[data-contrast-text]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var type = el.getAttribute('data-contrast-text') || 'body';
      var style = map[type] || map['body'];
      el.style.color = style.color;
      el.style.textShadow = style.textShadow;
    }
  }

  function refresh() {
    var cover = '';
    if (window.LoveData && typeof LoveData.getCover === 'function') {
      cover = LoveData.getCover();
    }
    if (!cover) {
      applyTheme('dark');
      return;
    }
    detectBrightness(cover, applyTheme);
  }

  function init() {
    refresh();

    /* 监听 localStorage 变化，当背景被管理后台修改后自动切换字体颜色 */
    window.addEventListener('storage', function (e) {
      if (e.key === 'love-data-cover') {
        refresh();
      }
    });
  }

  /* 暴露全局刷新方法，供管理后台动态调用 */
  window.CoverContrast = {
    refresh: refresh
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();