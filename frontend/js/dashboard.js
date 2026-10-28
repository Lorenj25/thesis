// CodeAuthentic - Dashboard Logic & Live WebSocket Monitoring

let currentLobbyId = null;
let currentLobbyData = null;
let activeWebSocket = null;
let currentSubmissions = [];

function getToken() {
  const token = localStorage.getItem('codeauthentic_token');
  if (!token) {
    window.location.href = '/';
  }
  return token;
}

function logout() {
  localStorage.removeItem('codeauthentic_token');
  window.location.href = '/';
}

async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const res = await fetch(endpoint, { ...options, headers });
  if (res.status === 401) {
    logout();
    throw new Error('Session expired');
  }
  return res;
}

async function loadLobbies() {
  try {
    const res = await apiFetch('/lobbies');
    const lobbies = await res.json();
    const listEl = document.getElementById('lobbies-list');

    if (!lobbies || lobbies.length === 0) {
      listEl.innerHTML = '<p style="color: var(--muted); font-size: 0.85rem;">No exam lobbies found. Create one above.</p>';
      return;
    }

    listEl.innerHTML = lobbies.map(lobby => `
      <div class="lobby-item ${lobby.id === currentLobbyId ? 'active' : ''}" onclick="selectLobby('${lobby.id}')">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="lobby-item-title">${escapeHtml(lobby.title)}</span>
          <span class="badge ${lobby.status === 'ACTIVE' ? 'badge-active' : 'badge-locked'}">${lobby.status}</span>
        </div>
        <div class="lobby-item-meta">
          Expires: ${new Date(lobby.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    `).join('');

    // If no lobby selected yet, select first lobby
    if (!currentLobbyId && lobbies.length > 0) {
      selectLobby(lobbies[0].id);
    }
  } catch (err) {
    console.error('Failed to load lobbies', err);
  }
}

async function handleCreateLobby(e) {
  e.preventDefault();
  const title = document.getElementById('lobby-title').value.trim();
  const duration = parseInt(document.getElementById('lobby-duration').value, 10);

  try {
    const res = await apiFetch('/lobbies', {
      method: 'POST',
      body: JSON.stringify({ title, duration_minutes: duration }),
    });
    if (!res.ok) throw new Error('Failed to create lobby');
    const newLobby = await res.json();
    document.getElementById('create-lobby-form').reset();
    document.getElementById('lobby-duration').value = '120';
    await loadLobbies();
    selectLobby(newLobby.id);
  } catch (err) {
    alert(err.message);
  }
}

async function selectLobby(lobbyId) {
  currentLobbyId = lobbyId;
  document.getElementById('no-lobby-selected').style.display = 'none';
  document.getElementById('active-lobby-container').style.display = 'block';

  // Highlight in sidebar
  document.querySelectorAll('.lobby-item').forEach(el => el.classList.remove('active'));

  try {
    const res = await apiFetch(`/lobbies/${lobbyId}`);
    if (!res.ok) throw new Error('Could not fetch lobby details');
    currentLobbyData = await res.json();
    currentSubmissions = currentLobbyData.submissions || [];

    renderLobbyHeader();
    renderSubmissions();
    setupWebSocket(lobbyId);
  } catch (err) {
    console.error(err);
  }
}

function renderLobbyHeader() {
  if (!currentLobbyData) return;
  document.getElementById('active-title').textContent = currentLobbyData.title;
  const statusBadge = document.getElementById('active-status-badge');
  statusBadge.textContent = currentLobbyData.status;
  statusBadge.className = 'badge ' + (currentLobbyData.status === 'ACTIVE' ? 'badge-active' : 'badge-locked');

  const expiresDate = new Date(currentLobbyData.expires_at);
  document.getElementById('active-expires').textContent = expiresDate.toLocaleString();

  const lockBtn = document.getElementById('lock-btn');
  if (currentLobbyData.status === 'LOCKED') {
    lockBtn.disabled = true;
    lockBtn.style.opacity = '0.5';
    lockBtn.textContent = 'Session Locked';
  } else {
    lockBtn.disabled = false;
    lockBtn.style.opacity = '1';
    lockBtn.textContent = 'Lock Session';
  }
}

