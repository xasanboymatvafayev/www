
import { GoogleGenAI, Type } from "@google/genai";

/**
 * AI Mentor xizmati uchun Gemini API integratsiyasi.
 */
export const getMentorResponse = async (userPrompt: string, context: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: userPrompt,
      config: {
        systemInstruction: context,
      },
    });
    return response.text || "Kechirasiz, javob olib bo'lmadi.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI Mentor bilan bog'lanishda xatolik yuz berdi.";
  }
};

/**
 * Vazifalarni avtomatik baholash uchun funksiya.
 * Admin belgilagan maxPoints asosida ball qo'yadi.
 */
export const evaluateSubmission = async (task: any, answer: string, maxPoints: number, lang: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Vazifa nomi: ${task.title}
    Vazifa tavsifi: ${task.description}
    Vazifa matni: ${task.textContent || 'Matn mavjud emas'}
    
    Talabaning javobi: ${answer}
    Maksimal ball: ${maxPoints}
  `;

  const systemInstruction = `
    Siz EduSync platformasi uchun AI baholovchisiz. 
    Talabaning javobini vazifa shartlariga qarab xolisona baholang.
    1. Ballni 0 dan ${maxPoints} gacha bo'lgan butun son ko'rinishida bering.
    2. Qisqa va foydali izoh (feedback) yozing.
    Til: ${lang === 'uz' ? 'O\'zbek tili' : lang === 'ru' ? 'Rus tili' : 'Ingliz tili'}.
    Faqat JSON formatda javob bering.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { 
              type: Type.NUMBER,
              description: "Talabaga qo'yilgan ball"
            },
            feedback: { 
              type: Type.STRING,
              description: "Baholash uchun qisqa izoh"
            }
          },
          required: ["score", "feedback"],
        },
      },
    });

    const result = JSON.parse(response.text || '{}');
    return {
      score: Math.min(Math.max(0, Math.round(result.score || 0)), maxPoints),
      feedback: result.feedback || "Yaxshi urinish!"
    };
  } catch (error) {
    console.error("AI Grading Error:", error);
    return { score: 0, feedback: "AI baholashda xatolik yuz berdi." };
  }
};
