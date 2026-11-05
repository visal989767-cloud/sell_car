// frontend/js/api.js – API wrapper with intelligent fallback

(function() {
    const HARDCODED_API = '/backend/api/';
    const FALLBACK_API = 'http://localhost:8000/backend/api/';

    let API_BASE;

    function buildApiBase() {
        const currentOrigin = window.location.origin || '';
        const hostname = window.location.hostname || '';
        const pathname = window.location.pathname || '';

        if (window.location.protocol === 'file:') {
            return HARDCODED_API;
        }

        // Virtual-host setup: frontend served on *.frontend.test, backend on *.backend.test
        if (hostname === 'frontend.test' || hostname.endsWith('.frontend.test')) {
            return `http://${hostname.replace(/\.frontend\.test$/i, '')}.backend.test/api/`;
        }

        const normalizedPath = pathname.replace(/\\/g, '/');
        const segments = normalizedPath.split('/').filter(Boolean);
        const frontendIndex = segments.indexOf('frontend');

        if (frontendIndex >= 0) {
            const projectRootSegments = segments.slice(0, frontendIndex);
            const projectRoot = projectRootSegments.length > 0 ? `/${projectRootSegments.join('/')}/` : '/';
            return `${currentOrigin}${projectRoot}backend/api/`;
        }

        if (currentOrigin && normalizedPath.includes('/car-seller-management-system-fixed')) {
            const projectRoot = normalizedPath.split('/car-seller-management-system-fixed')[0] || '/';
            return `${currentOrigin}${projectRoot}/car-seller-management-system-fixed/backend/api/`;
        }

        if (currentOrigin === 'http://localhost' || currentOrigin === 'http://127.0.0.1') {
            return FALLBACK_API;
        }

        return HARDCODED_API;
    }

    API_BASE = buildApiBase();
    console.log('API Base URL:', API_BASE);

    function buildUrl(endpoint, params = {}) {
        const baseUrl = new URL(API_BASE, window.location.href);
        const url = new URL(endpoint, baseUrl);
        Object.entries(params || {}).forEach(([key, value]) => {
            if (value === undefined || value === null) return;
            url.searchParams.set(key, value);
        });
        return url.toString();
    }

    // Helper to handle fetch responses
    async function request(endpoint, options = {}, params = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        let url = '';
        const defaults = {
            credentials: 'include', // send cookies/session
            headers: {
                'Content-Type': 'application/json',
            },
        };
        const method = (options.method || 'GET').toUpperCase();
        const config = { ...defaults, ...options };
        config.method = method;

        if (['PUT', 'DELETE'].includes(method)) {
            config.method = 'POST';
            config.headers = {
                ...defaults.headers,
                ...(options.headers || {}),
                'X-HTTP-Method-Override': method,
            };
        }

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }
        config.signal = config.signal || controller.signal;

        try {
            url = buildUrl(API_BASE + endpoint, params);
            const response = await fetch(url, config);
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                // Response is not JSON – likely a 404 or HTML error
                const text = await response.text();
                console.error('Non-JSON API response', { url, status: response.status, contentType, snippet: text.substring(0, 200) });
                if (response.status === 403) {
                    return { success: false, message: 'Sign-in is temporarily unavailable. Please try again later.' };
                }
                return { success: false, message: `Server error (${response.status}) – check the API URL.` };
            }
            const data = await response.json();
            if (!response.ok) {
                if (response.status === 403 && data.error && data.error.code === '403') {
                    return { success: false, message: 'Sign-in is temporarily unavailable. Please try again later.' };
                }
                return { success: false, message: data.message || (data.error && data.error.message) || 'Request failed' };
            }
            return data;
        } catch (err) {
            console.error('Fetch failed', { url, err });
            if (err.name === 'AbortError') {
                return { success: false, message: 'The login service took too long to respond. Please try again later.' };
            }
            return { success: false, message: 'Network error – is the backend running?' };
        } finally {
            clearTimeout(timeoutId);
        }
    }

    window.api = {
        get: (endpoint, params) => request(endpoint, { method: 'GET' }, params),
        post: (endpoint, body) => request(endpoint, { method: 'POST', body }),
        put: (endpoint, body) => request(endpoint, { method: 'PUT', body }),
        delete: (endpoint, body) => request(endpoint, { method: 'DELETE', body }),
    };
})();