function renderSubmissions() {
  // Sort submissions: highest AI probability first, pending next, failed last
  const sorted = [...currentSubmissions].sort((a, b) => {
    const scoreA = a.ai_probability !== null ? a.ai_probability : -1;
    const scoreB = b.ai_probability !== null ? b.ai_probability : -1;
    return scoreB - scoreA;
  });

  // Calculate statistics
  const uniqueStudents = new Set(sorted.map(s => s.student_id)).size;
  const totalSubmissions = sorted.length;
  const analyzedCount = sorted.filter(s => s.status === 'done').length;
  const processedPercent = totalSubmissions > 0 ? Math.round((analyzedCount / totalSubmissions) * 100) : 0;

  document.getElementById('stat-students').textContent = uniqueStudents;
  document.getElementById('stat-submissions').textContent = totalSubmissions;
  document.getElementById('stat-analyzed').textContent = analyzedCount;
  document.getElementById('stat-processed').textContent = `${processedPercent}%`;

  const tbody = document.getElementById('submissions-tbody');
  if (sorted.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--muted); padding: 2rem;">No submissions yet. Awaiting student uploads.</td></tr>';
    return;
  }

  tbody.innerHTML = sorted.map(sub => {
    let probText = '--';
    let riskBadge = '<span class="badge badge-pending">PENDING</span>';

    if (sub.status === 'done' && sub.ai_probability !== null) {
      probText = (sub.ai_probability * 100).toFixed(1) + '%';
      const risk = sub.risk_level ? sub.risk_level.toLowerCase() : 'low';
      riskBadge = `<span class="badge badge-${risk}">${sub.risk_level || 'LOW'}</span>`;
    } else if (sub.status === 'failed') {
      probText = 'Error';
      riskBadge = `<span class="badge badge-failed" title="${escapeHtml(sub.error_message || 'Failed')}">FAILED</span>`;
    }

    const statusBadge = `<span class="badge badge-${sub.status}">${sub.status.toUpperCase()}</span>`;

    return `
      <tr>
        <td><strong>${escapeHtml(sub.student_id)}</strong></td>
        <td><code>${escapeHtml(sub.file_name)}</code></td>
        <td><span style="text-transform: capitalize;">${escapeHtml(sub.language)}</span></td>
        <td><strong>${probText}</strong></td>
        <td>${riskBadge}</td>
        <td>${statusBadge}</td>
        <td style="color: var(--muted); font-size: 0.8rem;">${new Date(sub.created_at).toLocaleTimeString()}</td>
      </tr>
    `;
  }).join('');
}

function setupWebSocket(lobbyId) {
  if (activeWebSocket) {
    activeWebSocket.close();
    activeWebSocket = null;
  }

  const token = getToken();
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/lobbies/${lobbyId}?token=${encodeURIComponent(token)}`;

  const statusEl = document.getElementById('ws-status');
  statusEl.textContent = 'Connecting...';

  activeWebSocket = new WebSocket(wsUrl);

  activeWebSocket.onopen = () => {
    statusEl.textContent = 'Live Feed Connected';
    statusEl.style.color = '#34d399';
  };

  activeWebSocket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'submission_created') {
        currentSubmissions.push(msg.submission);
        renderSubmissions();
      } else if (msg.type === 'submission_updated') {
        const idx = currentSubmissions.findIndex(s => s.id === msg.submission.id);
        if (idx !== -1) {
          currentSubmissions[idx] = msg.submission;
        } else {
          currentSubmissions.push(msg.submission);
        }
        renderSubmissions();
      }
    } catch (e) {
      console.error('Error handling WebSocket message', e);
    }
  };

  activeWebSocket.onclose = () => {
    statusEl.textContent = 'Disconnected';
    statusEl.style.color = '#f87171';
  };
}

async function lockCurrentLobby() {
  if (!currentLobbyId) return;
  if (!confirm('Are you sure you want to lock this session? Students will no longer be able to submit files.')) return;

  try {
    const res = await apiFetch(`/lobbies/${currentLobbyId}/lock`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to lock lobby');
    currentLobbyData = await res.json();
    renderLobbyHeader();
    loadLobbies();
  } catch (err) {
    alert(err.message);
  }
}

function copyLobbyLink() {
  if (!currentLobbyId) return;
  const url = `${window.location.origin}/lobby/${currentLobbyId}`;
  navigator.clipboard.writeText(url).then(() => {
    alert('Student submission link copied to clipboard:\n' + url);
  }).catch(() => {
    prompt('Student submission link:', url);
  });
}

function downloadCSV() {
  if (!currentSubmissions || currentSubmissions.length === 0) {
    alert('No submissions available to export.');
    return;
  }

  const rows = [
    ['Student ID', 'File Name', 'Language', 'Status', 'AI Probability', 'Risk Level', 'Submitted At', 'Error Message']
  ];

  currentSubmissions.forEach(s => {
    rows.push([
      s.student_id,
      s.file_name,
      s.language,
      s.status,
      s.ai_probability !== null ? s.ai_probability : '',
      s.risk_level || '',
      s.created_at,
      s.error_message || ''
    ]);
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `codeauthentic_lobby_${currentLobbyId}_results.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// Initial load
window.addEventListener('DOMContentLoaded', () => {
  loadLobbies();
});
