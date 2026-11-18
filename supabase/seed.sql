-- Données de départ. Les prix sont PROVISOIRES et à modifier dans l'administration.
insert into public.categories (name, slug, sort_order) values
  ('Pintades frites', 'pintades-frites', 1),
  ('Brochettes', 'brochettes', 2),
  ('Boissons', 'boissons', 3);

insert into public.products (category_id, name, description, price_xof, is_featured)
select c.id, p.name, p.description, p.price, p.featured
from (values
  ('pintades-frites', 'Pintade frite entière', 'Pintade dorée et croustillante, assaisonnée maison.', 5000, true),
  ('pintades-frites', 'Demi-pintade frite', 'Une demi-pintade frite, idéale pour une personne.', 2500, false),
  ('brochettes', 'Brochette de bœuf', 'Brochette grillée aux épices.', 500, true),
  ('brochettes', 'Brochette de mouton', 'Brochette de mouton tendre, grillée au feu de bois.', 600, false),
  ('boissons', 'Eau minérale', 'Bouteille d''eau fraîche.', 300, false),
  ('boissons', 'Boisson gazeuse', 'Soda bien frais.', 500, false)
) as p(cat, name, description, price, featured)
join public.categories c on c.slug = p.cat;
