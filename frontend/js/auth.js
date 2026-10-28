// CodeAuthentic - Authentication Handler

function switchTab(tab) {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const alertBox = document.getElementById('alert-box');
  alertBox.style.display = 'none';

  if (tab === 'login') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
  }
}

function showAlert(message, type) {
  const alertBox = document.getElementById('alert-box');
  alertBox.textContent = message;
  alertBox.className = 'alert ' + type;
  alertBox.style.display = 'block';
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');

  btn.disabled = true;
  btn.textContent = 'Logging in...';

  try {
    const res = await fetch('/auth/login/json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Login failed');
    }

    localStorage.setItem('codeauthentic_token', data.access_token);
    showAlert('Login successful! Redirecting...', 'success');
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 600);
  } catch (err) {
    showAlert(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Log In';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const btn = document.getElementById('reg-btn');

  btn.disabled = true;
  btn.textContent = 'Registering...';

  try {
    const res = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Registration failed');
    }

    showAlert('Account created! Please sign in.', 'success');
    setTimeout(() => {
      switchTab('login');
      document.getElementById('login-email').value = email;
    }, 1200);
  } catch (err) {
    showAlert(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}
