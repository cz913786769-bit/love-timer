/* 恋爱小站 - 管理后台核心（认证 + 登录弹窗 + 工具栏） */
(function () {
  'use strict';

  var PASSWORD_KEY = 'love-admin-password';
  var SESSION_KEY = 'love-admin-session';
  var DEFAULT_PASSWORD = 'qixi2026';

  function getPassword() {
    var pwd = localStorage.getItem(PASSWORD_KEY);
    if (!pwd) {
      pwd = DEFAULT_PASSWORD;
      localStorage.setItem(PASSWORD_KEY, pwd);
    }
    return pwd;
  }

  function setPassword(newPassword) {
    localStorage.setItem(PASSWORD_KEY, newPassword);
  }

  function isLoggedIn() {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  }

  function login(password) {
    if (password === getPassword()) {
      sessionStorage.setItem(SESSION_KEY, '1');
      return true;
    }
    return false;
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function ensureLoggedIn(callback) {
    if (isLoggedIn()) {
      if (callback) callback();
      return;
    }
    showLoginModal(callback);
  }

  function createModal() {
    var existing = document.getElementById('love-admin-login-modal');
    if (existing) return existing;

    var modal = document.createElement('div');
    modal.id = 'love-admin-login-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', '管理员登录');
    modal.innerHTML =
      '<div id="love-admin-login-backdrop" style="position:fixed;inset:0;z-index:200;background:rgba(24,18,20,0.55);display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;transition:opacity 200ms ease;">' +
        '<div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--shadow-3);width:100%;max-width:380px;padding:28px;transform:translateY(12px);transition:transform 200ms ease;" id="love-admin-login-box">' +
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">' +
            '<span style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:999px;background:var(--brand-100);color:var(--brand);">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>' +
            '</span>' +
            '<h3 style="margin:0;font-size:18px;font-weight:600;color:var(--ink);">管理员登录</h3>' +
          '</div>' +
          '<p style="margin:0 0 16px;color:var(--ink-3);font-size:14px;">请输入管理密码后继续操作。</p>' +
          '<form id="love-admin-login-form" style="display:flex;flex-direction:column;gap:12px;">' +
            '<input id="love-admin-password" type="password" placeholder="管理密码" required style="width:100%;height:48px;padding:0 16px;background:var(--love-input);color:var(--love-foreground);border:1px solid var(--love-border);border-radius:var(--r-md);font-size:15px;outline:none;">' +
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

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () {
      backdrop.style.opacity = '1';
      box.style.transform = 'translateY(0)';
    });
    input.value = '';
    error.style.display = 'none';
    input.focus();

    function onSubmit(e) {
      e.preventDefault();
      var pwd = input.value.trim();
      if (login(pwd)) {
        hideLoginModal();
        refreshAdminUI();
        if (pendingCallback) pendingCallback();
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

    var bar = document.createElement('div');
    bar.id = 'love-admin-bar';
    bar.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:90;display:flex;gap:8px;align-items:center;';
    bar.innerHTML =
      '<a href="admin-dashboard.html" class="btn-primary" style="box-shadow:var(--shadow-2);">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>' +
        '管理后台' +
      '</a>' +
      '<button id="love-admin-logout" class="btn-secondary" style="box-shadow:var(--shadow-2);">退出登录</button>';
    document.body.appendChild(bar);

    bar.querySelector('#love-admin-logout').addEventListener('click', function () {
      logout();
      refreshAdminUI();
      toast('已退出管理登录');
    });
    return bar;
  }

  function createLoginFab() {
    var existing = document.getElementById('love-admin-login-fab');
    if (existing) return existing;

    var fab = document.createElement('button');
    fab.id = 'love-admin-login-fab';
    fab.className = 'btn-secondary';
    fab.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:90;box-shadow:var(--shadow-2);display:flex;align-items:center;gap:6px;';
    fab.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>' +
      '管理登录';
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
    } else {
      document.body.classList.remove('love-admin-active');
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
      '.love-admin-form .actions { display: flex; gap: 8px; }';
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
    getPassword: getPassword,
    setPassword: setPassword,
    isLoggedIn: isLoggedIn,
    login: login,
    logout: logout,
    ensureLoggedIn: ensureLoggedIn,
    showLoginModal: showLoginModal,
    hideLoginModal: hideLoginModal,
    toast: toast,
    refreshAdminUI: refreshAdminUI,
    initAdminUI: initAdminUI
  };

  initAdminUI();
})();
