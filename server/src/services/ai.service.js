const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

async function generateCaption(base64ImageFile, mimeType = "image/jpeg", tone = 'creative') {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY is missing. Add it to your environment to enable AI caption generation.');
  }

  const toneMap = {
    creative: 'bold and playful',
    professional: 'clean and polished',
    energetic: 'high-energy and exciting',
    minimal: 'simple and elegant'
  };

  const selectedTone = toneMap[tone] || toneMap.creative;

  const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

  const request = model.generateContent([
    {
      inlineData: {
        data: base64ImageFile,
        mimeType,
      },
    },
    `Write a social media caption for this image in a ${selectedTone} style. Keep it under 12 words, include 1-3 relevant emojis, and no explanation outside the caption.`
  ]);
  let timeoutId;
  const timeout = new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Gemini request timed out.')), 30000);
  });
  let result;
  try {
    result = await Promise.race([request, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }

  return result.response.text().trim();
}

module.exports = { generateCaption };
