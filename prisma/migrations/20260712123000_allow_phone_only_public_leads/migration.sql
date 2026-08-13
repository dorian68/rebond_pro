-- Les parcours publics acceptent un email ou un téléphone. Les leads Socrate
-- continuent d'exiger l'email au niveau de leur schéma applicatif.
ALTER TABLE "SocrateLeadCapture" ALTER COLUMN "email" DROP NOT NULL;
