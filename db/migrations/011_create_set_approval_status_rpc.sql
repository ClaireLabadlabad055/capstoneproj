-- Create a Supabase RPC for admin approval updates
-- Run this in the Supabase SQL editor.

CREATE OR REPLACE FUNCTION public.set_approval_status(p_target_id uuid, p_next_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.merchants
  SET status = CASE
        WHEN p_next_status = 'Active' THEN 'Active'
        WHEN p_next_status = 'Rejected' THEN 'Rejected'
        ELSE 'Pending'
      END,
      approval_status = CASE
        WHEN p_next_status = 'Active' THEN 'approved'
        WHEN p_next_status = 'Rejected' THEN 'rejected'
        ELSE 'pending'
      END
  WHERE id = p_target_id;

  UPDATE public.customers
  SET status = CASE
        WHEN p_next_status = 'Active' THEN 'Active'
        WHEN p_next_status = 'Rejected' THEN 'Rejected'
        ELSE 'Pending'
      END,
      approval_status = CASE
        WHEN p_next_status = 'Active' THEN 'approved'
        WHEN p_next_status = 'Rejected' THEN 'rejected'
        ELSE 'pending'
      END
  WHERE id = p_target_id;

  UPDATE public.profiles
  SET status = CASE
        WHEN p_next_status = 'Active' THEN 'Active'
        WHEN p_next_status = 'Rejected' THEN 'Rejected'
        ELSE 'Pending'
      END,
      approval_status = CASE
        WHEN p_next_status = 'Active' THEN 'approved'
        WHEN p_next_status = 'Rejected' THEN 'rejected'
        ELSE 'pending'
      END
  WHERE id = p_target_id;
END;
$$;
