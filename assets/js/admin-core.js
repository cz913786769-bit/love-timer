/* 恋爱小站 - 管理后台核心（双账户认证 + 登录弹窗 + 工具栏） */
(function () {
  'use strict';

  var ACCOUNTS_KEY = 'love-admin-accounts';
  var SESSION_KEY = 'love-admin-session';
  var VALID_SIDES = ['left', 'right'];
  var IS_IN_IFRAME = window.self !== window.top;
  var ADMIN_FLOAT_POS = IS_IN_IFRAME ? 'left:20px' : 'right:20px';
  var DEFAULT_ACCOUNTS = {
    left: { password: 'qixi2026', nickname: '嘉嘉小星星', avatar: '../assets/avatars/jiajia.png' },
    right: { password: 'qixi2026', nickname: '陈卓卓', avatar: '../assets/avatars/chenzhuozhuo.png' }
  };

  /* ── 账户管理 ── */

  function getAccounts() {
    try {
      var raw = localStorage.getItem(ACCOUNTS_KEY);
      var accounts;
      if (!raw) {
        accounts = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
      } else {
        accounts = JSON.parse(raw);
        if (!accounts) accounts = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
      }
      if (!accounts.left || typeof accounts.left !== 'object') accounts.left = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS.left));
      if (!accounts.right || typeof accounts.right !== 'object') accounts.right = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS.right));
      if (!accounts.left.avatar) accounts.left.avatar = DEFAULT_ACCOUNTS.left.avatar;
      if (!accounts.right.avatar) accounts.right.avatar = DEFAULT_ACCOUNTS.right.avatar;
      if (!accounts.left.nickname) accounts.left.nickname = DEFAULT_ACCOUNTS.left.nickname;
      if (!accounts.right.nickname) accounts.right.nickname = DEFAULT_ACCOUNTS.right.nickname;
      if (!accounts.left.password) accounts.left.password = DEFAULT_ACCOUNTS.left.password;
      if (!accounts.right.password) accounts.right.password = DEFAULT_ACCOUNTS.right.password;
      saveAccounts(accounts);
      return accounts;
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
    }
  }

  function saveAccounts(accounts) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  function getAccount(side) {
    var accounts = getAccounts();
    return (accounts[side] && typeof accounts[side] === 'object') ? accounts[side] : DEFAULT_ACCOUNTS[side];
  }

  function updateAccount(side, data) {
    var accounts = getAccounts();
    if (!accounts[side]) accounts[side] = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS[side]));
    accounts[side] = Object.assign({}, accounts[side], data);
    saveAccounts(accounts);
    return accounts[side];
  }

  function verifyPassword(side, password) {
    var account = getAccount(side);
    return account && account.password === password;
  }

  /* ── 会话管理 ── */

  function getSessionRaw() {
    return sessionStorage.getItem(SESSION_KEY);
  }

  function isValidSession(val) {
    return val && VALID_SIDES.indexOf(val) >= 0;
  }

  function isLoggedIn() {
    var sid = getSessionRaw();
    return isValidSession(sid);
  }

  function getCurrentIdentity() {
    var sid = getSessionRaw();
    return isValidSession(sid) ? sid : null;
  }

  function getCurrentAccount() {
    var identity = getCurrentIdentity();
    if (!identity) return null;
    var acc = getAccount(identity);
    return acc;
  }

  function login(side, password) {
    if (VALID_SIDES.indexOf(side) < 0) return false;
    if (verifyPassword(side, password)) {
      sessionStorage.setItem(SESSION_KEY, side);
      return true;
    }
    return false;
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function switchAccount(side) {
    if (VALID_SIDES.indexOf(side) < 0) return false;
    sessionStorage.setItem(SESSION_KEY, side);
    return true;
  }

  function ensureLoggedIn(callback) {
    if (isLoggedIn()) {
      if (callback) callback();
      return;
    }
    showLoginModal(callback);
  }

  /* ── 登录弹窗 ── */

  function createModal() {
    var existing = document.getElementById('love-admin-login-modal');
    if (existing) return existing;

    var accounts = getAccounts();

    var modal = document.createElement('div');
    modal.id = 'love-admin-login-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', '管理员登录');
    modal.innerHTML =
      '<div id="love-admin-login-backdrop" style="position:fixed;inset:0;z-index:200;background:rgba(24,18,20,0.55);display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;transition:opacity 200ms ease;">' +
        '<div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--shadow-3);width:100%;max-width:400px;padding:28px;transform:translateY(12px);transition:transform 200ms ease;" id="love-admin-login-box">' +
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">' +
            '<span style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:var(--brand-100);color:var(--brand);">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>' +
            '</span>' +
            '<h3 style="margin:0;font-size:18px;font-weight:600;color:var(--ink);">选择身份登录</h3>' +
          '</div>' +
          '<p style="margin:0 0 18px;color:var(--ink-3);font-size:14px;">选择要管理的账号并输入密码</p>' +
          '<div style="display:flex;gap:10px;margin-bottom:18px;">' +
            '<label id="login-left-label" style="flex:1;display:flex;align-items:center;gap:10px;padding:12px 14px;border:2px solid var(--brand);border-radius:var(--r-md);cursor:pointer;background:var(--brand-100);transition:all 0.2s;">' +
              '<input type="radio" name="login-identity" value="left" style="display:none;" checked>' +
              '<div id="login-left-avatar" style="width:36px;height:36px;border-radius:50%;overflow:hidden;background:var(--brand-100);border:2px solid var(--brand-200);flex-shrink:0;">' +
                '<img src="' + esc(accounts.left.avatar) + '" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\'">' +
              '</div>' +
              '<span style="font-weight:600;font-size:14px;color:var(--brand);">' + esc(accounts.left.nickname) + '</span>' +
            '</label>' +
            '<label id="login-right-label" style="flex:1;display:flex;align-items:center;gap:10px;padding:12px 14px;border:2px solid var(--line);border-radius:var(--r-md);cursor:pointer;background:transparent;transition:all 0.2s;">' +
              '<input type="radio" name="login-identity" value="right" style="display:none;">' +
              '<div id="login-right-avatar" style="width:36px;height:36px;border-radius:50%;overflow:hidden;background:var(--brand-100);border:2px solid var(--brand-200);flex-shrink:0;">' +
                '<img src="' + esc(accounts.right.avatar) + '" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\'">' +
              '</div>' +
              '<span style="font-weight:600;font-size:14px;color:var(--ink-2);">' + esc(accounts.right.nickname) + '</span>' +
            '</label>' +
          '</div>' +
          '<form id="love-admin-login-form" style="display:flex;flex-direction:column;gap:12px;">' +
            '<input id="love-admin-password" type="password" placeholder="输入密码" required style="width:100%;height:48px;padding:0 16px;background:var(--love-input);color:var(--love-foreground);border:1px solid var(--love-border);border-radius:var(--r-md);font-size:15px;outline:none;">' +
            '<p id="love-admin-login-error" style="margin:0;color:var(--state-error);font-size:13px;display:none;">密码不正确，请重试。</p>' +
            '<div style="display:flex;gap:10px;margin-top:4px;">' +
              '<button type="submit" class="btn-primary" style="flex:1;">登录</button>' +
              '<button type="button" id="love-admin-login-cancel" class="btn-secondary" style="flex:1;">取消</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    return modal;
  }

  var pendingCallback = null;

  function showLoginModal(onSuccess) {
    pendingCallback = onSuccess || null;
    var modal = createModal();
    var backdrop = modal.querySelector('#love-admin-login-backdrop');
    var box = modal.querySelector('#love-admin-login-box');
    var form = modal.querySelector('#love-admin-login-form');
    var input = modal.querySelector('#love-admin-password');
    var error = modal.querySelector('#love-admin-login-error');
    var cancel = modal.querySelector('#love-admin-login-cancel');
    var leftLabel = modal.querySelector('#login-left-label');
    var rightLabel = modal.querySelector('#login-right-label');
    var leftRadio = modal.querySelector('input[value="left"]');
    var rightRadio = modal.querySelector('input[value="right"]');

    function selectLoginSide(val) {
      var isLeft = val === 'left';
      leftLabel.style.border = isLeft ? '2px solid var(--brand)' : '2px solid var(--line)';
      leftLabel.style.background = isLeft ? 'var(--brand-100)' : 'transparent';
      leftLabel.querySelector('span').style.color = isLeft ? 'var(--brand)' : 'var(--ink-2)';
      rightLabel.style.border = isLeft ? '2px solid var(--line)' : '2px solid var(--brand)';
      rightLabel.style.background = isLeft ? 'transparent' : 'var(--brand-100)';
      rightLabel.querySelector('span').style.color = isLeft ? 'var(--ink-2)' : 'var(--brand)';
    }

    leftLabel.addEventListener('click', function () { leftRadio.checked = true; selectLoginSide('left'); });
    rightLabel.addEventListener('click', function () { rightRadio.checked = true; selectLoginSide('right'); });

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () {
      backdrop.style.opacity = '1';
      box.style.transform = 'translateY(0)';
    });
    input.value = '';
    error.style.display = 'none';
    setTimeout(function () { input.focus(); }, 200);

    function onSubmit(e) {
      e.preventDefault();
      var pwd = input.value.trim();
      var side = leftRadio.checked ? 'left' : 'right';
      if (login(side, pwd)) {
        hideLoginModal();
        refreshAdminUI();
        if (pendingCallback) {
          var cb = pendingCallback;
          pendingCallback = null;
          cb();
        }
      } else {
        error.style.display = 'block';
        input.value = '';
        input.focus();
      }
    }

    function onCancel() {
      hideLoginModal();
      pendingCallback = null;
    }

    function onKey(e) {
      if (e.key === 'Escape') onCancel();
    }

    form.addEventListener('submit', onSubmit);
    cancel.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKey);

    backdrop._cleanup = function () {
      form.removeEventListener('submit', onSubmit);
      cancel.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKey);
    };
  }

  function hideLoginModal() {
    var modal = document.getElementById('love-admin-login-modal');
    if (!modal) return;
    var backdrop = modal.querySelector('#love-admin-login-backdrop');
    var box = modal.querySelector('#love-admin-login-box');
    if (backdrop._cleanup) backdrop._cleanup();
    backdrop.style.opacity = '0';
    box.style.transform = 'translateY(12px)';
    setTimeout(function () {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }, 200);
  }

  function toast(message) {
    var el = document.createElement('div');
    el.textContent = message;
    el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:300;background:var(--ink);color:var(--surface);padding:10px 18px;border-radius:var(--r-md);font-size:14px;box-shadow:var(--shadow-2);opacity:0;transition:opacity 200ms ease;';
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.style.opacity = '1'; });
    setTimeout(function () {
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 200);
    }, 2200);
  }

  function createAdminBar() {
    var existing = document.getElementById('love-admin-bar');
    if (existing) return existing;

    var account = getCurrentAccount();
    var bar = document.createElement('div');
    bar.id = 'love-admin-bar';
    bar.style.cssText = 'position:fixed;bottom:20px;' + ADMIN_FLOAT_POS + ';z-index:90;display:flex;gap:8px;align-items:center;';

    var avatarHtml = '';
    if (account && account.avatar) {
      avatarHtml = '<div style="width:32px;height:32px;border-radius:50%;overflow:hidden;border:2px solid var(--brand-200);flex-shrink:0;"><img src="' + esc(account.avatar) + '" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\'"></div>';
    }

    bar.innerHTML =
      (account ? '<span class="love-admin-account" style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:var(--r-pill);background:var(--surface-2);color:var(--ink-2);font-size:13px;font-weight:500;">' + avatarHtml + '<span class="love-admin-account-text">' + esc(account.nickname) + '</span></span>' : '') +
      '<a href="admin-dashboard.html" class="btn-primary" style="box-shadow:var(--shadow-2);">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>' +
        '<span class="love-admin-bar-label">管理后台</span>' +
      '</a>' +
      '<button id="love-admin-logout" class="btn-secondary" style="box-shadow:var(--shadow-2);">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>' +
        '<span class="love-admin-logout-text">退出登录</span>' +
      '</button>';
    document.body.appendChild(bar);

    bar.querySelector('#love-admin-logout').addEventListener('click', function () {
      logout();
      refreshAdminUI();
      toast('已退出管理登录');
    });
    return bar;
  }

  function esc(str) {
    return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function createLoginFab() {
    var existing = document.getElementById('love-admin-login-fab');
    if (existing) return existing;

    var fab = document.createElement('button');
    fab.id = 'love-admin-login-fab';
    fab.className = 'btn-secondary';
    fab.style.cssText = 'position:fixed;bottom:20px;' + ADMIN_FLOAT_POS + ';z-index:90;box-shadow:var(--shadow-2);display:flex;align-items:center;gap:6px;';
    fab.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>' +
      '<span class="love-admin-login-text">管理登录</span>';
    fab.addEventListener('click', function () { showLoginModal(); });
    document.body.appendChild(fab);
    return fab;
  }

  function bindFooterAdmin() {
    var footerAdmin = document.getElementById('footer-admin');
    if (!footerAdmin || footerAdmin._bound) return;
    footerAdmin.addEventListener('click', function (e) {
      if (!isLoggedIn()) {
        e.preventDefault();
        showLoginModal();
      }
    });
    footerAdmin._bound = true;
  }

  function refreshAdminUI() {
    var bar = document.getElementById('love-admin-bar');
    var fab = document.getElementById('love-admin-login-fab');
    if (bar) bar.remove();
    if (fab) fab.remove();

    var footerAdmin = document.getElementById('footer-admin');
    if (footerAdmin) {
      footerAdmin.style.display = 'inline-flex';
      if (isLoggedIn()) {
        footerAdmin.href = 'admin-dashboard.html';
        var label = footerAdmin.querySelector('span');
        if (label) label.textContent = '管理后台';
      } else {
        footerAdmin.href = 'admin-login.html';
        var label = footerAdmin.querySelector('span');
        if (label) label.textContent = '管理入口';
      }
      bindFooterAdmin();
    }

    if (isLoggedIn()) {
      document.body.classList.add('love-admin-active');
      createAdminBar();
    } else {
      document.body.classList.remove('love-admin-active');
      createLoginFab();
    }
  }

  function injectAdminStyles() {
    var id = 'love-admin-shared-styles';
    if (document.getElementById(id)) return;
    var style = document.createElement('style');
    style.id = id;
    style.textContent =
      '.love-admin-only { display: none !important; }' +
      '.love-admin-active .love-admin-only { display: inline-flex !important; }' +
      '.love-admin-active .love-admin-only.block { display: flex !important; }' +
      '.love-admin-row { position: relative; }' +
      '.love-admin-actions { display: none; align-items: center; gap: 6px; }' +
      '.love-admin-active .love-admin-row:hover .love-admin-actions { display: flex; }' +
      '.love-admin-btn {' +
        'display: inline-flex; align-items: center; justify-content: center; gap: 4px;' +
        'padding: 6px 10px; border-radius: var(--r-md); font-size: 13px; font-weight: 500;' +
        'border: 1px solid var(--line); background: var(--surface); color: var(--ink-2); cursor: pointer;' +
      '}' +
      '.love-admin-btn:hover { border-color: var(--brand); color: var(--brand); background: var(--brand-100); }' +
      '.love-admin-btn.danger:hover { border-color: var(--state-error); color: var(--state-error); background: rgba(255,59,48,0.08); }' +
      '.love-admin-section { margin-bottom: 18px; }' +
      '.love-admin-form { display: none; }' +
      '.love-admin-form.active { display: block; }' +
      '.love-admin-form .field { margin-bottom: 12px; }' +
      '.love-admin-form label { display: block; margin-bottom: 6px; font-size: 13px; color: var(--ink-2); font-weight: 500; }' +
      '.love-admin-form input, .love-admin-form textarea { width: 100%; padding: 10px 14px; border: 1px solid var(--line); border-radius: var(--r-md); background: var(--surface); color: var(--ink); font-size: 14px; outline: none; }' +
      '.love-admin-form input:focus, .love-admin-form textarea:focus { border-color: var(--brand); box-shadow: 0 0 0 2px var(--brand-200); }' +
      '.love-admin-form textarea { resize: vertical; min-height: 80px; }' +
      '.love-admin-form .actions { display: flex; gap: 8px; }' +
      '.creator-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--ink-3); padding: 2px 8px; background: var(--surface-2); border-radius: var(--r-pill); white-space: nowrap; }' +
      '.creator-badge img { width: 16px; height: 16px; border-radius: 50%; object-fit: cover; border: 1px solid var(--brand-200); }' +
      '@media (max-width: 768px) {' +
        '#love-admin-bar { gap: 6px; }' +
        '.love-admin-account { padding: 4px !important; }' +
        '.love-admin-account-text, .love-admin-bar-label, .love-admin-logout-text, .love-admin-login-text { display: none; }' +
        '#love-admin-bar .btn-primary, #love-admin-bar .btn-secondary, #love-admin-login-fab { padding: 8px !important; }' +
        '#love-admin-bar svg, #love-admin-login-fab svg { margin-right: 0 !important; }' +
      '}';
    document.head.appendChild(style);
  }

  function initAdminUI() {
    injectAdminStyles();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', refreshAdminUI);
    } else {
      refreshAdminUI();
    }
  }

  window.LoveAdmin = {
    getAccounts: getAccounts,
    saveAccounts: saveAccounts,
    getAccount: getAccount,
    updateAccount: updateAccount,
    verifyPassword: verifyPassword,
    isLoggedIn: isLoggedIn,
    getCurrentIdentity: getCurrentIdentity,
    getCurrentAccount: getCurrentAccount,
    login: login,
    logout: logout,
    switchAccount: switchAccount,
    ensureLoggedIn: ensureLoggedIn,
    showLoginModal: showLoginModal,
    hideLoginModal: hideLoginModal,
    toast: toast,
    refreshAdminUI: refreshAdminUI,
    initAdminUI: initAdminUI
  };

  initAdminUI();
})();