
import { GoogleGenAI, Type } from "@google/genai";
import { NodeItem } from "../types";

// 提取环境变量，如果 define 注入失败则回退到空字符串
const getApiKey = () => process.env.API_KEY || '';

const parseNodeText = async (text: string): Promise<Partial<NodeItem>[]> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("API Key not found, returning empty list");
    return [];
  }

  const ai = new GoogleGenAI({ apiKey });

  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        protocol: { type: Type.STRING, description: "Protocol type (vmess, vless, ss, trojan)" },
        name: { type: Type.STRING, description: "A meaningful name for the node." },
        address: { type: Type.STRING, description: "IP address or domain" },
        port: { type: Type.INTEGER, description: "Port number" },
        country: { type: Type.STRING, description: "Country name" },
        rawLink: { type: Type.STRING, description: "The full original link" }
      },
      required: ["protocol", "address", "port", "rawLink"],
      propertyOrdering: ["protocol", "name", "address", "port", "country", "rawLink"],
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Extract proxy nodes from this text: ${text.substring(0, 10000)}`, 
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text;
    return jsonText ? JSON.parse(jsonText) : [];
  } catch (error) {
    console.error("Gemini Error:", error);
    return [];
  }
};

const generateConfigAdvice = async (nodes: NodeItem[]): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "AI 暂未配置。";

  const ai = new GoogleGenAI({ apiKey });
  const summary = nodes.slice(0, 20).map(n => `${n.protocol} - ${n.country}`).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `分析这些节点并给出简短建议：\n\n${summary}`,
    });
    return response.text || "暂无建议。";
  } catch (e) {
    return "分析失败。";
  }
};

export const GeminiService = {
  parseNodeText,
  generateConfigAdvice
};
