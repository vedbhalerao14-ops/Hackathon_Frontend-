const API_BASE = window.API_BASE || "http://127.0.0.1:8000";

const state = {
  hackathons: [],
  teams: [],
  submissions: [],
  leaderboard: [],
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = isError ? "toast show error" : "toast show";
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.className = "toast";
  }, 3200);
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function switchTab(tabName) {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });
}

async function loadAllData() {
  try {
    const [stats, hackathons, teams, submissions, leaderboard] = await Promise.all([
      api("/api/dashboard"),
      api("/api/hackathons"),
      api("/api/teams"),
      api("/api/submissions"),
      api("/api/leaderboard"),
    ]);

    state.hackathons = hackathons;
    state.teams = teams;
    state.submissions = submissions;
    state.leaderboard = leaderboard;

    renderDashboard(stats);
    renderHackathons();
    renderTeams();
    renderSubmissions();
    renderLeaderboard();
    populateSelects();
  } catch (err) {
    showToast(err.message, true);
  }
}

function renderDashboard(stats) {
  document.getElementById("stat-hackathons").textContent = stats.hackathons;
  document.getElementById("stat-teams").textContent = stats.teams;
  document.getElementById("stat-submissions").textContent = stats.submissions;
  document.getElementById("stat-evaluations").textContent = stats.evaluations;

  const container = document.getElementById("overview-hackathons");
  container.innerHTML = state.hackathons.length
    ? state.hackathons.map(renderHackathonCard).join("")
    : '<div class="card empty-state">No hackathons created yet.</div>';
}

function renderHackathonCard(h) {
  const badgeClass = h.status === "Open" ? "badge-success" : "badge";
  return `
    <article class="card">
      <div class="section-header">
        <strong>${escapeHtml(h.title)}</strong>
        <span class="badge ${badgeClass}">${escapeHtml(h.status)}</span>
      </div>
      <p>${escapeHtml(h.theme)}</p>
      <ul class="meta-list">
        <li><strong>Date:</strong> ${escapeHtml(h.event_date)}</li>
        <li><strong>Venue:</strong> ${escapeHtml(h.venue)}</li>
        <li><strong>Max Team Size:</strong> ${escapeHtml(h.max_team_size)}</li>
        <li><strong>Prize Pool:</strong> ${escapeHtml(h.prize_pool)}</li>
      </ul>
    </article>
  `;
}

function renderHackathons() {
  const container = document.getElementById("hackathons-list");
  container.innerHTML = state.hackathons.length
    ? state.hackathons.map(renderHackathonCard).join("")
    : '<div class="card empty-state">No hackathons available.</div>';
}

function renderTeams() {
  const tbody = document.getElementById("teams-table-body");
  if (!state.teams.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No teams registered yet.</td></tr>';
    return;
  }

  tbody.innerHTML = state.teams
    .map(
      (t) => `
      <tr>
        <td><strong>${escapeHtml(t.team_name)}</strong></td>
        <td>${escapeHtml(t.hackathon_title)}</td>
        <td><span class="badge">${escapeHtml(t.track)}</span></td>
        <td>${escapeHtml(t.leader_name)}<br><small>${escapeHtml(t.leader_email)}</small></td>
        <td>${escapeHtml(t.members)}</td>
        <td><button class="btn-danger-sm" onclick="deleteTeam(${t.id})">Remove</button></td>
      </tr>
    `
    )
    .join("");
}

function renderSubmissions() {
  const container = document.getElementById("submissions-list");
  if (!state.submissions.length) {
    container.innerHTML = '<div class="card empty-state">No project submissions yet.</div>';
    return;
  }

  container.innerHTML = state.submissions
    .map((s) => {
      const statusBadge = s.status === "Evaluated" ? "badge-success" : "badge-warning";
      const scoreText = s.avg_score ? `${s.avg_score} / 10 (${s.judge_count} judge)` : "Pending review";
      return `
        <article class="card">
          <div class="section-header">
            <strong>${escapeHtml(s.project_title)}</strong>
            <span class="badge ${statusBadge}">${escapeHtml(s.status)}</span>
          </div>
          <p>${escapeHtml(s.description)}</p>
          <ul class="meta-list">
            <li><strong>Team:</strong> ${escapeHtml(s.team_name)} (${escapeHtml(s.track)})</li>
            <li><strong>Hackathon:</strong> ${escapeHtml(s.hackathon_title)}</li>
            <li><strong>Tech Stack:</strong> ${escapeHtml(s.tech_stack)}</li>
            <li><strong>Score:</strong> ${escapeHtml(scoreText)}</li>
          </ul>
          <div class="card-links">
            <a href="${escapeHtml(s.repo_url)}" target="_blank" rel="noopener noreferrer">Repository ↗</a>
            ${
              s.demo_url
                ? `<a href="${escapeHtml(s.demo_url)}" target="_blank" rel="noopener noreferrer">Live Demo ↗</a>`
                : ""
            }
          </div>
        </article>
      `;
    })
    .join("");
}

