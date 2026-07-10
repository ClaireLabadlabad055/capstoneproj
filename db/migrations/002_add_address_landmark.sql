-- Migration: add address and landmark columns to customers table
-- Run this in Supabase SQL editor or via supabase CLI

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS address text;

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS landmark text;
