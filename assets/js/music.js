/* 恋爱小站 - 背景音乐跨页面无缝播放 */
/* 如果在 iframe 内运行（壳层已接管），则不执行 */
if (window.top === window.self) (function () {
  'use strict';

  var music = document.getElementById('bg-music');
  var toggle = document.getElementById('music-toggle');
  var label = document.getElementById('music-label');
  var iconOn = document.getElementById('music-icon');
  var iconOff = document.getElementById('music-icon-off');
  if (!music || !toggle || !label) return;

  var KEY_ENABLED = 'love-music-enabled';
  var KEY_TIME = 'love-music-time';
  var KEY_VOLUME = 'love-music-volume';

  music.loop = true;
  music.preload = 'auto';
  music.volume = parseFloat(localStorage.getItem(KEY_VOLUME)) || 0.35;
  music.muted = false;

  var loadFailed = false;
  var isPending = false;
  var userInteracted = false;

  /* ── 状态持久化 ── */

  function saveTime() {
    if (!music.paused && music.currentTime > 0) {
      localStorage.setItem(KEY_TIME, Math.floor(music.currentTime));
    }
  }

  function wasEnabled() {
    return localStorage.getItem(KEY_ENABLED) === '1';
  }

  function getSavedTime() {
    return parseInt(localStorage.getItem(KEY_TIME), 10) || 0;
  }

  /* ── UI 更新 ── */

  function updateIcon() {
    if (!iconOn || !iconOff) return;
    iconOn.style.display = music.paused ? 'none' : '';
    iconOff.style.display = music.paused ? '' : 'none';
  }

  function updateLabel() {
    if (loadFailed) {
      label.textContent = '音乐加载失败';
      toggle.setAttribute('aria-label', '音乐加载失败');
      toggle.style.opacity = '0.7';
    } else if (music.paused) {
      label.textContent = '播放音乐';
      toggle.setAttribute('aria-label', '播放背景音乐');
      toggle.style.opacity = '1';
    } else {
      label.textContent = '暂停音乐';
      toggle.setAttribute('aria-label', '暂停背景音乐');
      toggle.style.opacity = '1';
    }
    updateIcon();
  }

  /* ── 播放控制 ── */

  function tryPlay() {
    if (loadFailed || isPending) return;
    if (!music.paused) return; // 已经在播放，不重复操作
    isPending = true;

    music.play().then(function () {
      localStorage.setItem(KEY_ENABLED, '1');
      isPending = false;
      updateLabel();
      saveTime();
    }).catch(function () {
      isPending = false;
      updateLabel();
    });
  }

  function pauseMusic() {
    saveTime();
    music.pause();
    updateLabel();
  }

  function toggleMusic() {
    if (isPending) return;

    if (loadFailed) {
      music.load();
      loadFailed = false;
      updateLabel();
      tryPlay();
      return;
    }

    if (music.paused) {
      tryPlay();
    } else {
      pauseMusic();
    }
  }

  /* ── 事件监听 ── */

  music.addEventListener('error', function () {
    loadFailed = true;
    isPending = false;
    updateLabel();
  });

  music.addEventListener('canplay', function () {
    if (loadFailed) {
      loadFailed = false;
      updateLabel();
    }
  });

  music.addEventListener('play', function () {
    updateLabel();
    saveTime();
  });
  music.addEventListener('pause', function () {
    updateLabel();
    saveTime();
  });

  // 每秒保存播放位置，确保切换页面时精确定位
  music.addEventListener('timeupdate', function () {
    saveTime();
  });

  music.addEventListener('volumechange', function () {
    localStorage.setItem(KEY_VOLUME, music.volume);
  });

  // 音乐按钮切换（阻止冒泡到全局点击）
  toggle.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    toggleMusic();
  });

  /* ── 全局首次交互：点击页面任意位置激活音乐 ── */

  function onFirstInteraction() {
    if (userInteracted) return;
    userInteracted = true;
    localStorage.setItem(KEY_ENABLED, '1');
    tryPlay();
  }

  document.addEventListener('click', onFirstInteraction, { once: false });
  document.addEventListener('touchstart', onFirstInteraction, { once: false });

  /* ── 页面加载时恢复 ── */

  updateLabel();

  // 如果之前已启用音乐，自动恢复播放位置并继续播放
  if (wasEnabled()) {
    var savedTime = getSavedTime();

    // 设置音频起始位置
    function seekToSaved() {
      if (savedTime > 0 && music.duration > 0 && Math.abs(music.currentTime - savedTime) > 2) {
        music.currentTime = savedTime;
      }
    }

    if (music.readyState >= 1) {
      seekToSaved();
    } else {
      music.addEventListener('loadedmetadata', function once() {
        seekToSaved();
        music.removeEventListener('loadedmetadata', once);
      });
    }
    music.addEventListener('canplay', function once() {
      seekToSaved();
      music.removeEventListener('canplay', once);
    });

    // 切换页面时自动恢复播放
    tryPlay();
  }

  // 暴露 API
  window.LoveMusic = {
    toggle: toggleMusic,
    isPlaying: function () { return !music.paused; },
    getCurrentTime: function () { return music.currentTime; }
  };

})();