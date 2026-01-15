import { GoogleGenAI } from "@google/genai";

// Fix: Use process.env.API_KEY directly for initialization as per guidelines.
// @ts-ignore: process.env is injected at runtime and might not be recognized by the static type checker in this environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getMentorResponse = async (userPrompt: string, context: string) => {
  try {
    // Fix: Use ai.models.generateContent with the specific model name and system instruction for better persona separation.
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userPrompt,
      config: {
        systemInstruction: `You are an expert academic mentor on a video course platform. 
        Context: ${context}
        Instructions: Provide a helpful, encouraging, and concise answer. If they ask about code, explain the logic.`,
      },
    });
    // Fix: Access response text using the .text property (not a method call).
    return response.text || "I'm sorry, I couldn't generate a response right now.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error connecting to AI Mentor. Please check your network.";
  }
};
