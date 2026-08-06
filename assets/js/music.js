/* 恋爱小站 - 背景音乐跨页面控制 */
(function () {
  'use strict';

  var music = document.getElementById('bg-music');
  var toggle = document.getElementById('music-toggle');
  var label = document.getElementById('music-label');
  var iconOn = document.getElementById('music-icon');
  var iconOff = document.getElementById('music-icon-off');
  if (!music || !toggle || !label) return;

  music.volume = 0.35;
  music.muted = false;

  var KEY_ENABLED = 'love-music-enabled';
  var KEY_PLAYING = 'love-music-playing';
  var loadFailed = false;
  var isPending = false;

  function isHome() {
    var path = window.location.pathname;
    return path.endsWith('index.html') || path.endsWith('/') || path.endsWith('/pages/');
  }

  function updateIcon(paused) {
    if (!iconOn || !iconOff) return;
    iconOn.style.display = paused ? 'none' : '';
    iconOff.style.display = paused ? '' : 'none';
  }

  function updateLabel() {
    if (loadFailed) {
      label.textContent = '音乐加载失败';
      toggle.setAttribute('aria-label', '音乐加载失败');
      toggle.style.opacity = '0.7';
      updateIcon(music.paused);
      return;
    }
    label.textContent = music.paused ? '播放音乐' : '暂停音乐';
    toggle.setAttribute('aria-label', music.paused ? '播放背景音乐' : '暂停背景音乐');
    toggle.style.opacity = '1';
    updateIcon(music.paused);
  }

  function setPlaying(playing) {
    sessionStorage.setItem(KEY_PLAYING, playing ? '1' : '0');
  }

  function isPlaying() {
    return sessionStorage.getItem(KEY_PLAYING) === '1';
  }

  function isEnabled() {
    return sessionStorage.getItem(KEY_ENABLED) === '1';
  }

  function enableMusic() {
    // 只有第一次点击导航链接时才自动开启音乐；
    // 之后切换页面保持用户当前的播放/暂停状态
    if (!isEnabled()) {
      sessionStorage.setItem(KEY_ENABLED, '1');
      sessionStorage.setItem(KEY_PLAYING, '1');
    }
  }

  function tryPlay() {
    if (loadFailed || isPending) return;
    isPending = true;
    // 乐观更新：先显示暂停状态，避免等待音频缓冲时按钮无反馈
    label.textContent = '暂停音乐';
    toggle.setAttribute('aria-label', '暂停背景音乐');
    updateIcon(false);

    music.play().then(function () {
      setPlaying(true);
      sessionStorage.setItem(KEY_ENABLED, '1');
      isPending = false;
      updateLabel();
    }).catch(function (err) {
      // 自动播放受限或用户未交互时，恢复播放状态
      setPlaying(false);
      isPending = false;
      updateLabel();
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[love-music] 播放失败:', err && err.message ? err.message : err);
      }
    });
  }

  // 监听音频加载错误（文件缺失、路径错误、格式不支持等）
  music.addEventListener('error', function () {
    loadFailed = true;
    setPlaying(false);
    isPending = false;
    updateLabel();
  });

  // 音频可以播放时，重置失败标记
  music.addEventListener('canplay', function () {
    if (loadFailed) {
      loadFailed = false;
      updateLabel();
    }
  });

  // 初始化按钮文字
  updateLabel();

  // 首次打开首页不自动播放；
  // 从子页面返回首页、或进入其他页面时，如果用户已开启音乐，则继续自动播放
  if (isEnabled() && isPlaying()) {
    tryPlay();
  }

  // 点击任意导航链接时启用音乐，跳转后继续播放
  document.querySelectorAll('a[href$=".html"]').forEach(function (link) {
    link.addEventListener('click', function () {
      enableMusic();
    });
  });

  // 按钮切换播放/暂停
  toggle.addEventListener('click', function () {
    if (isPending) return; // 防止播放 Promise 期间重复点击导致状态错乱

    if (loadFailed) {
      // 如果之前加载失败，尝试重新加载一次
      music.load();
      loadFailed = false;
      updateLabel();
      tryPlay();
      return;
    }

    if (music.paused) {
      tryPlay();
    } else {
      music.pause();
      setPlaying(false);
      updateLabel();
    }
  });

  music.addEventListener('play', updateLabel);
  music.addEventListener('pause', updateLabel);
})();
