import { GoogleGenAI } from "@google/genai";

/**
 * AI Mentor xizmati uchun Gemini API integratsiyasi.
 * Har doim chaqiruvdan oldin yangi GoogleGenAI instance yaratiladi.
 */
export const getMentorResponse = async (userPrompt: string, context: string) => {
  // Named parameter initialization with process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    // Upgrading to gemini-3-pro-preview for higher quality reasoning and programming help
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: userPrompt,
      config: {
        systemInstruction: context,
      },
    });
    // Direct property access to .text as per latest GenAI SDK standards
    return response.text || "Kechirasiz, javob olib bo'lmadi.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI Mentor bilan bog'lanishda xatolik yuz berdi.";
  }
};