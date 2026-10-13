# Distribution de YouTube Clean

Page publique : https://le-sieur.ca/youtube-clean/ (FR) et https://le-sieur.ca/en/youtube-clean/ (EN).

Préparer le paquet depuis la racine du dépôt :

```text
python tools/pack-release.py --output <dossier-de-sortie>
```

Le script utilise une liste explicite de fichiers et ajoute les guides FR/EN et LICENSE. Les dossiers de travail, sauvegardes, instructions internes et installateurs locaux ne sont jamais inclus. Le ZIP contient un seul dossier, avec manifest.json directement à sa racine. Il faut extraire le ZIP puis charger ce dossier en mode développeur, comme décrit dans README.md.

Avant publication : vérifier la version, chaque fichier du manifeste, les scripts et le contenu du ZIP; scanner les secrets et comparer le SHA-256 du téléchargement public au paquet validé. Ne pas publier tout le dossier de développement.
