-- Les témoignages de seed sont fictifs et ne doivent jamais apparaître comme
-- preuve sociale. Les retours qualité internes restent conservés séparément.
DELETE FROM "Testimonial"
WHERE
  ("author" = 'Sophie R.' AND "content" = 'J''ai construit mon premier tableau de bord dès la fin de la formation.')
  OR ("author" = 'Nathalie R.' AND "content" = 'Une formation Excel qui a vraiment changé notre façon de travailler. Claire est une formidable pédagogue.')
  OR ("author" = 'Karim B.' AND "content" = 'Julien a rendu l''IA concrète et applicable dès le lendemain. Bluffant.')
  OR ("author" = 'Sophie L.' AND "content" = 'Enfin une formation finance compréhensible pour mes équipes opérationnelles. Sarah maîtrise son sujet.')
  OR ("author" = 'Marc V.' AND "content" = 'Power BI n''a plus de secret pour nous. Des tableaux de bord pro en 3 jours.')
  OR ("author" = 'Émilie D.' AND "content" = 'Centre très professionnel, accueil au top et formateurs disponibles. Je recommande.');
