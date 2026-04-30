-- Add payment_method to transactions table
ALTER TABLE public.transactions
ADD COLUMN payment_method TEXT DEFAULT 'Cash' NOT NULL;
