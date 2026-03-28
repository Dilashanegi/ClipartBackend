const express = require("express");
const cors = require("cors");
const Replicate = require("replicate");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

console.log("Token loaded:", !!process.env.REPLICATE_API_TOKEN);

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
});
app.use(limiter);

const STYLE_PROMPTS = {
  cartoon: "cartoon style, vibrant colors, thick outlines, fun and playful",
  flat: "flat illustration style, minimal, clean shapes, modern design",
  anime: "anime style, japanese animation, expressive eyes, colorful",
  pixel: "pixel art style, 8-bit, retro game character, pixelated",
  sketch: "pencil sketch, outline drawing, black and white, hand drawn",
};

app.post("/generate", async (req, res) => {
  try {
    const { imageBase64, style } = req.body;

    if (!imageBase64 || !style) {
      return res.status(400).json({ error: "Image and style are required" });
    }

    if (!STYLE_PROMPTS[style]) {
      return res.status(400).json({ error: "Invalid style selected" });
    }

    const prompt = STYLE_PROMPTS[style];


    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2319f9b1d4a99eba3a84dce0a9b4b0a7b",
      {
        input: {
          prompt: `${prompt}, portrait, high quality`,
          input_image: imageBase64,
          strength: 0.7,
          num_inference_steps: 30,
        },
      }
    );

    

    res.json({ success: true, imageUrl: output[0] });

  } catch (error) {
    console.error("Generation error:", error);
    res.status(500).json({ error: "Generation failed" });
  }
});

app.get("/", (req, res) => {
  res.json({ status: "ClipArt AI backend running!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
