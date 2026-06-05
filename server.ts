import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase JSON payload limits for base64 image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy init of Gemini SDK to prevent crash if key is temporarily missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY env variable is not set. API calls will fail.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY_FOR_LINT",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Ensure the client is setup
const ai = getGeminiClient();

// API: Extract words from general image (photo of word list, book page, etc.)
app.post("/api/dictation/extract-image", async (req, res) => {
  try {
    const { base64Data, mimeType } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: "Missing base64Data in request body" });
    }

    const cleanMimeType = mimeType || "image/jpeg";
    // Check if real key is available
    if (process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY" || !process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured. Please set the key in the Secrets panel in the Settings menu.",
      });
    }

    const imagePart = {
      inlineData: {
        mimeType: cleanMimeType,
        data: base64Data,
      },
    };

    const prompt = 
      "Analyze this image and extract all distinct English vocabulary words, vocabulary lists, or readable english text. " +
      "Identify the individual English words (such as nouns, verbs, adjectives). Filter out common simple grammar words like 'the', 'a', 'an', 'and', 'or', 'of', 'to' unless they are explicitly part of a vocabulary study list. " +
      "Normalize the words to their lowercase dictionary singular/infinitive base form (e.g., 'study' instead of 'studying' or 'studies'). " +
      "Return ONLY a clean JSON array of strings.";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [imagePart, prompt],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
            description: "An extracted unique English vocabulary word in dictionary form.",
          },
        },
      },
    });

    const text = response.text || "[]";
    const words = JSON.parse(text);

    return res.json({ words });
  } catch (error: any) {
    console.error("Error in extract-image:", error);
    return res.status(500).json({ error: error.message || "Failed to extract words from image" });
  }
});

// API: Extract words from text content (imported text file, copy-pastes, etc.)
app.post("/api/dictation/extract-text", async (req, res) => {
  try {
    const { textContent } = req.body;
    if (!textContent || typeof textContent !== "string") {
      return res.status(400).json({ error: "Missing textContent in request body" });
    }

    if (process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY" || !process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured. Please set the key in the Secrets panel in the Settings menu.",
      });
    }

    const prompt =
      `Identify and extract English vocabulary words from the following text block. ` +
      `Highlight the key vocabulary, phrases, or distinct words. Normalize verbs and plurals to their base form (lowercase, e.g. 'persist' instead of 'persisted'). ` +
      `Ignore common basic stop words (e.g., 'the', 'is', 'at'). ` +
      `Return the extracted words ONLY as a flat JSON array of strings.\n\n` +
      `Text:\n"${textContent}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
            description: "An extracted English vocabulary word in its dictionary base form.",
          },
        },
      },
    });

    const text = response.text || "[]";
    const words = JSON.parse(text);

    return res.json({ words });
  } catch (error: any) {
    console.error("Error in extract-text:", error);
    return res.status(500).json({ error: error.message || "Failed to extract words from text" });
  }
});

// API: Generate Phonetics, Translations, Example Sentences, and translations of sentences for a list of words
app.post("/api/dictation/generate-details", async (req, res) => {
  try {
    const { words } = req.body;
    if (!words || !Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ error: "Missing words array in request body" });
    }

    if (process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY" || !process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured. Please set the key in the Secrets panel in the Settings menu.",
      });
    }

    // Limit batch size to make sure prompt doesn't exceed output limits/timeouts.
    // We'll instruct the model to do up to 40 words, but realistically, batches from frontend should be kept <= 30.
    const limitedWords = words.slice(0, 45);

    const prompt =
      `You are an expert English lexicographer and language teacher. For the list of English words provided below, create a structured language learning package. ` +
      `For each word, provide: \n` +
      `1. The word itself (exact matches from the requested list).\n` +
      `2. Accurate English IPA phonetic symbol (enclosed in forward slashes, e.g., UK or US standards like /ˈlɪm.ɪt/ or /æmˈbɪʃ.n̩/).\n` +
      `3. Concise and accurate Chinese translation (one or two main dictionary meanings with part-of-speech labels, e.g. "n. 苹果" or "v. 坚持; 固执").\n` +
      `4. A beautiful, clear, and contextual English example sentence (high-school / adult difficulty) demonstrating standard correct usage of the word. Keep the word in the sentence relevant to the context. Avoid overly simplistic sentences like 'This is an apple.'\n` +
      `5. A natural, accurate Chinese translation of that example sentence.\n\n` +
      `Words to process: ${JSON.stringify(limitedWords)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING, description: "The original English word requested." },
              phonetic: { type: Type.STRING, description: "IPA phonetic spelling inside slashes." },
              translation: { type: Type.STRING, description: "Concise Chinese meaning with part of speech." },
              example: { type: Type.STRING, description: "A highly practical English example sentence." },
              exampleTranslation: { type: Type.STRING, description: "Chinese translation of the example sentence." },
            },
            required: ["word", "phonetic", "translation", "example", "exampleTranslation"],
          },
        },
      },
    });

    const text = response.text || "[]";
    const details = JSON.parse(text);

    return res.json({ details });
  } catch (error: any) {
    console.error("Error in generate-details:", error);
    return res.status(500).json({ error: error.message || "Failed to generate word details" });
  }
});

// Middleware & SPA Static Routing Setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
