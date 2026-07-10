-- Migration: add avatar_url column to customers table
-- Run this in Supabase SQL editor or via supabase CLI

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS avatar_url text;
