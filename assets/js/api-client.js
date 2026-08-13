/* 恋爱小站 - ICP Safe 静态数据客户端（v20260813-icp1）
 * ICP_SAFE_MODE = true：生产展示只读取 assets/data/icp-safe-data.json。
 */
(function () {
  'use strict';

  var ICP_SAFE_MODE = true;
  var SAFE_DATA_URL = '../assets/data/icp-safe-data.json?v=20260813-icp1';

  window.ICP_SAFE_MODE = ICP_SAFE_MODE;

  function injectSafeModeStyles() {
    if (document.getElementById('icp-safe-mode-styles')) return;
    var style = document.createElement('style');
    style.id = 'icp-safe-mode-styles';
    style.textContent = [
      '.love-admin-only,.love-admin-form,.love-admin-actions,#love-admin-bar,#love-admin-login-fab,#footer-admin{display:none!important;}',
      '.wishlist-check{pointer-events:none;}'
    ].join('');
    document.head.appendChild(style);
  }

  var cache = {
    loaded: false,
    loading: null,
    data: {
      site: {},
      cover: '',
      avatars: {},
      album: [],
      timeline: [],
      wishlist: [],
      letter: {}
    }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value === undefined ? null : value));
  }

  function assign(target) {
    target = target || {};
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] || {};
      Object.keys(source).forEach(function (key) {
        target[key] = source[key];
      });
    }
    return target;
  }

  function normalizePath(url) {
    if (!url) return '';
    if (url.indexOf('http://') === 0 || url.indexOf('https://') === 0 || url.indexOf('data:') === 0) {
      return url;
    }
    if (url.indexOf('/assets/') === 0) return '..' + url;
    if (url.indexOf('/uploads/') === 0) return url.replace('/uploads/', '../assets/icp-media/');
    return url;
  }

  window.resolveMediaUrl = function (url) {
    return normalizePath(url);
  };

  window.preserveApiRedirect = function (targetUrl) {
    return targetUrl;
  };

  function normalizeAvatars(avatars) {
    avatars = avatars || {};
    return {
      left: {
        nickname: (avatars.left && (avatars.left.nickname || avatars.left.name)) || '嘉嘉小星星',
        name: (avatars.left && (avatars.left.name || avatars.left.nickname)) || '嘉嘉小星星',
        avatar: normalizePath(avatars.left && (avatars.left.avatar || avatars.left.dataUrl)),
        dataUrl: normalizePath(avatars.left && (avatars.left.dataUrl || avatars.left.avatar))
      },
      right: {
        nickname: (avatars.right && (avatars.right.nickname || avatars.right.name)) || '陈卓卓',
        name: (avatars.right && (avatars.right.name || avatars.right.nickname)) || '陈卓卓',
        avatar: normalizePath(avatars.right && (avatars.right.avatar || avatars.right.dataUrl)),
        dataUrl: normalizePath(avatars.right && (avatars.right.dataUrl || avatars.right.avatar))
      }
    };
  }

  function normalizeAlbum(album) {
    return (Array.isArray(album) ? album : []).map(function (group) {
      var normalized = assign({}, group);
      normalized.photos = (Array.isArray(group.photos) ? group.photos : []).map(function (photo) {
        return assign({}, photo, { src: normalizePath(photo.src) });
      });
      return normalized;
    });
  }

  function normalizeTimeline(timeline) {
    return (Array.isArray(timeline) ? timeline : []).map(function (item) {
      return assign({}, item, { cover: normalizePath(item.cover) });
    });
  }

  function normalizeSafeData(raw) {
    raw = raw || {};
    return {
      site: raw.site || {},
      cover: normalizePath(raw.cover || ''),
      avatars: normalizeAvatars(raw.avatars),
      album: normalizeAlbum(raw.album),
      timeline: normalizeTimeline(raw.timeline),
      wishlist: Array.isArray(raw.wishlist) ? raw.wishlist : [],
      letter: raw.letter || {}
    };
  }

  function loadSafeData() {
    if (cache.loaded) return Promise.resolve();
    if (cache.loading) return cache.loading;

    cache.loading = window.fetch(SAFE_DATA_URL, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json' }
    }).then(function (response) {
      if (!response.ok) throw new Error('静态数据加载失败: ' + response.status);
      return response.json();
    }).then(function (json) {
      cache.data = normalizeSafeData(json);
      cache.loaded = true;
      return cache.data;
    }).catch(function (error) {
      cache.loading = null;
      console.error('[ICP Safe] 静态数据加载失败:', error);
      throw error;
    });

    return cache.loading;
  }

  function rejectReadonly() {
    return Promise.reject(new Error('页面暂未开放'));
  }

  function noopReadonly() {
    return false;
  }

  function readLocalImage(file, callback) {
    if (!file || !file.type.match(/^image\//)) {
      callback(new Error('请选择图片文件'), null);
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) { callback(null, e.target.result); };
    reader.onerror = function () { callback(new Error('读取图片失败'), null); };
    reader.readAsDataURL(file);
  }

  var LoveAdmin_Static = {
    ready: loadSafeData,
    getAccounts: function () {
      return clone(cache.data.avatars);
    },
    getAccount: function (side) {
      var accounts = this.getAccounts();
      return accounts[side] || { nickname: '', name: '', avatar: '', dataUrl: '' };
    },
    saveAccounts: noopReadonly,
    updateAccount: function (side) {
      return this.getAccount(side);
    },
    verifyPassword: noopReadonly,
    isLoggedIn: noopReadonly,
    getCurrentIdentity: function () { return null; },
    getCurrentAccount: function () { return null; },
    login: noopReadonly,
    loginAsync: function () { return Promise.resolve(false); },
    logout: noopReadonly,
    switchAccount: noopReadonly,
    ensureLoggedIn: noopReadonly,
    showLoginModal: noopReadonly,
    hideLoginModal: noopReadonly,
    initAdminUI: noopReadonly,
    refreshAdminUI: noopReadonly,
    toast: function () {}
  };

  var LoveData_Static = {
    KEYS: {},
    useApi: false,
    icpSafeMode: true,
    ready: loadSafeData,
    getAvatars: function () { return LoveAdmin_Static.getAccounts(); },
    setAvatars: noopReadonly,
    setAvatar: function (side) { return LoveAdmin_Static.getAccounts(); },
    getAvatar: function (side) { return LoveAdmin_Static.getAccount(side); },
    getCurrentIdentity: function () { return null; },
    getCover: function () { return cache.data.cover || ''; },
    setCover: noopReadonly,
    getSite: function () { return clone(cache.data.site); },
    setSite: noopReadonly,
    applySiteText: function (root) {
      root = root || document;
      var site = this.getSite();
      root.querySelectorAll('[data-site-key]').forEach(function (el) {
        var key = el.dataset.siteKey;
        if (site[key] !== undefined) el.textContent = site[key];
      });
    },
    readLocalImage: readLocalImage,
    getMessages: function () { return []; },
    addMessage: rejectReadonly,
    deleteMessage: rejectReadonly,
    getAlbum: function () { return clone(cache.data.album); },
    saveAlbum: noopReadonly,
    addAlbumGroup: rejectReadonly,
    updateAlbumGroup: function () { return this.getAlbum(); },
    deleteAlbumGroup: rejectReadonly,
    addPhoto: rejectReadonly,
    uploadPhotoAsFile: rejectReadonly,
    deletePhoto: rejectReadonly,
    getWishlist: function () { return clone(cache.data.wishlist); },
    saveWishlist: noopReadonly,
    addWishlist: rejectReadonly,
    updateWishlist: rejectReadonly,
    deleteWishlist: rejectReadonly,
    getTimeline: function () { return clone(cache.data.timeline); },
    saveTimeline: noopReadonly,
    addTimeline: rejectReadonly,
    updateTimeline: function () { return this.getTimeline(); },
    deleteTimeline: rejectReadonly,
    getLetter: function () { return clone(cache.data.letter); },
    saveLetter: noopReadonly,
    resetAll: rejectReadonly,
    exportAllData: function () { return clone(cache.data); },
    importAllData: rejectReadonly,
    uploadCover: rejectReadonly,
    uploadAvatar: rejectReadonly,
    uploadFile: rejectReadonly,
    generateId: function (prefix) {
      return (prefix || 'id') + '-icp-safe';
    },
    startPolling: noopReadonly,
    stopPolling: noopReadonly,
    onUpdate: noopReadonly
  };

  window._originalLoveData = window.LoveData;
  window._originalLoveAdmin = window.LoveAdmin;
  window.LoveData = LoveData_Static;
  window.LoveAdmin = LoveAdmin_Static;

  injectSafeModeStyles();
  loadSafeData().catch(function () {});
  console.log('[ICP Safe] 静态展示模式已启用');
})();
