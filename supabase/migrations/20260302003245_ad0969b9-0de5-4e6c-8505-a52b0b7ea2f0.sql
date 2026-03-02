
-- Drink categories table
CREATE TABLE public.drink_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'Wine',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.drink_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active drink categories"
ON public.drink_categories FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage drink categories"
ON public.drink_categories FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Drinks table
CREATE TABLE public.drinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.drink_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  size text,
  price numeric NOT NULL DEFAULT 0,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.drinks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active drinks"
ON public.drinks FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage drinks"
ON public.drinks FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Seed with existing data
INSERT INTO public.drink_categories (name, icon, sort_order) VALUES
  ('Longdrinks & Cocktails', 'Martini', 0),
  ('Bier', 'Beer', 1),
  ('Wein & Sekt', 'Wine', 2),
  ('Shots', 'GlassWater', 3),
  ('Alkoholfrei', 'Coffee', 4);

-- Seed drinks
WITH cats AS (SELECT id, name FROM public.drink_categories)
INSERT INTO public.drinks (category_id, name, size, price, sort_order) VALUES
  ((SELECT id FROM cats WHERE name='Longdrinks & Cocktails'), 'Gin Tonic', NULL, 9.00, 0),
  ((SELECT id FROM cats WHERE name='Longdrinks & Cocktails'), 'Vodka Bull', NULL, 9.00, 1),
  ((SELECT id FROM cats WHERE name='Longdrinks & Cocktails'), 'Cuba Libre', NULL, 9.00, 2),
  ((SELECT id FROM cats WHERE name='Longdrinks & Cocktails'), 'Whiskey Cola', NULL, 9.00, 3),
  ((SELECT id FROM cats WHERE name='Longdrinks & Cocktails'), 'Mojito', NULL, 10.00, 4),
  ((SELECT id FROM cats WHERE name='Longdrinks & Cocktails'), 'Aperol Spritz', NULL, 8.00, 5),
  ((SELECT id FROM cats WHERE name='Longdrinks & Cocktails'), 'Moscow Mule', NULL, 10.00, 6),
  ((SELECT id FROM cats WHERE name='Longdrinks & Cocktails'), 'Tequila Sunrise', NULL, 9.00, 7),
  ((SELECT id FROM cats WHERE name='Longdrinks & Cocktails'), 'Sex on the Beach', NULL, 9.00, 8),
  ((SELECT id FROM cats WHERE name='Longdrinks & Cocktails'), 'Long Island Iced Tea', NULL, 11.00, 9),
  ((SELECT id FROM cats WHERE name='Bier'), 'Pils vom Fass', '0,3l', 4.00, 0),
  ((SELECT id FROM cats WHERE name='Bier'), 'Pils vom Fass', '0,5l', 5.00, 1),
  ((SELECT id FROM cats WHERE name='Bier'), 'Weizen', '0,5l', 5.50, 2),
  ((SELECT id FROM cats WHERE name='Bier'), 'Radler', '0,3l', 4.00, 3),
  ((SELECT id FROM cats WHERE name='Wein & Sekt'), 'Weißwein', '0,2l', 5.00, 0),
  ((SELECT id FROM cats WHERE name='Wein & Sekt'), 'Rotwein', '0,2l', 5.00, 1),
  ((SELECT id FROM cats WHERE name='Wein & Sekt'), 'Rosé', '0,2l', 5.00, 2),
  ((SELECT id FROM cats WHERE name='Wein & Sekt'), 'Prosecco', '0,1l', 4.50, 3),
  ((SELECT id FROM cats WHERE name='Wein & Sekt'), 'Sekt (Flasche)', NULL, 25.00, 4),
  ((SELECT id FROM cats WHERE name='Shots'), 'Jägermeister', NULL, 3.00, 0),
  ((SELECT id FROM cats WHERE name='Shots'), 'Vodka', NULL, 3.00, 1),
  ((SELECT id FROM cats WHERE name='Shots'), 'Tequila', NULL, 3.00, 2),
  ((SELECT id FROM cats WHERE name='Shots'), 'Sambuca', NULL, 3.00, 3),
  ((SELECT id FROM cats WHERE name='Shots'), 'Mexikaner', NULL, 3.00, 4),
  ((SELECT id FROM cats WHERE name='Shots'), 'Berliner Luft', NULL, 3.00, 5),
  ((SELECT id FROM cats WHERE name='Alkoholfrei'), 'Cola / Fanta / Sprite', '0,3l', 3.50, 0),
  ((SELECT id FROM cats WHERE name='Alkoholfrei'), 'Red Bull', '0,25l', 4.00, 1),
  ((SELECT id FROM cats WHERE name='Alkoholfrei'), 'Wasser', '0,3l', 3.00, 2),
  ((SELECT id FROM cats WHERE name='Alkoholfrei'), 'Saft (verschiedene)', '0,2l', 3.50, 3);
