const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { HfInference } = require("@huggingface/inference");
require("dotenv").config();

console.log("Starting server...");
console.log("HF Token loaded:", !!process.env.HF_TOKEN);

const app = express();
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use(limiter);

const hf = new HfInference(process.env.HF_TOKEN);

const STYLE_PROMPTS = {
  cartoon: "cartoon style, vibrant colors, thick outlines, fun portrait, high quality",
  flat: "flat illustration style, minimal, clean shapes, modern portrait, high quality",
  anime: "anime style, japanese animation, expressive eyes, colorful portrait, high quality",
  pixel: "pixel art style, 8-bit, retro game character, pixelated portrait, high quality",
  sketch: "pencil sketch, outline drawing, black and white, hand drawn portrait, high quality",
};

app.post("/generate", async (req, res) => {
  try {
    const { style } = req.body;
    if (!style) return res.status(400).json({ error: "Style is required" });
    if (!STYLE_PROMPTS[style]) return res.status(400).json({ error: "Invalid style" });

    const blob = await hf.textToImage({
      model: "black-forest-labs/FLUX.1-schnell",
      inputs: STYLE_PROMPTS[style],
      parameters: { num_inference_steps: 20, guidance_scale: 7.5 },
    });

    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    res.json({ success: true, imageUrl: "data:image/png;base64," + base64 });

  } catch (error) {
    console.error("Generation error:", error.message);
    res.status(500).json({ error: "Generation failed", details: error.message });
  }
});

app.get("/", (req, res) => {
  res.json({ status: "ClipArt AI backend running!", tokenLoaded: !!process.env.HF_TOKEN });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Backend running on port " + PORT));