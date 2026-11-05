// frontend/js/auth.js – login, logout, and session guard
console.log('%c[AutoStock] auth.js v3 loaded — loader active', 'color:#facc15;font-weight:bold');

// ---- Guard: ensure api.js loaded before using api ----
function getApi() {
    if (typeof window.api === 'undefined') {
        console.error('api.js did not load. Check that the script tag for api.js appears before auth.js in the HTML.');
        // Return a proxy object so calls don't throw ReferenceError
        return {
            get: () => Promise.resolve({ success: false, message: 'API module failed to load. Please refresh the page or check your network connection.' }),
            post: () => Promise.resolve({ success: false, message: 'API module failed to load. Please refresh the page or check your network connection.' }),
            put: () => Promise.resolve({ success: false, message: 'API module failed to load. Please refresh the page or check your network connection.' }),
            delete: () => Promise.resolve({ success: false, message: 'API module failed to load. Please refresh the page or check your network connection.' }),
        };
    }
    return window.api;
}

// ---- Fullscreen loader helpers ----
function showLoginLoader() {
    const loader = document.getElementById('loginLoader');
    if (loader) {
        loader.style.display = 'flex';
        loader.classList.add('open');
    }
}

function hideLoginLoader() {
    const loader = document.getElementById('loginLoader');
    if (loader) {
        loader.style.display = 'none';
        loader.classList.remove('open');
    }
}

function setLoaderProgress(percent, text) {
    const bar = document.getElementById('loaderBar');
    const textEl = document.getElementById('loaderText');
    if (bar) bar.style.width = `${percent}%`;
    if (textEl && text) textEl.textContent = text;
}

const loaderSteps = [
    { at: 0.15, label: 'Verifying credentials…' },
    { at: 0.45, label: 'Connecting to dealer console…' },
    { at: 0.7, label: 'Syncing inventory data…' },
    { at: 0.92, label: 'Starting your engine…' }
];

function runLoaderTimeline() {
    const timers = [];
    loaderSteps.forEach((step) => {
        timers.push(
            setTimeout(() => setLoaderProgress(step.at * 100, step.label), step.at * 1200)
        );
    });
    return timers;
}

// ---- Password show/hide toggle ----
const togglePasswordBtn = document.getElementById('togglePassword');
if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
        const passInput = document.getElementById('password');
        const isHidden = passInput.type === 'password';
        passInput.type = isHidden ? 'text' : 'password';
        togglePasswordBtn.textContent = isHidden ? '🙈' : '👁';
        togglePasswordBtn.title = isHidden ? 'Hide password' : 'Show password';
    });
}

// ---- Login form ----
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorBox = document.getElementById('formError');
        if (errorBox) {
            errorBox.style.display = 'none';
            errorBox.classList.remove('visible');
        }

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const btn = document.getElementById('submitBtn');

        // 🚀 Launch the professional loading screen
        btn.disabled = true;
        btn.textContent = 'Signing in…';
        setLoaderProgress(8, 'Starting secure connection…');
        showLoginLoader();

        let timers = [];
        timers = runLoaderTimeline();

        // ✅ FIX: Call the API
        const api = getApi();
        const res = await api.post('login.php', { email, password });

        // Clear staged timers now that the request finished
        timers.forEach(clearTimeout);

        // Re-enable button after request
        btn.disabled = false;
        btn.textContent = 'Sign in';

        if (res.success) {
            // Show the loader for a full 3 seconds, then jump to the inventory console
            const dealerName = (res.data && res.data.name) || 'dealer';
            const successSteps = [
                { at: 0.4,  label: `Welcome, ${dealerName}! Loading your inventory…` },
                { at: 0.7,  label: 'Preparing your dashboard…' },
                { at: 0.9,  label: 'Almost there — starting your engine…' },
                { at: 1,    label: 'Done! Taking you to the lot…' }
            ];

            successSteps.forEach((step) => {
                setTimeout(() => setLoaderProgress(step.at * 100, step.label), step.at * 3000);
            });

            setTimeout(() => {
                hideLoginLoader();
                window.location.href = 'cars.html';
            }, 3000);
        } else {
            // Hide loader and surface the error
            hideLoginLoader();
            setLoaderProgress(0, '');
            if (errorBox) {
                errorBox.textContent = res.message || 'Login failed.';
                errorBox.style.display = 'block';
                errorBox.classList.add('visible');
            }
        }
    });
}

// ---- Register form ----
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorBox = document.getElementById('formError');
        const successBox = document.getElementById('formSuccess');
        errorBox.style.display = 'none';
        successBox.style.display = 'none';

        const full_name = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirm = document.getElementById('confirmPassword').value;
        const admin_setup_token = document.getElementById('adminSetupToken').value;

        if (password !== confirm) {
            errorBox.textContent = 'Passwords do not match.';
            errorBox.style.display = 'block';
            return;
        }

        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.textContent = 'Creating account…';

        const api = getApi();
        const res = await api.post('register.php', { full_name, email, password, admin_setup_token });

        btn.disabled = false;
        btn.textContent = 'Create Account';

        if (res.success) {
            successBox.textContent = res.message || 'Account created. Redirecting to login…';
            successBox.style.display = 'block';
            registerForm.reset();
            setTimeout(() => (window.location.href = 'index.html'), 1200);
        } else {
            errorBox.textContent = res.message || 'Registration failed.';
            errorBox.style.display = 'block';
        }
    });
}

// ---- Logout ----
async function logout() {
    const api = getApi();
    await api.post('logout.php', {});
    window.location.href = 'index.html';
}

// ---- Load current user (guard) ----
async function loadCurrentUser() {
    const api = getApi();
    const res = await api.get('session.php');
    if (!res.success) {
        window.location.href = 'index.html';
        return null;
    }
    const nameEl = document.getElementById('currentUserName');
    const roleEl = document.getElementById('currentUserRole');
    const avatarEl = document.getElementById('currentUserAvatar');
    if (nameEl) nameEl.textContent = res.data.name || 'User';
    if (roleEl) roleEl.textContent = res.data.role || '';
    if (avatarEl) avatarEl.textContent = (res.data.name || '?').trim().charAt(0).toUpperCase();
    return res.data;
}