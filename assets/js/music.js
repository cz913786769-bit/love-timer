/* 恋爱小站 - 全局背景音乐桥接与独立页面兜底 */
(function () {
  'use strict';

  var toggle = document.getElementById('music-toggle');
  var label = document.getElementById('music-label');
  var iconOn = document.getElementById('music-icon');
  var iconOff = document.getElementById('music-icon-off');

  function postToShell(type) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: type }, '*');
    }
  }

  function setButtonState(state) {
    if (!toggle || !label) return;
    if (state && state.loadFailed) {
      label.textContent = '音乐加载失败';
      toggle.setAttribute('aria-label', '音乐加载失败');
      toggle.style.opacity = '0.7';
    } else if (state && !state.paused) {
      label.textContent = '暂停音乐';
      toggle.setAttribute('aria-label', '暂停背景音乐');
      toggle.style.opacity = '1';
    } else {
      label.textContent = '播放音乐';
      toggle.setAttribute('aria-label', '播放背景音乐');
      toggle.style.opacity = '1';
    }
    if (iconOn && iconOff) {
      iconOn.style.display = state && !state.paused ? '' : 'none';
      iconOff.style.display = state && !state.paused ? 'none' : '';
    }
  }

  if (window.top !== window.self) {
    var shellIsPlaying = false;
    var shellUserPaused = false;

    function forwardUserInteraction(event) {
      if (event && event.target && event.target.closest && event.target.closest('#music-toggle')) return;
      if (shellIsPlaying || shellUserPaused) return;
      postToShell('music:user-interaction');
    }

    ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(function (eventName) {
      document.addEventListener(eventName, forwardUserInteraction, { capture: true, passive: true });
    });

    if (toggle) {
      toggle.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        postToShell('music:toggle');
      });
    }

    window.addEventListener('message', function (event) {
      if (event.data && event.data.type === 'music:state') {
        shellIsPlaying = !event.data.paused;
        shellUserPaused = event.data.userPaused === true;
        setButtonState(event.data);
      }
    });

    postToShell('music:request-state');
    return;
  }

  var music = document.getElementById('bg-music');
  if (!music || !toggle || !label) return;

  var KEY_TIME = 'love-music-time';
  var KEY_VOLUME = 'love-music-volume';
  var KEY_USER_PAUSED = 'love-music-user-paused';
  var SAVE_INTERVAL = 5000;
  var lastSavedTime = 0;
  var isPending = false;
  var loadFailed = false;
  var userPaused = readStorage(KEY_USER_PAUSED) === '1';

  function readStorage(key) {
    try { return sessionStorage.getItem(key); } catch (err) { return null; }
  }

  function writeStorage(key, value) {
    try { sessionStorage.setItem(key, value); } catch (err) {}
  }

  function removeStorage(key) {
    try { sessionStorage.removeItem(key); } catch (err) {}
  }

  function readNumber(key, fallback) {
    var value = parseFloat(readStorage(key));
    return Number.isFinite(value) ? value : fallback;
  }

  function saveTime(force) {
    if (music.currentTime <= 0) return;
    var now = Date.now();
    if (!force && now - lastSavedTime < SAVE_INTERVAL) return;
    lastSavedTime = now;
    writeStorage(KEY_TIME, String(Math.floor(music.currentTime)));
  }

  function restoreTimeWhenReady() {
    var savedTime = Math.max(0, parseInt(readStorage(KEY_TIME), 10) || 0);
    if (!savedTime) return;
    function seekToSaved() {
      if (music.duration > 0 && Math.abs(music.currentTime - savedTime) > 2) {
        music.currentTime = Math.min(savedTime, Math.max(0, music.duration - 1));
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
  }

  function updateState() {
    setButtonState({ paused: music.paused, loadFailed: loadFailed });
  }

  function attemptPlay(reason) {
    if (isPending) return;
    if (userPaused && reason !== 'manual') return;
    if (!music.paused) return;
    restoreTimeWhenReady();
    isPending = true;
    music.play().then(function () {
      isPending = false;
      userPaused = false;
      loadFailed = false;
      removeStorage(KEY_USER_PAUSED);
      saveTime(true);
      updateState();
    }).catch(function () {
      isPending = false;
      updateState();
    });
  }

  function pauseByUser() {
    userPaused = true;
    writeStorage(KEY_USER_PAUSED, '1');
    saveTime(true);
    music.pause();
    updateState();
  }

  music.loop = true;
  music.preload = 'metadata';
  music.volume = readNumber(KEY_VOLUME, 0.35);
  music.muted = false;

  toggle.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();
    if (music.paused) {
      userPaused = false;
      removeStorage(KEY_USER_PAUSED);
      attemptPlay('manual');
    } else {
      pauseByUser();
    }
  });

  ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(function (eventName) {
    document.addEventListener(eventName, function (event) {
      if (event.target && event.target.closest && event.target.closest('#music-toggle')) return;
      attemptPlay('unlock');
    }, { capture: true, passive: true, once: true });
  });

  music.addEventListener('error', function () {
    loadFailed = true;
    isPending = false;
    updateState();
  });
  music.addEventListener('play', function () {
    saveTime(true);
    updateState();
  });
  music.addEventListener('pause', function () {
    saveTime(true);
    updateState();
  });
  music.addEventListener('timeupdate', function () {
    saveTime(false);
  });
  music.addEventListener('volumechange', function () {
    writeStorage(KEY_VOLUME, String(music.volume));
  });
  window.addEventListener('pagehide', function () {
    saveTime(true);
  });

  restoreTimeWhenReady();
  updateState();
  attemptPlay('autoplay');

  window.LoveMusic = {
    toggle: function () { toggle.click(); },
    play: function () { attemptPlay('manual'); },
    pause: pauseByUser,
    isPlaying: function () { return !music.paused; },
    getCurrentTime: function () { return music.currentTime; }
  };
})();
