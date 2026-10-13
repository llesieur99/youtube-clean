# YouTube Clean 1.4.2

Extension gratuite pour les navigateurs de bureau basés sur Chromium : Chrome, Edge, Brave et Opera. Interface des options en français. Ce paquet Manifest V3 n'est pas fourni pour Firefox, Safari, les navigateurs mobiles ou les applications YouTube.

## Fonctions

- Masque les Shorts et les jeux intégrés (Playables) dans les éléments reconnus de YouTube, avec protection des vidéos ordinaires dans les résultats de recherche.
- Redirige les pages Playables vers l'accueil (activé par défaut).
- Peut ouvrir un Short dans le lecteur vidéo classique (désactivé par défaut).
- Trie visuellement les chansons de YouTube Music du plus au moins écouté sur les pages artiste et les playlists, lorsque les compteurs sont présents dans la page. Au moins deux compteurs lisibles sont nécessaires. Le bouton « ▼ Lectures » relance le tri; les éléments non chargés ne peuvent pas être triés. Ce tri ne modifie pas la playlist enregistrée et ne garantit pas l'ordre de lecture.

Le masquage Shorts, le masquage Playables et le tri Music sont activés par défaut. Chaque option peut être désactivée depuis l'icône de l'extension. « Appliquer » recharge l'onglet YouTube / Music actif. Pour réafficher les éléments masqués, désactivez l'option puis rechargez la page.

## Installation manuelle

1. Téléchargez le ZIP sur https://le-sieur.ca/youtube-clean/ puis extrayez-le dans un dossier que vous conserverez.
2. Ouvrez la page des extensions en copiant l'adresse de votre navigateur :
   - Chrome : chrome://extensions
   - Edge : edge://extensions
   - Brave : brave://extensions
   - Opera : opera://extensions
3. Activez le « Mode développeur ».
4. Cliquez sur « Charger l'extension non empaquetée » (ou « Load unpacked »). Sélectionnez le dossier YouTube-Clean-v1.4.2 qui contient directement manifest.json. Ne sélectionnez pas le ZIP fermé.
5. Ouvrez ou rechargez YouTube / YouTube Music. Épinglez l'extension si souhaité, puis ouvrez son icône pour régler les options.

Le clic sur le site télécharge le ZIP; il n'installe pas automatiquement l'extension. Aucune publication en boutique n'est nécessaire. Si un navigateur géré par votre organisation interdit le mode développeur, respectez cette restriction. Gardez le dossier extrait à son emplacement.

## Données et permissions

L'extension lit et modifie les pages youtube.com et music.youtube.com couvertes par le manifeste. « storage » conserve les préférences avec chrome.storage.sync : elles peuvent être synchronisées par votre navigateur si sa synchronisation est active. « activeTab » sert au bouton de rechargement de l'onglet actif. Le code ne contient ni service d'analyse, ni serveur du créateur, ni envoi d'historique de navigation au créateur. Aucun compte Le Sieur ni paiement n'est requis.

## Limites, mise à jour et retrait

YouTube change son interface : certains éléments peuvent échapper au masquage ou au tri. L'extension n'est pas un bloqueur de publicités. Le tri dépend des données déjà affichées, sans requête à une API YouTube. Le présent paquet n'inclut pas de mise à jour automatique : téléchargez une nouvelle version lorsqu'elle est offerte et rechargez l'extension depuis la page des extensions. Pour la retirer, utilisez « Supprimer » sur cette page.

Projet indépendant, non affilié à YouTube ou Google. Distribué gratuitement sous licence MIT (voir LICENSE), sans garantie.

English instructions: README-EN.md