function renderLeaderboard() {
  const tbody = document.getElementById("leaderboard-body");
  if (!state.leaderboard.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No submissions to rank yet.</td></tr>';
    return;
  }

  tbody.innerHTML = state.leaderboard
    .map((item, idx) => {
      const statusBadge = item.status === "Evaluated" ? "badge-success" : "badge-warning";
      return `
        <tr>
          <td><strong>#${idx + 1}</strong></td>
          <td><strong>${escapeHtml(item.project_title)}</strong><br><small>${escapeHtml(item.hackathon_title)}</small></td>
          <td>${escapeHtml(item.team_name)}</td>
          <td>${escapeHtml(item.judge_count)}</td>
          <td><strong>${item.judge_count ? `${item.avg_score} / 10` : "—"}</strong></td>
          <td><span class="badge ${statusBadge}">${escapeHtml(item.status)}</span></td>
        </tr>
      `;
    })
    .join("");
}

function populateSelects() {
  const hackathonSelect = document.getElementById("team-hackathon-select");
  hackathonSelect.innerHTML = state.hackathons.length
    ? state.hackathons.map((h) => `<option value="${h.id}">${escapeHtml(h.title)}</option>`).join("")
    : '<option value="">Create a hackathon first</option>';

  const submittedTeamIds = new Set(state.submissions.map((s) => s.team_id));
  const availableTeams = state.teams.filter((t) => !submittedTeamIds.has(t.id));
  const teamSelect = document.getElementById("submission-team-select");
  teamSelect.innerHTML = availableTeams.length
    ? availableTeams
        .map((t) => `<option value="${t.id}">${escapeHtml(t.team_name)} (${escapeHtml(t.hackathon_title)})</option>`)
        .join("")
    : '<option value="">All registered teams have submitted</option>';

  const scoreSelect = document.getElementById("score-submission-select");
  scoreSelect.innerHTML = state.submissions.length
    ? state.submissions
        .map((s) => `<option value="${s.id}">${escapeHtml(s.project_title)} — ${escapeHtml(s.team_name)}</option>`)
        .join("")
    : '<option value="">No submissions available</option>';
}

async function deleteTeam(teamId) {
  try {
    await api(`/api/teams/${teamId}`, { method: "DELETE" });
    showToast("Team removed.");
    await loadAllData();
  } catch (err) {
    showToast(err.message, true);
  }
}

window.deleteTeam = deleteTeam;

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

document.querySelectorAll("[data-goto]").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.goto));
});

document.getElementById("hackathon-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(e.target).entries());
  try {
    await api("/api/hackathons", { method: "POST", body: JSON.stringify(payload) });
    e.target.reset();
    showToast("Hackathon created!");
    await loadAllData();
  } catch (err) {
    showToast(err.message, true);
  }
});

document.getElementById("team-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(e.target).entries());
  try {
    await api("/api/teams", { method: "POST", body: JSON.stringify(payload) });
    e.target.reset();
    showToast("Team registered successfully!");
    await loadAllData();
  } catch (err) {
    showToast(err.message, true);
  }
});

document.getElementById("submission-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(e.target).entries());
  try {
    await api("/api/submissions", { method: "POST", body: JSON.stringify(payload) });
    e.target.reset();
    showToast("Project submitted!");
    await loadAllData();
  } catch (err) {
    showToast(err.message, true);
  }
});

document.getElementById("score-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(e.target).entries());
  const submissionId = payload.submission_id;
  if (!submissionId) {
    showToast("Please select a submission first.", true);
    return;
  }
  try {
    await api(`/api/submissions/${submissionId}/score`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    e.target.reset();
    showToast("Evaluation saved & leaderboard updated!");
    await loadAllData();
  } catch (err) {
    showToast(err.message, true);
  }
});

loadAllData();
