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

  /* 图片亮度检测缓存 */
  var brightnessCache = {};

  function detectBrightness(url, callback) {
    if (brightnessCache[url] !== undefined) {
      callback(brightnessCache[url]);
      return;
    }
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
        brightnessCache[url] = avg > 128 ? 'light' : 'dark';
        callback(brightnessCache[url]);
      } catch (e) {
        brightnessCache[url] = 'dark';
        callback('dark');
      }
    };
    img.onerror = function () {
      brightnessCache[url] = 'dark';
      callback('dark');
    };
    img.src = url;
  }

  /* 从祖先元素的 background 中提取图片 URL */
  function extractBgImage(el) {
    var node = el;
    while (node && node !== document.body) {
      if (node.style) {
        /* 先检查 background-image */
        var bi = node.style.backgroundImage || '';
        var imgMatch = bi.match(/url\(["']?([^"')]+)["']?\)/);
        if (imgMatch) return imgMatch[1];

        /* 再检查 background 简写属性中的 url() */
        var bg = node.style.background || '';
        var bgMatch = bg.match(/url\(["']?([^"')]+)["']?\)/);
        if (bgMatch) return bgMatch[1];
      }
      node = node.parentElement;
    }
    return null;
  }

  /* 检测元素祖先链上是否有有效蒙版/叠加层，返回 'light' / 'dark' / null */
  function detectOverlay(el) {
    var node = el;
    while (node && node !== document.body) {
      /* .glass 类始终视为浅色蒙版 */
      if (node.classList && node.classList.contains('glass')) return 'light';

      if (node.style) {
        var bg = node.style.background || node.style.backgroundColor || '';

        /* 浅色半透明叠加层（R=255，G/B ≥ 200，alpha ≥ 0.4） */
        var lightMatch = bg.match(/rgba\(\s*255\s*,\s*2[0-5][0-9]\s*,\s*2[0-5][0-9]\s*,\s*([0-9.]+)\s*\)/);
        if (lightMatch && parseFloat(lightMatch[1]) >= 0.4) return 'light';

        /* 深色半透明叠加层（R/G/B 均 ≤ 80，alpha ≥ 0.25） */
        var darkMatch = bg.match(/rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*([0-9.]+)\s*\)/);
        if (darkMatch) {
          var r = parseInt(darkMatch[1], 10);
          var g = parseInt(darkMatch[2], 10);
          var b = parseInt(darkMatch[3], 10);
          var a = parseFloat(darkMatch[4]);
          if (r <= 80 && g <= 80 && b <= 80 && a >= 0.25) return 'dark';
        }
      }
      node = node.parentElement;
    }
    return null;
  }

  /* 为每个 [data-contrast-text] 元素独立检测其真实背景 */
  function refreshPerElement() {
    var els = document.querySelectorAll('[data-contrast-text]');
    for (var i = 0; i < els.length; i++) {
      (function (el) {
        var type = el.getAttribute('data-contrast-text') || 'body';
        var ov = detectOverlay(el);

        if (ov === 'light') {
          /* 浅色蒙版 → 深色文字 */
          var ls = LIGHT_BG[type] || LIGHT_BG['body'];
          el.style.color = ls.color;
          el.style.textShadow = ls.textShadow;
        } else if (ov === 'dark') {
          /* 深色蒙版 → 白色文字 */
          var ds = DARK_BG[type] || DARK_BG['body'];
          el.style.color = ds.color;
          el.style.textShadow = ds.textShadow;
        } else {
          /* 无蒙版 → 检测该元素所在区域的真实背景图片 */
          var bgImg = extractBgImage(el);
          if (bgImg) {
            detectBrightness(bgImg, function (theme) {
              var map = theme === 'dark' ? DARK_BG : LIGHT_BG;
              var style = map[type] || map['body'];
              el.style.color = style.color;
              el.style.textShadow = style.textShadow;
            });
          } else {
            /* 没有背景图片 → 尝试全局封面 */
            var cover = '';
            if (window.LoveData && typeof LoveData.getCover === 'function') {
              cover = LoveData.getCover();
            }
            if (cover) {
              detectBrightness(cover, function (theme) {
                var map = theme === 'dark' ? DARK_BG : LIGHT_BG;
                var style = map[type] || map['body'];
                el.style.color = style.color;
                el.style.textShadow = style.textShadow;
              });
            } else {
              var ds2 = DARK_BG[type] || DARK_BG['body'];
              el.style.color = ds2.color;
              el.style.textShadow = ds2.textShadow;
            }
          }
        }
      })(els[i]);
    }
  }

  function init() {
    refreshPerElement();

    /* 监听 localStorage 变化 */
    window.addEventListener('storage', function (e) {
      if (e.key === 'love-data-cover') {
        refreshPerElement();
      }
    });
  }

  /* 暴露全局刷新方法 */
  window.CoverContrast = {
    refresh: refreshPerElement
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();