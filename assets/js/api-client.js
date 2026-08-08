/* 恋爱小站 - API 客户端（v2.3 生产默认 API + XHR 兼容）
 * 加载此脚本后，LoveData 和 LoveAdmin 将使用后端 API
 * 认证方式：HttpOnly Cookie（前端无需管理 token）
 * 默认进入 API 模式；?local=1 可紧急回退到 localStorage
 * 正式后端地址：https://api.xiaoxingxing.love
 */
(function () {
  'use strict';

  /* ── 全局媒体 URL 解析（在所有模式下可用） ── */
  window.resolveMediaUrl = function (url) {
    if (!url) return '';
    // 已经是完整 URL 或 data URL，原样返回
    if (url.indexOf('http://') === 0 || url.indexOf('https://') === 0 || url.indexOf('data:') === 0) {
      return url;
    }
    // 服务器上传文件（/uploads/...）→ 拼接到 API 服务器
    if (url.indexOf('/uploads/') === 0) {
      return 'https://api.xiaoxingxing.love' + url;
    }
    // 其他相对路径（前端静态资源如 ../assets/...）保持原样
    return url;
  };

  function getQueryParam(name) {
    var query = window.location.search || '';
    if (query.charAt(0) === '?') query = query.slice(1);
    if (!query) return null;
    var parts = query.split('&');
    for (var i = 0; i < parts.length; i++) {
      var pair = parts[i].split('=');
      var key = decodeURIComponent((pair[0] || '').replace(/\+/g, ' '));
      if (key === name) {
        return decodeURIComponent((pair.slice(1).join('=') || '').replace(/\+/g, ' '));
      }
    }
    return null;
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

  /* ── 全局：保留 ?local=1 的重定向辅助函数 ── */
  window.preserveApiRedirect = function (targetUrl) {
    if (getQueryParam('local') === '1') {
      var sep = targetUrl.indexOf('?') >= 0 ? '&' : '?';
      return targetUrl + sep + 'local=1';
    }
    return targetUrl;
  };

  /* ── 清理 f7cbfdb 残留的 API 模式标记（仅移除 love-use-api，不影响其他数据） ── */
  try { localStorage.removeItem('love-use-api'); } catch (e) {}

  /* ── 检测是否启用 API 模式 ── */
  var API_ENABLED = (function () {
    // 默认启用 API 模式
    // 仅 ?local=1 时回退到旧 localStorage 模式（紧急调试）
    if (getQueryParam('local') === '1') {
      return false;
    }
    return true;
  })();

  if (!API_ENABLED) {
    console.log('[API Client] 紧急 local 模式，使用 localStorage ');
    console.log('[API Client] 提示：移除 ?local=1 即可恢复正常 API 模式');

    // localStorage 模式：提供 ready() 兼容实现（直接 resolve）
    if (window.LoveData) {
      window.LoveData.ready = function () { return Promise.resolve(); };
    }
    if (window.LoveAdmin) {
      window.LoveAdmin.ready = function () { return Promise.resolve(); };
    }
    return;
  }

  console.log('[API Client] API 模式已启用（Cookie Session）');

  /* ── 配置 ── */
  var API_BASE = (function () {
    // 正式后端 API 地址
    return 'https://api.xiaoxingxing.love';
  })();

  var POLL_INTERVAL = 5000; // 5 秒轮询
  var pollTimer = null;
  var lastHash = null;
  var updateCallbacks = [];
  var sessionInfo = null; // { loggedIn, side, nickname, avatar }

  /* ── 工具函数 ── */

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function generateId(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  /* ── HTTP 请求封装（Cookie 认证，credentials: 'include'） ── */

  function withCacheBuster(path) {
    var sep = path.indexOf('?') >= 0 ? '&' : '?';
    return path + sep + '_=' + Date.now();
  }

  function parseJson(text) {
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (err) {
      throw new Error('服务器返回不是 JSON');
    }
  }

  function requestJson(method, path, data, isUpload) {
    var requestPath = method === 'GET' ? withCacheBuster(path) : path;
    var url = API_BASE + requestPath;

    if (window.fetch) {
      var opts = {
        method: method,
        credentials: 'include', // 关键：携带 HttpOnly Cookie
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      };
      if (isUpload) {
        opts.body = data;
      } else if (data) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(data);
      }
      return window.fetch(url, opts).then(function (r) {
        if (!r.ok) throw new Error((isUpload ? '上传失败: ' : '请求失败: ') + r.status);
        return r.json();
      });
    }

    return new Promise(function (resolve, reject) {
      if (!window.XMLHttpRequest) {
        reject(new Error('当前浏览器不支持网络请求'));
        return;
      }

      var xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.withCredentials = true;
      xhr.timeout = 15000;
      xhr.setRequestHeader('Accept', 'application/json');
      if (!isUpload && data) {
        xhr.setRequestHeader('Content-Type', 'application/json');
      }
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(parseJson(xhr.responseText));
          } catch (err) {
            reject(err);
          }
          return;
        }
        reject(new Error((isUpload ? '上传失败: ' : '请求失败: ') + xhr.status));
      };
      xhr.onerror = function () { reject(new Error('网络请求失败')); };
      xhr.ontimeout = function () { reject(new Error('网络请求超时')); };
      xhr.send(isUpload ? data : (data ? JSON.stringify(data) : null));
    });
  }

  function apiGet(path) {
    return requestJson('GET', path);
  }

  function apiPost(path, data) {
    return requestJson('POST', path, data);
  }

  function apiPut(path, data) {
    return requestJson('PUT', path, data);
  }

  function apiDelete(path, data) {
    return requestJson('DELETE', path, data);
  }

  function apiUpload(path, formData) {
    return requestJson('POST', path, formData, true);
  }

  /* ── Session 管理 ── */

  function refreshSession() {
    return apiGet('/api/session').then(function (data) {
      sessionInfo = data;
      return data;
    }).catch(function () {
      sessionInfo = { loggedIn: false };
      return sessionInfo;
    });
  }

  /* ── 缓存 ── */
  var cache = {
    messages: null,
    album: null,
    wishlist: null,
    timeline: null,
    site: null,
    cover: null,
    letter: null,
    accounts: null
  };

  var cacheLoaded = false;
  var cacheLoading = false;
  var cacheLoadPromise = null;

  function normalizeMessage(msg) {
    msg = msg || {};
    return assign({}, msg, {
      createdAt: msg.createdAt || msg.created_at || ''
    });
  }

  function normalizeAlbumGroup(group) {
    group = group || {};
    return assign({}, group, {
      createdBy: group.createdBy || group.created_by || null,
      createdAt: group.createdAt || group.created_at || '',
      photos: Array.isArray(group.photos) ? group.photos : []
    });
  }

  function normalizeTimelineItem(item) {
    item = item || {};
    return assign({}, item, {
      createdBy: item.createdBy || item.created_by || null,
      createdAt: item.createdAt || item.created_at || ''
    });
  }

  function normalizeSite(site) {
    var normalized = {};
    Object.keys(site || {}).forEach(function (key) {
      var cleanKey = key.indexOf('site:') === 0 ? key.slice(5) : key;
      normalized[cleanKey] = site[key];
    });
    return normalized;
  }

  function loadAllCache() {
    if (cacheLoaded) return Promise.resolve();
    if (cacheLoading) return cacheLoadPromise;
    cacheLoading = true;
    cacheLoadPromise = apiGet('/api/data').then(function (data) {
      cache.messages = (data.messages || []).map(normalizeMessage);
      cache.album = (data.album || []).map(normalizeAlbumGroup);
      cache.wishlist = data.wishlist || [];
      cache.timeline = (data.timeline || []).map(normalizeTimelineItem);
      cache.site = normalizeSite(data.site || {});
      cache.cover = data.cover || '';
      cache.letter = data.letter || {};
      cache.accounts = data.accounts || { left: {}, right: {} };
      cacheLoaded = true;
      cacheLoading = false;
    }).catch(function (err) {
      cacheLoading = false;
      console.error('[API Client] 加载数据失败:', err);
      throw err;
    });
    return cacheLoadPromise;
  }

  function invalidateCache() {
    cacheLoaded = false;
    cacheLoading = false;
    cacheLoadPromise = null;
  }

  /* ── 轮询更新（含 Visibility API 优化） ── */

  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(checkUpdates, POLL_INTERVAL);
    console.log('[API Client] 实时更新轮询已启动（每 ' + (POLL_INTERVAL / 1000) + ' 秒）');

    // Visible API：页面隐藏时暂停轮询，节省资源
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        stopPolling();
        console.log('[API Client] 页面隐藏，暂停轮询');
      } else {
        startPolling();
        console.log('[API Client] 页面可见，恢复轮询');
        // 恢复后立即检查一次
        checkUpdates();
      }
    });
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function checkUpdates() {
    apiGet('/api/check-updates').then(function (info) {
      if (lastHash && lastHash !== info.hash) {
        console.log('[API Client] 检测到数据更新，刷新缓存');
        invalidateCache();
        loadAllCache().then(function () {
          lastHash = info.hash;
          notifyCallbacks();
        });
      } else if (!lastHash) {
        lastHash = info.hash;
      }
    }).catch(function () {
      // 静默失败
    });
  }

  function onUpdate(callback) {
    updateCallbacks.push(callback);
  }

  function notifyCallbacks() {
    updateCallbacks.forEach(function (cb) {
      try { cb(); } catch (e) {}
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     LoveAdmin API 替换
     ═══════════════════════════════════════════════════════════════ */

  /* ── 初始化和就绪 Promise ── */
  var dataReadyPromise = null;
  var adminReadyPromise = null;

  function ensureDataReady() {
    if (!dataReadyPromise) {
      dataReadyPromise = loadAllCache().then(function () {
        console.log('[API Client] LoveData.ready() 已完成');
      }).catch(function (err) {
        // 重置 Promise 以便后续重试
        dataReadyPromise = null;
        console.error('[API Client] LoveData.ready() 失败:', err);
        throw err;
      });
    }
    return dataReadyPromise;
  }

  function ensureAdminReady() {
    if (!adminReadyPromise) {
      adminReadyPromise = Promise.all([
        refreshSession(),
        loadAllCache()
      ]).then(function () {
        console.log('[API Client] LoveAdmin.ready() 已完成');
      }).catch(function (err) {
        // 重置 Promise 以便后续重试
        adminReadyPromise = null;
        console.error('[API Client] LoveAdmin.ready() 失败:', err);
        throw err;
      });
    }
    return adminReadyPromise;
  }

  var LoveAdmin_API = {
    getAccounts: function () {
      if (cache.accounts) {
        return clone(cache.accounts);
      }
      return { left: { nickname: '左', password: '', avatar: '' }, right: { nickname: '右', password: '', avatar: '' } };
    },

    saveAccounts: function (accounts) {
      if (accounts.left) {
        apiPut('/api/accounts/left', { nickname: accounts.left.nickname, avatar: accounts.left.avatar }).catch(function () {});
      }
      if (accounts.right) {
        apiPut('/api/accounts/right', { nickname: accounts.right.nickname, avatar: accounts.right.avatar }).catch(function () {});
      }
    },

    getAccount: function (side) {
      var accounts = this.getAccounts();
      return accounts[side] || { nickname: '', password: '', avatar: '' };
    },

    updateAccount: function (side, data) {
      apiPut('/api/accounts/' + side, data).then(function (acc) {
        if (!cache.accounts) cache.accounts = { left: {}, right: {} };
        cache.accounts[side] = cache.accounts[side] || {};
        cache.accounts[side].nickname = acc.nickname;
        cache.accounts[side].avatar = acc.avatar;
      }).catch(function (err) {
        console.error('[API Client] 更新账户失败:', err);
      });
      return this.getAccount(side);
    },

    verifyPassword: function (side, password) {
      return false; // 同步返回 false，异步验证通过 loginAsync
    },

    isLoggedIn: function () {
      return sessionInfo && sessionInfo.loggedIn;
    },

    getCurrentIdentity: function () {
      return (sessionInfo && sessionInfo.side) || null;
    },

    getCurrentAccount: function () {
      var side = (sessionInfo && sessionInfo.side) || null;
      if (!side) return null;
      var accounts = this.getAccounts();
      return accounts[side] || null;
    },

    login: function (side, password) {
      return false; // 同步返回 false，异步通过 loginAsync
    },

    loginAsync: function (side, password) {
      return apiPost('/api/login', { side: side, password: password }).then(function (result) {
        if (result.success) {
          sessionInfo = { loggedIn: true, side: result.side, nickname: result.nickname, avatar: result.avatar };
          invalidateCache();
          return true;
        }
        return false;
      }).catch(function () {
        return false;
      });
    },

    logout: function () {
      apiPost('/api/logout', {}).catch(function () {});
      sessionInfo = { loggedIn: false };
      invalidateCache();
    },

    switchAccount: function (side) {
      // 在 Cookie 模式下不支持切换，需重新登录
      return false;
    },

    ensureLoggedIn: function (callback) {
      if (this.isLoggedIn()) {
        if (callback) callback();
        return;
      }
      this.showLoginModal(callback);
    },

    showLoginModal: function (onSuccess) {
      if (window._originalLoveAdmin && window._originalLoveAdmin.showLoginModal) {
        window._originalLoveAdmin.showLoginModal(onSuccess);
      }
    },

    hideLoginModal: function () {
      if (window._originalLoveAdmin && window._originalLoveAdmin.hideLoginModal) {
        window._originalLoveAdmin.hideLoginModal();
      }
    },

    toast: function (message) {
      if (window._originalLoveAdmin && window._originalLoveAdmin.toast) {
        window._originalLoveAdmin.toast(message);
      }
    },

    refreshAdminUI: function () {
      if (window._originalLoveAdmin && window._originalLoveAdmin.refreshAdminUI) {
        window._originalLoveAdmin.refreshAdminUI();
      }
    },

    initAdminUI: function () {
      if (window._originalLoveAdmin && window._originalLoveAdmin.initAdminUI) {
        window._originalLoveAdmin.initAdminUI();
      }
    },

    ready: function () {
      return ensureAdminReady();
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     LoveData API 替换
     ═══════════════════════════════════════════════════════════════ */

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

  var LoveData_API = {
    KEYS: {},
    useApi: true,

    // 头像
    getAvatars: function () { return LoveAdmin_API.getAccounts(); },
    setAvatars: function (avatars) { LoveAdmin_API.saveAccounts(avatars); },
    setAvatar: function (side, dataUrl) {
      LoveAdmin_API.updateAccount(side, { avatar: dataUrl });
      return LoveAdmin_API.getAccounts();
    },
    getAvatar: function (side) { return LoveAdmin_API.getAccount(side); },
    getCurrentIdentity: function () { return LoveAdmin_API.getCurrentIdentity(); },

    // 封面
    getCover: function () {
      if (cache.cover !== null && cache.cover !== undefined) return cache.cover;
      loadAllCache();
      return '';
    },
    setCover: function (src) {
      cache.cover = src;
      apiPost('/api/cover', { url: src }).catch(function (err) {
        console.error('[API Client] 保存封面失败:', err);
      });
    },

    // 网站设置
    getSite: function () {
      if (cache.site) return clone(cache.site);
      loadAllCache();
      return {};
    },
    setSite: function (site) {
      cache.site = site;
      apiPost('/api/site', site).catch(function (err) {
        console.error('[API Client] 保存设置失败:', err);
      });
    },
    applySiteText: function (root) {
      root = root || document;
      var site = this.getSite();
      root.querySelectorAll('[data-site-key]').forEach(function (el) {
        var key = el.dataset.siteKey;
        if (site[key] !== undefined) el.textContent = site[key];
      });
    },

    readLocalImage: readLocalImage,

    // 留言
    getMessages: function () {
      if (cache.messages) return clone(cache.messages);
      loadAllCache();
      return [];
    },
    addMessage: function (nickname, text) {
      var self = this;
      return apiPost('/api/messages', { nickname: nickname, text: text }).then(function (msg) {
        if (!cache.messages) cache.messages = [];
        cache.messages.unshift(msg);
        invalidateCache();
        return clone(cache.messages);
      }).catch(function (err) {
        console.error('[API Client] 添加留言失败:', err);
        throw err;
      });
    },
    deleteMessage: function (id) {
      return apiDelete('/api/messages/' + id).then(function () {
        if (cache.messages) {
          cache.messages = cache.messages.filter(function (m) { return m.id !== id; });
        }
        invalidateCache();
      });
    },

    // 相册
    getAlbum: function () {
      if (cache.album) return clone(cache.album);
      loadAllCache();
      return [];
    },
    saveAlbum: function (album) {
      cache.album = album;
    },
    addAlbumGroup: function (group) {
      return apiPost('/api/album/group', { date: group.date, title: group.title }).then(function (newGroup) {
        if (!cache.album) cache.album = [];
        cache.album.push(newGroup);
        invalidateCache();
        return clone(cache.album);
      });
    },
    updateAlbumGroup: function (id, updates) {
      if (cache.album) {
        var idx = cache.album.findIndex(function (g) { return g.id === id; });
        if (idx >= 0) cache.album[idx] = assign({}, cache.album[idx], updates);
      }
      invalidateCache();
      return cache.album ? clone(cache.album) : [];
    },
    deleteAlbumGroup: function (id) {
      return apiDelete('/api/album/group/' + id).then(function () {
        if (cache.album) {
          cache.album = cache.album.filter(function (g) { return g.id !== id; });
        }
        invalidateCache();
      });
    },
    addPhoto: function (groupId, photo) {
      var self = this;
      if (photo.src && photo.src.indexOf('data:') === 0) {
        return this.uploadPhotoAsFile(photo.src, groupId, photo.caption);
      }
      return apiPost('/api/album/photo', { groupId: groupId, caption: photo.caption, src: photo.src }).then(function (newPhoto) {
        if (cache.album) {
          var group = cache.album.find(function (g) { return g.id === groupId; });
          if (group) group.photos.push(newPhoto);
        }
        invalidateCache();
        return clone(cache.album);
      });
    },
    uploadPhotoAsFile: function (dataUrl, groupId, caption) {
      var self = this;
      return new Promise(function (resolve, reject) {
        var blob = dataURLtoBlob(dataUrl);
        var formData = new FormData();
        formData.append('photo', blob, 'photo.jpg');
        formData.append('groupId', groupId);
        formData.append('caption', caption || '');
        apiUpload('/api/album/photo', formData).then(function (newPhoto) {
          if (cache.album) {
            var group = cache.album.find(function (g) { return g.id === groupId; });
            if (group) group.photos.push(newPhoto);
          }
          invalidateCache();
          resolve(clone(cache.album));
        }).catch(reject);
      });
    },
    deletePhoto: function (groupId, photoSrc) {
      return apiDelete('/api/album/photo', { groupId: groupId, photoSrc: photoSrc }).then(function () {
        if (cache.album) {
          var group = cache.album.find(function (g) { return g.id === groupId; });
          if (group) {
            group.photos = group.photos.filter(function (p) { return p.src !== photoSrc; });
          }
        }
        invalidateCache();
      });
    },

    // 清单
    getWishlist: function () {
      if (cache.wishlist) return clone(cache.wishlist);
      loadAllCache();
      return [];
    },
    saveWishlist: function (list) { cache.wishlist = list; },
    addWishlist: function (text) {
      return apiPost('/api/wishlist', { text: text }).then(function (item) {
        if (!cache.wishlist) cache.wishlist = [];
        cache.wishlist.push(item);
        invalidateCache();
        return clone(cache.wishlist);
      });
    },
    updateWishlist: function (index, updates) {
      return apiPut('/api/wishlist/' + index, updates).then(function () {
        if (cache.wishlist && cache.wishlist[index]) {
          if (updates.text !== undefined) cache.wishlist[index].text = updates.text;
          if (updates.done !== undefined) cache.wishlist[index].done = updates.done;
        }
        invalidateCache();
        return clone(cache.wishlist);
      });
    },
    deleteWishlist: function (index) {
      return apiDelete('/api/wishlist/' + index).then(function () {
        if (cache.wishlist) cache.wishlist.splice(index, 1);
        invalidateCache();
      });
    },

    // 点滴
    getTimeline: function () {
      if (cache.timeline) return clone(cache.timeline);
      loadAllCache();
      return [];
    },
    saveTimeline: function (list) { cache.timeline = list; },
    addTimeline: function (item) {
      return apiPost('/api/timeline', item).then(function (newItem) {
        if (!cache.timeline) cache.timeline = [];
        cache.timeline.push(newItem);
        invalidateCache();
        return clone(cache.timeline);
      });
    },
    updateTimeline: function (id, updates) {
      if (cache.timeline) {
        var idx = cache.timeline.findIndex(function (i) { return i.id === id; });
        if (idx >= 0) cache.timeline[idx] = assign({}, cache.timeline[idx], updates);
      }
      invalidateCache();
      return cache.timeline ? clone(cache.timeline) : [];
    },
    deleteTimeline: function (id) {
      return apiDelete('/api/timeline/' + id).then(function () {
        if (cache.timeline) {
          cache.timeline = cache.timeline.filter(function (t) { return t.id !== id; });
        }
        invalidateCache();
      });
    },

    // 信件
    getLetter: function () {
      if (cache.letter) return clone(cache.letter);
      loadAllCache();
      return {};
    },
    saveLetter: function (letter) {
      cache.letter = letter;
      apiPost('/api/letter', letter).catch(function (err) {
        console.error('[API Client] 保存信件失败:', err);
      });
    },

    // 备份与恢复
    resetAll: function () {
      return apiPost('/api/reset', {}).then(function () {
        invalidateCache();
      });
    },
    exportAllData: function () {
      return apiGet('/api/export');
    },
    importAllData: function (json) {
      return apiPost('/api/import', { data: json.data || json });
    },

    generateId: generateId,

    // 上传封面文件
    uploadCover: function (file) {
      var formData = new FormData();
      formData.append('cover', file);
      return apiUpload('/api/cover', formData).then(function (result) {
        cache.cover = result.cover;
        return result.cover;
      });
    },

    // 上传头像文件
    uploadAvatar: function (side, file) {
      var formData = new FormData();
      formData.append('avatar', file);
      formData.append('side', side);
      return apiUpload('/api/upload/avatar', formData).then(function (result) {
        if (!cache.accounts) cache.accounts = { left: {}, right: {} };
        if (!cache.accounts[side]) cache.accounts[side] = {};
        cache.accounts[side].avatar = result.url;
        return result.url;
      });
    },

    // 通用上传
    uploadFile: function (file) {
      var formData = new FormData();
      formData.append('file', file);
      return apiUpload('/api/upload', formData).then(function (result) {
        return result.url;
      });
    },

    // 轮询控制
    startPolling: startPolling,
    stopPolling: stopPolling,
    onUpdate: onUpdate,

    ready: function () {
      return ensureDataReady();
    }
  };

  /* ── 辅助函数 ── */

  function dataURLtoBlob(dataURL) {
    var parts = dataURL.split(',');
    var mime = parts[0].match(/:(.*?);/)[1];
    var bytes = atob(parts[1]);
    var arr = new Uint8Array(bytes.length);
    for (var i = 0; i < bytes.length; i++) {
      arr[i] = bytes.charCodeAt(i);
    }
    return new Blob([arr], { type: mime });
  }

  /* ── 替换全局对象 ── */

  window._originalLoveData = window.LoveData;
  window._originalLoveAdmin = window.LoveAdmin;

  window.LoveData = LoveData_API;
  window.LoveAdmin = LoveAdmin_API;

  /* ── 初始化：检查 session + 预加载缓存 ── */

  refreshSession().then(function () {
    console.log('[API Client] Session 已检查:', sessionInfo.loggedIn ? '已登录 (' + sessionInfo.side + ')' : '未登录');
    return loadAllCache();
  }).then(function () {
    console.log('[API Client] 数据缓存已加载');
    startPolling();
  }).catch(function (err) {
    console.warn('[API Client] 初始数据加载失败，将使用空缓存:', err.message);
  });

  console.log('[API Client] API 客户端已就绪');
  console.log('[API Client] 服务器地址:', API_BASE);
  console.log('[API Client] 认证方式: HttpOnly Cookie');
})();
