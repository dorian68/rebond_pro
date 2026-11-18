#!/bin/sh
set -eu
# Suppression limitée à la table de collecte, sans journalisation des réponses.
docker exec rebondpro-db psql -v ON_ERROR_STOP=1 -U rebondpro -d rebondpro \
  -c 'DELETE FROM "QuestionnaireResponse" WHERE "expiresAt" <= CURRENT_TIMESTAMP;'
