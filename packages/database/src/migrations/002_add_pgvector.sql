-- ============================================
-- CommerceAI — Add pgvector and Semantic Search
-- ============================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column to products table
-- Using 768 dimensions for Google Gemini text-embedding-004 model
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 3. Create HNSW index for fast similarity search
-- Uses cosine similarity (vector_cosine_ops)
CREATE INDEX IF NOT EXISTS products_embedding_idx ON products USING hnsw (embedding vector_cosine_ops);