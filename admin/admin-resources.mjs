import { getApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { ADMIN_AUTH_CONFIG } from './config.mjs';

const REQUEST_TIMEOUT_MS = 12000;

function safeResourceUrl(value, { host, pathPrefix }) {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'https:' || url.hostname !== host || !url.pathname.startsWith(pathPrefix)) return '';
    return url.href;
  } catch (_) {
    return '';
  }
}

function validateResourcesResponse(payload) {
  if (!payload || payload.ok !== true || payload.action !== 'adminResources') return null;
  const workbookUrl = safeResourceUrl(payload.resources?.workbookUrl, {
    host: 'docs.google.com',
    pathPrefix: '/spreadsheets/d/'
  });
  const adminScriptUrl = safeResourceUrl(payload.resources?.adminScriptUrl, {
    host: 'script.google.com',
    pathPrefix: '/home/projects/'
  });
  if (!workbookUrl || !adminScriptUrl) return null;
  return { workbookUrl, adminScriptUrl };
}

async function authenticatedResourcePost() {
  const user = getAuth(getApp()).currentUser;
  const endpoint = String(ADMIN_AUTH_CONFIG.endpoint || '').trim();
  if (!user || !endpoint) throw new Error('admin_backend_unavailable');
  const idToken = await user.getIdToken();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ action: 'adminResources', idToken }),
      cache: 'no-store',
      signal: controller.signal
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.ok !== true) throw new Error(payload?.error || 'admin_backend_unavailable');
    const resources = validateResourcesResponse(payload);
    if (!resources) throw new Error('admin_backend_unavailable');
    return resources;
  } finally {
    window.clearTimeout(timeout);
  }
}

function enableResourceLink(key, href) {
  const link = document.querySelector(`[data-admin-resource="${key}"]`);
  if (!link) return;
  link.href = href;
  link.removeAttribute('aria-disabled');
  link.classList.remove('is-loading');
}

let loaded = false;
let loading = false;

async function loadResources() {
  if (loaded || loading) return;
  loading = true;
  const status = document.querySelector('#resources-status');
  if (status) status.textContent = 'Loading private CGB links…';
  try {
    const resources = await authenticatedResourcePost();
    enableResourceLink('workbook', resources.workbookUrl);
    enableResourceLink('admin-script', resources.adminScriptUrl);
    loaded = true;
    if (status) status.textContent = '';
  } catch (_) {
    if (status) status.textContent = 'Private Google links could not be loaded. Reload the dashboard and try again.';
  } finally {
    loading = false;
  }
}

document.querySelector('[data-view="resources"]')?.addEventListener('click', loadResources);
