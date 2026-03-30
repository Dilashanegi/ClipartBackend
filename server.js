const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const fetch = require("node-fetch");
const FormData = require("form-data");
const sharp = require("sharp");
require("dotenv").config();

console.log("Starting server...");
console.log("Stability Token loaded:", !!process.env.STABILITY_API_KEY);

const app = express();
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use(limiter);

const STYLE_PROMPTS = {
  cartoon:
    "cartoon style, vibrant colors, thick outlines, fun and playful, high quality",
  flat: "flat illustration style, minimal, clean shapes, modern design, high quality",
  anime:
    "anime style, japanese animation, expressive eyes, colorful, high quality",
  pixel:
    "pixel art style, 8-bit, retro game character, pixelated, high quality",
  sketch:
    "pencil sketch, outline drawing, black and white, hand drawn, high quality",
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

    // convert base64 to buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    // resize to exactly 1024x1024 ← this fixes the error!
    const resizedBuffer = await sharp(imageBuffer)
      .resize(1024, 1024, { fit: "cover" })
      .jpeg()
      .toBuffer();

    const formData = new FormData();
    formData.append("init_image", resizedBuffer, {
      filename: "image.jpg",
      contentType: "image/jpeg",
    });
    formData.append("init_image_mode", "IMAGE_STRENGTH");
    formData.append("image_strength", "0.35");
    formData.append("text_prompts[0][text]", STYLE_PROMPTS[style]);
    formData.append("text_prompts[0][weight]", "1");
    formData.append("text_prompts[1][text]", "blurry, bad quality, distorted");
    formData.append("text_prompts[1][weight]", "-1");
    formData.append("cfg_scale", "7");
    formData.append("steps", "30");
    formData.append("samples", "1");

    const response = await fetch(
      "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
          ...formData.getHeaders(),
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Stability API error:", error);
      return res
        .status(500)
        .json({ error: "Generation failed", details: error });
    }

    const data = await response.json();
    const imageUrl = `data:image/png;base64,${data.artifacts[0].base64}`;
    res.json({ success: true, imageUrl });
  } catch (error) {
    console.error("Generation error:", error.message);
    res
      .status(500)
      .json({ error: "Generation failed", details: error.message });
  }
});

app.get("/", (req, res) => {
  res.json({
    status: "ClipArt AI backend running!",
    tokenLoaded: !!process.env.STABILITY_API_KEY,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Backend running on port " + PORT));
