-- 002_restrict_trackers_rls.sql
-- Fix: product_trackers public read policy exposes sensitive config (API tokens).
-- Remove public read — all tracker queries go through service_role anyway.

drop policy if exists "product_trackers_public_read" on product_trackers;

-- Only service_role can access product_trackers (read + write)
-- The existing "product_trackers_service_write" policy already covers all operations for service_role.
