-- Create product_sizes table for per-size stock tracking
CREATE TABLE public.product_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  alt_label TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;

-- Public read access (same pattern as products/categories)
CREATE POLICY "Product sizes are publicly readable" ON public.product_sizes FOR SELECT USING (true);

-- Admin management (same pattern as other admin policies)
CREATE POLICY "Admins can manage product sizes" ON public.product_sizes FOR ALL USING (public.has_role(auth.uid(), 'admin'));
