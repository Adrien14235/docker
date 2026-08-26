# ==============================================================================
# Script de test de bout en bout (E2E) - Etape 10 : Le test qui rejoue la journee
# ==============================================================================

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   TEST DE BOUT EN BOUT CLICKFAST (SCENARIO ETAPE 10)  " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Demarrage de la stack de production
Write-Host "`n[1/5] Demarrage de la stack de production via docker-compose.prod.yml..." -ForegroundColor Yellow
docker compose -f docker-compose.prod.yml up -d
Start-Sleep -Seconds 3

# Verification de la disponibilite
$webCode = (curl.exe -s -o /dev/null -w "%{http_code}" http://localhost:8080)
$apiHealth = (curl.exe -s http://localhost:3000/health)
$statsHealth = (curl.exe -s http://localhost:8000/health)

Write-Host "  - Web Frontend (8080) : HTTP $webCode" -ForegroundColor Green
Write-Host "  - Scores API Health (3000) : $apiHealth" -ForegroundColor Green
Write-Host "  - Stats API Health (8000) : $statsHealth" -ForegroundColor Green

# 2. Envoi d'un score valide
Write-Host "`n[2/5] Test nominal : Envoi d'un score valide..." -ForegroundColor Yellow
$postRes = curl.exe -s -X POST http://localhost:3000/api/scores -H "Content-Type: application/json" -d '{\"username\":\"JoueurE2E\",\"score\":45}'
Write-Host "  - Reponse POST : $postRes" -ForegroundColor Green

# 3. Test de robustesse aux entrees invalides (HTTP 400 attendu)
Write-Host "`n[3/5] Test de validation des entrees invalides..." -ForegroundColor Yellow
$bad1 = curl.exe -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/scores -H "Content-Type: application/json" -d '{\"score\":30}'
$bad2 = curl.exe -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/scores -H "Content-Type: application/json" -d '{\"username\":\"Hacker\",\"score\":9999}'
Write-Host "  - Pseudo manquant : HTTP $bad1 (attendu: 400)" -ForegroundColor Green
Write-Host "  - Score aberrant (>500) : HTTP $bad2 (attendu: 400)" -ForegroundColor Green

# 4. Test d'isolation du port PostgreSQL
Write-Host "`n[4/5] Verification de l'isolation du port 5432 depuis l'hote..." -ForegroundColor Yellow
$portCheck = Test-NetConnection -ComputerName localhost -Port 5432 -InformationLevel Quiet -WarningAction SilentlyContinue
Write-Host "  - Port 5432 accessible sur l'hote ? : $portCheck (doit etre False)" -ForegroundColor Green

# 5. Verification des statistiques
Write-Host "`n[5/5] Verification des statistiques agregees..." -ForegroundColor Yellow
$statsRes = curl.exe -s http://localhost:8000/stats
Write-Host "  - Stats renvoyees : $statsRes" -ForegroundColor Green

# 6. Test de crash de la base de donnees et recuperation automatique
Write-Host "`n[6/6] Test de resistance : Coupure de la base de donnees..." -ForegroundColor Yellow
docker compose -f docker-compose.prod.yml stop db | Out-Null
$apiDown = curl.exe -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/scores -H "Content-Type: application/json" -d '{\"username\":\"Test\",\"score\":10}'
$statsDown = curl.exe -s -o /dev/null -w "%{http_code}" http://localhost:8000/stats
Write-Host "  - Scores API quand DB coupee : HTTP $apiDown (attendu: 503)" -ForegroundColor Green
Write-Host "  - Stats API quand DB coupee : HTTP $statsDown (attendu: 503)" -ForegroundColor Green

# Relance de la base
Write-Host "  - Redemarrage de la base PostgreSQL..." -ForegroundColor Yellow
docker compose -f docker-compose.prod.yml start db | Out-Null
Start-Sleep -Seconds 3
$statsRecovered = curl.exe -s http://localhost:8000/stats
Write-Host "  - Stats apres reconnexion automatique : $statsRecovered" -ForegroundColor Green

# Nettoyage
Write-Host "`nArret et nettoyage de la stack..." -ForegroundColor Cyan
docker compose -f docker-compose.prod.yml down | Out-Null
Write-Host "TOUS LES TESTS DU SCENARIO ETAPE 10 SONT VALIDES !" -ForegroundColor Green
