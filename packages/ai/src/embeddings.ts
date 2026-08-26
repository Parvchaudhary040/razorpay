import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { logger } from '@commerce-ai/shared';

/** Get configured Gemini Embeddings Model */
export function getGeminiEmbeddings(): GoogleGenerativeAIEmbeddings {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    logger.error('Missing GEMINI_API_KEY environment variable for embeddings.');
    throw new Error('Embeddings configuration error: Missing API Key.');
  }

  return new GoogleGenerativeAIEmbeddings({
    modelName: 'text-embedding-004',
    apiKey: apiKey,
  });
}

/**
 * Generate an embedding vector for a product's text content.
 * 
 * @param product Metadata describing the product
 * @returns 768-dimensional number array
 */
export async function generateProductEmbedding(product: {
  name: string;
  description?: string | null;
  category: string;
  specifications?: any;
}): Promise<number[]> {
  try {
    const model = getGeminiEmbeddings();
    
    // Create a rich semantic text representation of the product
    const textToEmbed = "Name: " + product.name + "\nDescription: " + (product.description || 'None') + "\nCategory: " + product.category + "\nSpecifications: " + JSON.stringify(product.specifications || {});

    // Embed the text
    const result = await model.embedQuery(textToEmbed);
    return result;
  } catch (error) {
    logger.error('Failed to generate product embedding', { error });
    throw error;
  }
}