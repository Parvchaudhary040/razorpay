-- Create Token Blocklist Table
CREATE TABLE IF NOT EXISTS token_blocklist (
  token VARCHAR(1000) PRIMARY KEY,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index for quick cleanup of expired tokens
CREATE INDEX idx_token_blocklist_expires_at ON token_blocklist(expires_at);