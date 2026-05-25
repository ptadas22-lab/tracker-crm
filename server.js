require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS blocked for this origin"));
    }
  })
);
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = API_KEY && API_KEY.trim() ? new GoogleGenerativeAI(API_KEY) : null;

const demandTypes = [
  "High demand in local markets",
  "Growing demand among young customers",
  "Popular in residential areas",
  "High repeat customers potential",
  "Trending business in urban areas",
  "Good demand near colleges/offices",
  "Increasing demand via online orders"
];

const trendAngles = [
  "subscription model",
  "WhatsApp-first sales",
  "quick delivery",
  "corporate partnerships",
  "student-focused pricing",
  "women-led branding",
  "festival seasonal offers"
];

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function scoreIdea(budget, index) {
  const base = Math.max(45, Math.min(92, 55 + Math.floor(budget / 10000) + index * 2));
  return Math.min(98, base);
}

function buildLocalAiIdeas(type, location, budget, count) {
  const normalizedType = String(type || "service").trim();
  const normalizedLocation = String(location || "your city").trim();

  const templates = [
    `${normalizedType} starter packs for ${normalizedLocation}`,
    `${normalizedLocation} ${normalizedType} express service`,
    `Micro-${normalizedType} studio with online bookings`,
    `Hyperlocal ${normalizedType} + delivery combo`,
    `${normalizedType} consultation + premium upsell`,
    `${normalizedType} community membership model`
  ];

  return Array.from({ length: count }, (_, i) => {
    const title = templates[i % templates.length];
    const investment = Math.floor(budget * (0.25 + i * 0.06));
    const monthlyProfit = Math.floor(budget * (0.09 + i * 0.02));

    return {
      rank: i + 1,
      title,
      marketDemand: demandTypes[i % demandTypes.length],
      trend: trendAngles[i % trendAngles.length],
      investment,
      monthlyProfit,
      confidence: scoreIdea(budget, i)
    };
  });
}

function parseGeminiIdeas(text, budget, count) {
  return text
    .split("\n")
    .map((line) => line.replace(/^[\s\-*\d.)]+/, "").trim())
    .filter((line) => line.length > 3)
    .slice(0, count)
    .map((title, i) => ({
      rank: i + 1,
      title,
      marketDemand: demandTypes[i % demandTypes.length],
      trend: trendAngles[i % trendAngles.length],
      investment: Math.floor(budget * (0.3 + i * 0.05)),
      monthlyProfit: Math.floor(budget * (0.08 + i * 0.02)),
      confidence: scoreIdea(budget, i)
    }));
}

app.post("/generate", async (req, res) => {
  try {
    const { budget, location, type, count } = req.body;
    if (!budget || !location || !type) {
      return res.status(400).json({ error: "Missing fields: budget, location, type are required." });
    }

    const c = Math.min(Math.max(toNumber(count, 5), 1), 20);
    const b = Math.max(toNumber(budget, 0), 1000);

    let ideas = [];
    let mode = "local";

    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `Generate ${c} short practical business ideas for India. Budget: ₹${b}. Location: ${location}. Business Type: ${type}. Return only idea names, one per line.`;
        const result = await model.generateContent(prompt);
        const text = result?.response?.text?.() || "";
        ideas = parseGeminiIdeas(text, b, c);
        if (ideas.length > 0) {
          mode = "gemini";
        }
      } catch (error) {
        console.error("Gemini generation failed, using local mode:", error.message);
      }
    }

    if (ideas.length === 0) {
      ideas = buildLocalAiIdeas(type, location, b, c);
    }

    return res.json({
      mode,
      meta: {
        location,
        type,
        budget: b,
        generatedAt: new Date().toISOString()
      },
      ideas
    });
  } catch (error) {
    console.error("GENERATE ERROR:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/plan", async (req, res) => {
  try {
    const { name, location, profit } = req.body;
    if (!name || !location) {
      return res.status(400).json({ error: "Missing fields: name and location are required." });
    }

    let plan = `# ${name} - Smart Launch Plan\n\n` +
      `Location: ${location}\nExpected Monthly Profit: ₹${profit || "TBD"}\n\n` +
      `## 1) First 7 Days\n- Validate demand with 15 customer interviews\n- Create simple pricing and starter offer\n- Set up WhatsApp Business and Instagram profile\n\n` +
      `## 2) Next 30 Days\n- Run neighborhood launch campaign\n- Track leads, conversion, and repeat rate\n- Improve offer based on feedback\n\n` +
      `## 3) Risks and Mitigation\n- Low demand -> pivot niche quickly\n- High competition -> focus on speed + service quality\n- Cash flow stress -> keep fixed costs lean\n`;

    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `Create a concise actionable business launch plan for ${name} in ${location}. Include: demand validation, setup checklist, pricing, marketing, risks, and first-90-day growth.`;
        const result = await model.generateContent(prompt);
        const aiText = result?.response?.text?.() || "";
        if (aiText.length > 40) {
          plan = aiText;
        }
      } catch (error) {
        console.error("PLAN AI ERROR:", error.message);
      }
    }

    return res.json({ plan });
  } catch (error) {
    console.error("PLAN ERROR:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/test-ai", (_req, res) => {
  res.json({
    mode: genAI ? "gemini" : "local",
    status: "ready",
    corsOrigins: allowedOrigins
  });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
