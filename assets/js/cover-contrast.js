/* 恋爱小站 - 封面亮度检测 & 文字自动反差（性能优化版） */
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

  /* 缓存：内存 + sessionStorage */
  var brightnessCache = {};
  var CACHE_KEY = 'love-cover-brightness-cache';
  var SAMPLE_SIZE = 32;          /* 亮度采样分辨率（足够小，减少 drawImage 开销） */
  var BATCH_DELAY = 60;          /* 批量处理间隔，避免阻塞主线程 */
  var STORAGE_THROTTLE = 2000;   /* 缓存写入 sessionStorage 的间隔 */
  var pendingUrls = [];
  var pendingEls = [];
  var batchTimer = null;
  var saveTimer = null;

  try {
    var raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) brightnessCache = JSON.parse(raw);
  } catch (e) { brightnessCache = {}; }

  function saveCache() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(brightnessCache));
      } catch (e) {}
    }, STORAGE_THROTTLE);
  }

  /* 从祖先元素的 background 中提取图片 URL */
  function extractBgImage(el) {
    var node = el;
    while (node && node !== document.body) {
      if (node.style) {
        var bi = node.style.backgroundImage || '';
        var imgMatch = bi.match(/url\(["']?([^"')]+)["']?\)/);
        if (imgMatch) return imgMatch[1];

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
      if (node.classList && node.classList.contains('glass')) return 'light';

      if (node.style) {
        var bg = node.style.background || node.style.backgroundColor || '';

        var lightMatch = bg.match(/rgba\(\s*255\s*,\s*2[0-5][0-9]\s*,\s*2[0-5][0-9]\s*,\s*([0-9.]+)\s*\)/);
        if (lightMatch && parseFloat(lightMatch[1]) >= 0.4) return 'light';

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

  /* 对单个 URL 进行亮度检测，结果写入缓存 */
  function detectBrightness(url, callback) {
    if (brightnessCache[url] !== undefined) {
      callback(brightnessCache[url]);
      return;
    }

    var img = new Image();
    img.crossOrigin = 'Anonymous';
    img.decoding = 'async';
    img.onload = function () {
      try {
        var canvas = document.createElement('canvas');
        canvas.width = SAMPLE_SIZE;
        canvas.height = SAMPLE_SIZE;
        var ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        var data = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
        var total = 0, count = 0;
        /* 每隔 4 个像素采样一次，进一步减少计算量 */
        for (var i = 0; i < data.length; i += 16) {
          total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          count++;
        }
        var avg = total / count;
        brightnessCache[url] = avg > 128 ? 'light' : 'dark';
        saveCache();
        callback(brightnessCache[url]);
      } catch (e) {
        brightnessCache[url] = 'dark';
        saveCache();
        callback('dark');
      }
    };
    img.onerror = function () {
      brightnessCache[url] = 'dark';
      saveCache();
      callback('dark');
    };
    img.src = url;
  }

  /* 应用样式 */
  function applyStyle(el, type, theme) {
    var map = theme === 'dark' ? DARK_BG : LIGHT_BG;
    var style = map[type] || map['body'];
    el.style.color = style.color;
    el.style.textShadow = style.textShadow;
  }

  /* 处理单个元素 */
  function processElement(el) {
    var type = el.getAttribute('data-contrast-text') || 'body';
    var ov = detectOverlay(el);

    if (ov === 'light') {
      applyStyle(el, type, 'light');
    } else if (ov === 'dark') {
      applyStyle(el, type, 'dark');
    } else {
      var bgImg = extractBgImage(el);
      if (bgImg) {
        detectBrightness(bgImg, function (theme) {
          applyStyle(el, type, theme);
        });
      } else {
        var cover = '';
        if (window.LoveData && typeof LoveData.getCover === 'function') {
          cover = LoveData.getCover();
        }
        if (cover) {
          detectBrightness(cover, function (theme) {
            applyStyle(el, type, theme);
          });
        } else {
          applyStyle(el, type, 'dark');
        }
      }
    }
  }

  /* 批量调度：避免同时创建大量 Image/Canvas */
  function flushBatch() {
    batchTimer = null;
    if (!pendingUrls.length) return;

    var urls = pendingUrls.slice(0, 4);   /* 每批最多 4 个 URL */
    pendingUrls = pendingUrls.slice(4);
    var els = pendingEls.splice(0, elsForUrls(pendingEls, urls));

    urls.forEach(function (url) {
      detectBrightness(url, function () {
        /* 回调中重新触发所有依赖该 URL 的元素样式更新 */
        refreshBatch(els, url);
      });
    });

    if (pendingUrls.length) {
      batchTimer = setTimeout(flushBatch, BATCH_DELAY);
    }
  }

  function elsForUrls(els, urls) {
    var count = 0;
    for (var i = 0; i < els.length; i++) {
      if (urls.indexOf(els[i].url) >= 0) count++;
      else break;
    }
    return count;
  }

  function refreshBatch(els, url) {
    for (var i = 0; i < els.length; i++) {
      if (els[i].url === url) {
        applyStyle(els[i].el, els[i].type, brightnessCache[url] === 'light' ? 'light' : 'dark');
      }
    }
  }

  /* 收集元素并按 URL 分组 */
  function refreshPerElement() {
    var nodeList = document.querySelectorAll('[data-contrast-text]');
    var map = {};
    var order = [];

    for (var i = 0; i < nodeList.length; i++) {
      var el = nodeList[i];
      var type = el.getAttribute('data-contrast-text') || 'body';
      var ov = detectOverlay(el);

      if (ov) {
        applyStyle(el, type, ov === 'light' ? 'light' : 'dark');
        continue;
      }

      var bgImg = extractBgImage(el);
      var url = bgImg;
      if (!url && window.LoveData && typeof LoveData.getCover === 'function') {
        url = LoveData.getCover();
      }
      if (!url) {
        applyStyle(el, type, 'dark');
        continue;
      }

      if (!map[url]) {
        map[url] = [];
        order.push(url);
      }
      map[url].push({ el: el, type: type, url: url });
    }

    /* 按 URL 批量入队 */
    order.forEach(function (url) {
      var list = map[url];
      if (brightnessCache[url] !== undefined) {
        list.forEach(function (item) {
          applyStyle(item.el, item.type, brightnessCache[url] === 'light' ? 'light' : 'dark');
        });
      } else {
        pendingUrls.push(url);
        pendingEls = pendingEls.concat(list);
      }
    });

    if (pendingUrls.length && !batchTimer) {
      batchTimer = setTimeout(flushBatch, BATCH_DELAY);
    }
  }

  function init() {
    /* 优先处理首屏可见元素 */
    refreshPerElement();

    window.addEventListener('storage', function (e) {
      if (e.key === 'love-data-cover') {
        /* 封面变更时清除缓存并重新检测 */
        brightnessCache = {};
        try { sessionStorage.removeItem(CACHE_KEY); } catch (err) {}
        refreshPerElement();
      }
    });
  }

  window.CoverContrast = {
    refresh: refreshPerElement
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
