import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { loadConfig, logger } from '@commerce-ai/shared';

const config = loadConfig();

/** Get configured Gemini Pro Chat Model */
export function getGeminiModel(): ChatGoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    logger.error('Missing GEMINI_API_KEY environment variable.');
    throw new Error('LLM configuration error: Missing API Key.');
  }

  // Ensure we never log the API key
  if (apiKey.includes('mock-gemini-key') || apiKey === '') {
    logger.warn('Gemini API key is configured with a mock value. Gemini requests will fail in production.');
  }

  return new ChatGoogleGenerativeAI({
    modelName: 'gemini-pro',
    apiKey: apiKey,
    maxRetries: 3, // Retry limits
 // model timeout (15 seconds)
  });
}