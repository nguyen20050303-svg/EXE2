-- Fix missing ON DELETE CASCADE on payment_requests table
-- This allows you to delete a user from the Authentication dashboard without encountering a Foreign Key Constraint error.

ALTER TABLE public.payment_requests
  DROP CONSTRAINT payment_requests_user_id_fkey,
  ADD CONSTRAINT payment_requests_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;
