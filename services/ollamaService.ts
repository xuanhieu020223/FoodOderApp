/**
 * Service để gọi Ollama API
 * Ollama chạy local tại http://127.0.0.1:11434
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

const sanitizeUrl = (url: string) => url.replace(/\/$/, '');

const stripProtocol = (uri: string) =>
  uri.replace(/^(https?:\/\/|exp:\/\/|ws:\/\/|wss:\/\/)/i, '');

const getEnvOllamaUrl = () => {
  const envUrl =
    globalThis?.process?.env?.EXPO_PUBLIC_OLLAMA_URL ||
    Constants.expoConfig?.extra?.ollamaBaseUrl ||
    Constants.manifest2?.extra?.ollamaBaseUrl ||
    Constants.manifest?.extra?.ollamaBaseUrl;

  if (envUrl && typeof envUrl === 'string') {
    return sanitizeUrl(envUrl);
  }

  return null;
};

const getExpoHostIp = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost;

  if (!hostUri) return null;

  const sanitized = stripProtocol(hostUri);
  const [host] = sanitized.split(':');
  if (!host || host === 'localhost') return null;

  return `http://${host}:11434`;
};

// Base URL theo từng môi trường chạy app
const getOllamaBaseUrl = () => {
  const envUrl = getEnvOllamaUrl();
  if (envUrl) {
    return envUrl;
  }

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return sanitizeUrl(window.location.origin.replace(/:\d+$/, ':11434'));
    }

    return "http://localhost:11434";
  }

  // Nếu đang chạy dev qua Expo (Android/iOS), ưu tiên IP chung mạng
  if (__DEV__) {
    const expoHost = getExpoHostIp();
    if (expoHost) {
      return expoHost;
    }
  }

  if (Platform.OS === "android") {
    // Android emulator cannot access 127.0.0.1
    return "http://10.0.2.2:11434";
  }

  // Web, iOS simulator hoặc thiết bị thật (nếu cùng wifi)
  return "http://127.0.0.1:11434";
};


const OLLAMA_BASE_URL = getOllamaBaseUrl();
const DEFAULT_MODEL = "llama3.2";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Gửi message đến Ollama và nhận response
 */
export const sendMessageToOllama = async (
  message: string,
  conversationHistory: ChatMessage[] = [],
  model: string = DEFAULT_MODEL
): Promise<string> => {

  if (!message.trim()) {
    throw new Error("Message không được để trống");
  }

  // SYSTEM PROMPT
  const systemPrompt = `Bạn là trợ lý AI của ứng dụng đặt đồ ăn FoodOrder. 
Trả lời ngắn gọn, thân thiện bằng tiếng Việt.`;

  // Format đúng chuẩn Ollama
  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  console.log("➡ Sending:", messages);

  // Timeout 30s
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API ERROR:", errorText);

      if (response.status === 404) {
        throw new Error(`Model "${model}" không tồn tại. Hãy chạy: ollama pull ${model}`);
      }

      throw new Error("Lỗi từ Ollama: " + errorText);
    }

    const data = await response.json();
    console.log("✔ RESPONSE:", data);

    // Chuẩn Ollama: data.message.content
    const reply =
      data?.message?.content ||
      data?.response ||
      data?.content ||
      "";

    if (!reply.trim()) {
      return "Xin lỗi, tôi không thể trả lời câu hỏi này.";
    }

    return reply.trim();
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err?.name === "AbortError") {
      throw new Error("Quá thời gian chờ. Ollama không phản hồi.");
    }

    const msg = err?.message?.toLowerCase() || "";

    if (
      msg.includes("failed to fetch") ||
      msg.includes("network") ||
      msg.includes("refused") ||
      msg.includes("typeerror")
    ) {
      const note =
        Platform.OS === "web"
          ? `Hãy chạy:  OLLAMA_ORIGINS="*" ollama serve`
          : "";

      throw new Error(
        `Không thể kết nối tới Ollama tại ${OLLAMA_BASE_URL}. ${note}`
      );
    }

    throw err;
  }
};

/**
 * Kiểm tra Ollama có chạy hay không
 */
export const checkOllamaConnection = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    return res.ok;
  } catch (e) {
    return false;
  }
};

/**
 * Lấy danh sách model
 */
export const getAvailableModels = async (): Promise<string[]> => {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!res.ok) return [DEFAULT_MODEL];

    const data = await res.json();
    return data.models?.map((m: any) => m.name) ?? [DEFAULT_MODEL];
  } catch (e) {
    return [DEFAULT_MODEL];
  }
};
