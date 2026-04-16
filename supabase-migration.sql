-- ============================================================
-- MIGRATION: Multi-tenant auth
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Adicionar user_id na tabela products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Criar tabela user_settings (chaves Stripe por usuário)
CREATE TABLE IF NOT EXISTS user_settings (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  stripe_secret_key     text NOT NULL DEFAULT '',
  stripe_publishable_key text NOT NULL DEFAULT '',
  stripe_webhook_secret text NOT NULL DEFAULT '',
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- 3. Índice para lookup rápido por user_id
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);