import { GoogleGenAI, Type } from "@google/genai";
import { NodeItem } from "../types";

const parseNodeText = async (text: string): Promise<Partial<NodeItem>[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found, returning empty list");
    return [];
  }

  const ai = new GoogleGenAI({ apiKey });

  // Schema for structured extraction
  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        protocol: { type: Type.STRING, description: "Protocol type (vmess, vless, ss, trojan)" },
        name: { type: Type.STRING, description: "A meaningful name for the node. Use Country + Provider if possible." },
        address: { type: Type.STRING, description: "IP address or domain" },
        port: { type: Type.INTEGER, description: "Port number" },
        country: { type: Type.STRING, description: "Estimated country name (e.g. '美国', '香港') based on the address or context." },
        rawLink: { type: Type.STRING, description: "The full original link (e.g., vmess://...)" }
      },
      required: ["protocol", "address", "port", "rawLink"],
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
        You are a proxy configuration parser. 
        Your task is to extract vmess, vless, ss (shadowsocks), and trojan links from the input text.
        
        Rules:
        1. If the text contains a Base64 string that decodes to a list of links, use the decoded links.
        2. Extract valid proxy links.
        3. Do NOT invent nodes. Only extract what is present.
        4. Return a JSON array strictly following the schema.

        Input text:
        ${text.substring(0, 15000)} 
      `, 
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text;
    if (!jsonText) return [];
    
    const parsedData = JSON.parse(jsonText);
    return parsedData;
  } catch (error) {
    console.error("Gemini Parse Error:", error);
    return [];
  }
};

const generateConfigAdvice = async (nodes: NodeItem[]): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return "请配置 API Key 以获取 AI 建议。";

  const ai = new GoogleGenAI({ apiKey });
  
  const summary = nodes.slice(0, 50).map(n => `${n.protocol} - ${n.country} - ${n.latency}ms`).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `根据以下代理节点列表（部分采样），简要分析网络质量分布，推荐延迟最低的2个国家/地区。请使用中文，100字以内。\n\n${summary}`,
    });
    return response.text || "无法生成建议。";
  } catch (e) {
    return "AI 服务暂时不可用。";
  }
};

export const GeminiService = {
  parseNodeText,
  generateConfigAdvice
};