const form = document.getElementById("idea-form");
const ideasWrap = document.getElementById("ideas");
const planBox = document.getElementById("plan");
const modePill = document.getElementById("mode-pill");
const planBtn = document.getElementById("generate-plan");
const apiBaseInput = document.getElementById("api-base");

let latest = null;

function getApiBase() {
  const value = apiBaseInput.value.trim();
  return value || window.location.origin;
}

function money(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

function renderIdeas(data) {
  ideasWrap.innerHTML = "";
  data.ideas.forEach((idea) => {
    const card = document.createElement("article");
    card.className = "idea-card";
    card.innerHTML = `
      <h3>#${idea.rank} ${idea.title}</h3>
      <p><strong>Demand:</strong> ${idea.marketDemand}</p>
      <p><strong>Trend Angle:</strong> ${idea.trend}</p>
      <p><strong>Investment:</strong> ${money(idea.investment)}</p>
      <p><strong>Expected Profit:</strong> ${money(idea.monthlyProfit)}/month</p>
      <p><strong>Confidence:</strong> ${idea.confidence}%</p>
    `;
    ideasWrap.appendChild(card);
  });
}

async function checkMode() {
  try {
    const response = await fetch(`${getApiBase()}/test-ai`);
    const data = await response.json();
    modePill.textContent = `Mode: ${data.mode}`;
  } catch (_error) {
    modePill.textContent = "Mode: unreachable backend";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  ideasWrap.innerHTML = "<p>Generating smart ideas...</p>";

  const payload = {
    budget: document.getElementById("budget").value,
    location: document.getElementById("location").value,
    type: document.getElementById("type").value,
    count: document.getElementById("count").value
  };

  try {
    const response = await fetch(`${getApiBase()}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to generate ideas");
    }

    latest = data;
    modePill.textContent = `Mode: ${data.mode}`;
    renderIdeas(data);
    planBox.textContent = "Click 'Create Plan For Top Idea' to generate strategy.";
  } catch (error) {
    ideasWrap.innerHTML = `<p class="error">${error.message}</p>`;
  }
});

planBtn.addEventListener("click", async () => {
  if (!latest || !latest.ideas || latest.ideas.length === 0) {
    planBox.textContent = "Please generate ideas first.";
    return;
  }

  const top = latest.ideas[0];
  planBox.textContent = "Building action plan...";

  try {
    const response = await fetch(`${getApiBase()}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: top.title,
        location: latest.meta.location,
        profit: top.monthlyProfit
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to build plan");
    }

    planBox.textContent = data.plan;
  } catch (error) {
    planBox.textContent = `Error: ${error.message}`;
  }
});

apiBaseInput.addEventListener("change", checkMode);
checkMode();
