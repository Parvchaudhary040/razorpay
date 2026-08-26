import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { loadConfig, logger } from '@commerce-ai/shared';

const config = loadConfig();

/** Get configured Gemini Pro Chat Model */
export function getGeminiModel(): ChatGoogleGenerativeAI {
  if (process.env.NODE_ENV === 'test') {
    throw new Error('LLM calls are disabled during testing to avoid slow execution and timeout exceptions.');
  }
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
    model: 'gemini-1.5-flash',
    apiKey: apiKey,
    maxRetries: 3, // Retry limits
    temperature: 0.7, // Balanced creativity and consistency
  });
}