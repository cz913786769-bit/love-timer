/* 恋爱小站 - API 客户端（v2.1 独立后端）
 * 加载此脚本后，LoveData 和 LoveAdmin 将使用后端 API 而非 localStorage
 * 认证方式：HttpOnly Cookie（前端无需管理 token）
 * 通过 URL 参数 ?api=1 启用
 * 向后兼容：未启用时保持 localStorage 模式
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

  /* ── 清理 f7cbfdb 残留的 API 模式标记（仅移除 love-use-api，不影响其他数据） ── */
  try { localStorage.removeItem('love-use-api'); } catch (e) {}

  /* ── 检测是否启用 API 模式 ── */
  var API_ENABLED = (function () {
    // 仅通过 URL 参数启用 API 模式
    var params = new URLSearchParams(window.location.search);
    if (params.get('api') === '1') return true;
    return false;
  })();

  if (!API_ENABLED) {
    console.log('[API Client] API 模式未启用，使用 localStorage 模式');
    console.log('[API Client] 提示：在 URL 后添加 ?api=1 即可启用服务器模式');
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

  function fetchOpts(method, body) {
    var opts = {
      method: method,
      credentials: 'include', // 关键：携带 HttpOnly Cookie
      headers: { 'Accept': 'application/json' }
    };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return opts;
  }

  function apiGet(path) {
    return fetch(API_BASE + path, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    }).then(function (r) {
      if (!r.ok) throw new Error('请求失败: ' + r.status);
      return r.json();
    });
  }

  function apiPost(path, data) {
    return fetch(API_BASE + path, fetchOpts('POST', data)).then(function (r) {
      if (!r.ok) throw new Error('请求失败: ' + r.status);
      return r.json();
    });
  }

  function apiPut(path, data) {
    return fetch(API_BASE + path, fetchOpts('PUT', data)).then(function (r) {
      if (!r.ok) throw new Error('请求失败: ' + r.status);
      return r.json();
    });
  }

  function apiDelete(path, data) {
    return fetch(API_BASE + path, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: data ? JSON.stringify(data) : undefined
    }).then(function (r) {
      if (!r.ok) throw new Error('请求失败: ' + r.status);
      return r.json();
    });
  }

  function apiUpload(path, formData) {
    return fetch(API_BASE + path, {
      method: 'POST',
      credentials: 'include',
      body: formData
    }).then(function (r) {
      if (!r.ok) throw new Error('上传失败: ' + r.status);
      return r.json();
    });
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

  function loadAllCache() {
    if (cacheLoaded) return Promise.resolve();
    if (cacheLoading) return cacheLoadPromise;
    cacheLoading = true;
    cacheLoadPromise = apiGet('/api/data').then(function (data) {
      cache.messages = data.messages || [];
      cache.album = data.album || [];
      cache.wishlist = data.wishlist || [];
      cache.timeline = data.timeline || [];
      cache.site = data.site || {};
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
        return self.getMessages();
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
        if (idx >= 0) cache.album[idx] = Object.assign({}, cache.album[idx], updates);
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
      if (photo.src && photo.src.startsWith('data:')) {
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
        if (idx >= 0) cache.timeline[idx] = Object.assign({}, cache.timeline[idx], updates);
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
    onUpdate: onUpdate
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