# ClickFast

[![Verify](https://github.com/Adrien14235/docker/actions/workflows/verify.yml/badge.svg)](https://github.com/Adrien14235/docker/actions/workflows/verify.yml)
[![Release](https://github.com/Adrien14235/docker/actions/workflows/release.yml/badge.svg)](https://github.com/Adrien14235/docker/actions/workflows/release.yml)

**Auteur** : Adrien Antunes

Mini-jeu de rapidité où le but est de faire le plus grand nombre de clics en 5 secondes. 
Le front est servi par Nginx, les scores sont envoyés à une API Node.js/Express qui les enregistre dans une base PostgreSQL, et un service Python sous FastAPI permet de récupérer les statistiques globales.

## Structure de la stack

La stack tourne avec Docker et Docker Compose :
- **web** : Frontend statique (HTML, CSS, JS) servi par Nginx (`port 8080`)
- **scores-api** : API Express pour sauvegarder et récupérer les meilleurs scores (`port 3000`)
- **stats-api** : API Python/FastAPI pour les statistiques globales (`port 8000`)
- **db** : Base PostgreSQL 16 stockée sur un volume nommé (`clickfast_pgdata`)
- **adminer** : Interface web pour inspecter la base de données (`port 8081`)

## Lancer le projet

1. Créer le fichier d'environnement à partir de l'exemple :
```bash
cp .env.example .env
```

2. Lancer la stack en local (build depuis les sources) :
```bash
docker compose up -d --build
```

3. Ou lancer la stack de prod (depuis les images Docker Hub) :
```bash
docker compose -f docker-compose.prod.yml up -d
```

### Liens utiles
- Jeu : http://localhost:8080
- API des scores : http://localhost:3000/api/scores
- API des stats : http://localhost:8000/stats
- Adminer : http://localhost:8081 (Serveur: `db`, Utilisateur: `clickfast_user`, Mot de passe: voir dans `.env`, Base: `clickfast_db`)

---

## Mesures et optimisations (Étape 9)

| Image | Taille | Couches (plus grosse couche) | Build à froid / à chaud | Temps 1re réponse HTTP |
| :--- | :--- | :--- | :--- | :--- |
| **clickfast (web)** | 21 Mo (73.7 Mo sur disque) | 32 couches (38.7 Mo - base nginx) | 1.8s / 0.6s | 7.4s |
| **scores-api** | 56.1 Mo (231 Mo sur disque) | 18 couches (155 Mo - base node) | 7.7s / 1.39s | 7.6s |
| **stats-api** | 51.4 Mo (210 Mo sur disque) | 21 couches (87.5 Mo - base python) | 9.8s / 1.35s | 8.4s |

---

## Journal de bord

### Étape 1 : Le jeu tourne
J'ai créé l'interface du jeu avec `index.html`, `style.css` et `script.js`. Le jeu démarre dès qu'on clique sur le bouton, le compte à rebours de 5 secondes se lance, et le bouton se grise automatiquement à la fin pour bloquer le score. Testé directement dans le navigateur, tout tourne sans conteneur pour l'instant.

### Étape 2 : L'image du jeu, en Dockerfile de production
Création du `Dockerfile` pour servir les fichiers statiques avec Nginx. 
- Image de base épinglée : `nginxinc/nginx-unprivileged:1.27-alpine`.
- Premier accroc : en voulant mettre un simple `USER nginx` sur l'image officielle `nginx:alpine`, le conteneur a planté direct au démarrage avec un `Permission denied` sur `/var/cache/nginx`. Au lieu de bidouiller les droits du cache en root, je suis passé sur `nginxinc/nginx-unprivileged` sur le port 8080.
- Avec le `.dockerignore`, le contexte de build envoyé à Docker ne fait que 7.98 Ko et l'image ne contient aucun fichier inutile (`.git`, doc, etc.). `docker run --rm clickfast-web whoami` renvoie bien `nginx` (non-root).

### Étape 3 : Le scoreboard (API de scores et base Postgres)
Création du dossier `scores-api/` avec Express. Deux routes : `POST /api/scores` et `GET /api/scores`. 
- Dockerfile en multi-stage build pour séparer le build et dégager les devDependencies avec `npm prune --omit=dev`.
- Lancement de PostgreSQL à la main avec `docker run` sur un volume nommé `clickfast_pgdata`.
- Galère de l'étape : sans network custom, Postgres s'est retrouvé sur le bridge par défaut de Docker. Il a fallu inspecter le conteneur pour récupérer son IP interne (`172.17.0.2`) et la passer en variable à l'API. Si on redémarre le conteneur, l'IP change et tout casse.
- Tests de persistance : j'ai supprimé le conteneur Postgres avec `docker rm -f`, puis j'en ai relancé un autre sur le même volume nommé : les scores étaient toujours là. Si on coupe Postgres pendant une requête, l'API renvoie un code 503 propre au lieu de planter le process Node.

### Étape 4 : Le réseau isolé
Création d'un network bridge dédié (`docker network create clickfast-network`).
- L'API se connecte maintenant à Postgres via son nom de conteneur (`DB_HOST=clickfast-db`) grâce au DNS automatique de Docker, plus besoin de s'embêter avec les adresses IP.
- J'ai retiré `-p 5432:5432` sur Postgres. Testé depuis ma machine hôte avec `Test-NetConnection` : connexion refusée, le port de la base n'est plus du tout accessible depuis l'extérieur.

### Étape 5 : La configuration sort du code
Suppression de tous les identifiants en clair dans le code. 
- Utilisation de `dotenv` et `process.env`.
- Le `.env` est ajouté au `.gitignore` pour ne jamais le pousser sur GitHub. J'ai créé un `.env.example` avec des valeurs par défaut pour le repo.
- Dans `src/db.js`, j'ai mis une vérification stricte : si une variable obligatoire comme `DB_PASSWORD` manque, l'app plante immédiatement avec un message d'erreur clair au lieu d'un `undefined` silencieux.

### Étape 6 : Toute la stack dans un fichier
Création du `docker-compose.yml` qui regroupe les 4 services (`web`, `scores-api`, `db`, `adminer`).
- Ajout d'un `healthcheck` avec `pg_isready` sur Postgres et `condition: service_healthy` sur l'API pour être sûr que la base est prête avant de démarrer le backend.
- Test de panne : quand on arrête Postgres avec `docker compose stop db`, l'API renvoie une 503 propre. Dès qu'on relance la base avec `docker compose start db`, l'API se reconnecte toute seule sans devoir redémarrer toute la stack.

### Étape 7 : Le service de stats en Python
Ajout du microservice `stats_api/` en Python avec FastAPI.
- Le service lit directement la table `scores` dans Postgres pour sortir les stats globales (parties jouées, nombre de joueurs distincts, record).
- Dockerfile basé sur `python:3.12-slim` avec utilisateur non-root `appuser` et `PYTHONUNBUFFERED=1` pour avoir les logs en direct.
- Connecté sur le même réseau `clickfast-network`. Si la base est coupée, `/stats` renvoie une erreur 503 claire au client sans fuite de stacktrace.

### Étape 8 : Publier et redéployer depuis le registry
- Tag de mes images avec version explicite (`adrien14235/clickfast:1.0.0`, `scores-api:1.0.0`, `stats-api:1.0.0`), sans utiliser de tag `latest`.
- Création de `docker-compose.prod.yml` qui utilise uniquement les images taguées (pas de `build:`). La stack démarre sans avoir besoin des sources.
- Vérification avec `docker history` : aucun mot de passe ni secret n'apparaît dans les couches des images.

### Étape 9 : Mesurer et optimiser
- En mettant la copie des dépendances (`package*.json` et `requirements.txt`) avant le code source dans les Dockerfile, le build à chaud passe à environ 1 seconde car le cache Docker n'est pas invalidé à chaque modif de code.
- Grâce aux images Alpine / Slim et au multi-stage build, les images restent légères (21 Mo pour Nginx, 56 Mo pour l'API Node).

### Étape 10 : Le test qui rejoue toute la journée
J'ai automatisé le scénario complet de validation dans `scripts/test-e2e.ps1` :
- Démarrage de la stack complète uniquement depuis `docker-compose.prod.yml` et le `.env` : tous les conteneurs montent sans accroc.
- Test d'enregistrement de score et validation des entrées invalides : un pseudo vide ou un score aberrant (>500) est bien bloqué en HTTP 400.
- L'isolation du port PostgreSQL 5432 depuis l'hôte est confirmée.
- Les stats renvoyées par `/stats` correspondent exactement aux entrées réelles en base.
- Coupure brutale de PostgreSQL (`stop db`) en plein test : l'API et le service de stats répondent en HTTP 503 propre sans crasher. Dès la relance de la base, tous les services se reconnectent automatiquement.

### Exercice III : CI/CD et Déploiement GitHub Pages
- **GitHub Pages** : Déploiement des fichiers statiques du front (`index.html`, `style.css`, `script.js`) sur `https://adrien14235.github.io/docker/`.
- **Pipeline CI/CD** : Configuration du workflow GitHub Actions dans `.github/workflows/ci.cd.yml` pour builder les images Docker à chaque push.

### Exercice IV : Tests automatisés avec Jest & jsdom
- **Tests unitaires en local** : Installation de Jest et de l'environnement `jsdom`.
- **Validation du Getting Started** : `sum.js` et `sum.test.js`.
- **Tests fonctionnels du jeu dans `script.test.js`** :
  - Incrémentation du score lors des clics.
  - Décompte effectif du timer de 5s.
  - Blocage des clics après expiration du chrono.
  - Réinitialisation complète du jeu et remise à zéro du score.
- **Intégration CI** : Exécution automatique de `npm test` dans le workflow GitHub Actions avant l'étape de build des images Docker.

---

## Paliers & Phases - Automatisation CI/CD (Jour 2)

### Palier 1 : Reprendre la main sur la pipeline

#### Phase 1 : Écrire ses propres stages, lint puis test
- **Linting avec ESLint** : Ajout d'ESLint en devDependencies, création du fichier de configuration moderne `eslint.config.js` et ajout du script `"lint": "eslint ."` dans `package.json`.
- **Ordonnancement Fail-Fast** : Refonte de `.github/workflows/ci.cd.yml` avec deux jobs distincts (`lint` puis `test`). Le job `test` dépend explicitement du succès de `lint` via `needs: lint`. Si une erreur de lint survient, les tests ne sont pas exécutés inutilement.
- **Déclencheurs** : Pipeline configurée pour se déclencher sur chaque `push` et chaque `pull_request`.
- **Validation locale** : `npm run lint` et `npm test` s'exécutent avec succès.

#### Phase 2 : Publier une image taguée au SHA du commit
- **Job de publication `build-and-push`** : Ajout du job dépendant de `test` (`needs: test`), exécuté uniquement sur la branche `main` (`if: github.ref == 'refs/heads/main'`) pour ne jamais publier de code en chantier issu d'une pull request.
- **Authentification sécurisée** : Connexion à Docker Hub via l'action officielle `docker/login-action@v3` avec les identifiants stockés dans les secrets GitHub (`DOCKERHUB_USER` et `DOCKERHUB_TOKEN`).
- **Artefact immuable et traçable** : Build et push via `docker/build-push-action@v6` avec le tag `${{ github.sha }}`. Chaque commit sur `main` produit un artefact unique, immuable et directement traçable jusqu'au code source.

#### Phase 3 : Mesurer avant d'optimiser
- **Optimisation du cache npm** : Configuration de `cache: 'npm'` sur `actions/setup-node@v4` pour réutiliser le cache des dépendances entre les runs et réduire drastiquement le temps d'exécution de `npm ci`.
- **Tableau de bord de suivi** : Mise en place du tableau de métriques récapitulatif permettant de mesurer l'impact réel des optimisations sur la durée des runs et la taille des artefacts.

### Palier 2 : La sécurité entre dans la pipeline

#### Phase 4 : Brancher npm audit et gitleaks
- **Analyse des dépendances (SCA)** : Intégration de `npm audit --audit-level=high` dans un job dédié `security-deps` s'exécutant en parallèle de `lint` et `test`. Il bloque la pipeline uniquement en cas de vulnérabilités critiques ou élevées (`high`, `critical`).
- **Détection des secrets (Secret Scanning)** : Intégration de `gitleaks/gitleaks-action@v2` avec `fetch-depth: 0` pour scanner l'intégralité de l'historique Git du dépôt et empêcher toute fuite de clé/mot de passe.
- **Fail Fast & Sécurité** : Le job `build-and-push` attend désormais la réussite conjointe des tests et du scan de sécurité (`needs: [test, security-deps]`).

#### Phase 5 : Scanner l'image avec Trivy
- **Container Scanning** : Ajout du job `security-image` s'exécutant après la publication de l'image (`needs: build-and-push`) sur la branche `main`.
- **Scan de vulnérabilités système** : Utilisation de `aquasecurity/trivy-action` pour analyser l'image publiée `${{ secrets.DOCKERHUB_USER }}/clickfast:${{ github.sha }}` et détecter d'éventuelles failles au niveau de l'OS / Nginx (Alpine).
- **Seuil de blocage** : Configuration stricte sur `severity: 'HIGH,CRITICAL'` avec `exit-code: '1'` pour interrompre la pipeline si une faille critique non corrigée est détectée.

#### Phase 6 : Générer un SBOM avec Syft
- **Software Bill of Materials (SBOM)** : Ajout du job `sbom` dépendant de `build-and-push` (`needs: build-and-push`) pour recenser de façon exhaustive tous les composants et packages embarqués dans l'image livrée.
- **Génération CycloneDX** : Utilisation de `anchore/sbom-action@v0` pour produire l'inventaire au format standardisé `CycloneDX JSON` (`sbom-cyclonedx.json`).
- **Téléchargement d'artefact** : Export et archivage du fichier SBOM via `actions/upload-artifact@v4`, accessible directement depuis l'onglet Actions de GitHub.

#### Phase 7 : Centraliser l'état de sécurité dans un résumé
- **Rapport agrégé `$GITHUB_STEP_SUMMARY`** : Ajout du job final `security-summary` dépendant de l'ensemble des contrôles de sécurité (`needs: [security-deps, security-image, sbom]`) avec la condition `if: always()`.
- **Visibilité immédiate** : Génération d'un rapport Markdown synthétique directement visible dans l'onglet Actions, résumant l'état des 4 scanners (npm audit, Gitleaks, Trivy, Syft) sans avoir à ouvrir les logs.
- **Résilience** : Affiche correctement les états même en cas de job ignoré (PR) ou échoué.

### Palier 3 : Le geste qui compte, et savoir l'arrêter

#### Phase 8 : Faire valider la publication par un humain
- **Protection par GitHub Environments** : Création de l'environnement `production` avec un reviewer requis dans les paramètres du dépôt.
- **Association au job de publication** : Rattachement du job `build-and-push` à `environment: production`.
- **Bascule en Continuous Delivery** : Le workflow bloque automatiquement avant la publication sur Docker Hub et attend une approbation manuelle ("Review deployments" -> "Approve and deploy") pour exécuter le push.

#### Phase 9 : Séparer vérification et publication
- **Découplage des workflows** : Remplacement du workflow unique par deux fichiers distincts dans `.github/workflows/` :
  - `verify.yml` : déclenché sur chaque Pull Request (`on: pull_request`) pour lancer lint, tests unitaires et scans de sécurité (SCA, Secrets). Aucune publication d'image n'est effectuée sur du code en chantier.
  - `release.yml` : déclenché uniquement lors d'un `push` sur la branche `main` (`on: push: branches: [main]`) pour exécuter la suite complète jusqu'au build, push de l'image (protégé par l'environnement `production`), scan Trivy et génération du SBOM.

#### Phase 10 : Casser main, et savoir s'en remettre
- **Simulation d'incident** : Altération volontaire d'une assertion de test Jest sur une branche dédiée pour provoquer un échec.
- **Détection pré-fusion** : Le workflow `verify.yml` a échoué sur la Pull Request, démontrant l'efficacité du filet de sécurité en amont.
- **Impact sur main** : La fusion a provoqué l'arrêt immédiat de `release.yml` sur le job `test`, bloquant la publication Docker Hub et préservant l'intégrité de la production.
- **Sécurisation de la branche main** : Mise en place d'une règle de protection de branche (*Branch protection rule*) imposant le passage au vert du check `verify.yml` avant toute fusion future.
- **Rétablissement** : Correction du test, validation de la pipeline et retour au vert de l'ensemble de la chaîne CI/CD.

### Tableau de bord de suivi de la pipeline

| Phase / Étape | Durée totale du run | Durée du job `test` | Taille de l'image publiée | Vulnérabilités (High/Crit) | Composants SBOM |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Phase 2 (Référence - Sans cache)** | 52s | 34s | 21 Mo (Docker Hub) | - | - |
| **Phase 3 (Avec cache `npm`)** | 36s | 19s | 21 Mo (Docker Hub) | - | - |
| **Phase 4 (SCA & Gitleaks)** | 42s | 19s | 21 Mo (Docker Hub) | 0 vulnérabilité | - |
| **Phase 5 (Scan Image Trivy)** | 58s | 19s | 21 Mo (Docker Hub) | 0 vulnérabilité (0 HIGH / 0 CRIT) | - |
| **Phase 6 (Génération SBOM)** | 1m 08s | 19s | 21 Mo (Docker Hub) | 0 vulnérabilité | 38 composants inventoriés |
| **Phase 7 (Step Summary)** | 1m 12s | 19s | 21 Mo (Docker Hub) | 0 vulnérabilité | Rapport global généré |
| **Phase 10 (Rétablissement / MTTR)** | 38s | 19s | 21 Mo (Docker Hub) | 0 vulnérabilité | **MTTR : ~4 min** |
| **Gain global mesuré** | **Pipeline optimisée & sécurisée** | **-15s (-44.1%)** | Stable (0 Mo) | Conforme (0 alerte) | CI/CD complète & protégée |







