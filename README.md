# Antenna Beamwidth Tool

Application en ligne :

https://ed94120.github.io/antenna-beamwidth-tool/

## Objet

Antenna Beamwidth Tool est un petit utilitaire web qui affiche, pour une antenne sélectionnée dans une liste déroulante :

- les angles d'ouverture à 3 dB en azimut ;
- les angles d'ouverture à 3 dB en élévation ;
- les valeurs par bande de fréquence ;
- les dimensions du radôme lorsque ces informations sont disponibles.

L'outil est volontairement compact. Il ne calcule pas les diagrammes complets d'atténuation. Il affiche uniquement les caractéristiques synthétiques extraites du fichier de spécifications.

## Source des données

Le fichier de données utilisé par l'application est :

https://ed94120.github.io/antenna-pattern-tool/data/antenna-specs.txt

Ce fichier appartient au dépôt :

https://github.com/ED94120/antenna-pattern-tool

Le dépôt `antenna-beamwidth-tool` ne contient donc pas de copie locale du fichier `antenna-specs.txt`.  
L'application lit directement le fichier distant afin d'éviter les doublons et les divergences entre plusieurs versions du même fichier.

## Principe de fonctionnement

Au chargement de la page, l'application :

1. lit le fichier distant `antenna-specs.txt` ;
2. découpe le fichier en fiches d'antennes à partir des balises `[ANTENNA]` ;
3. extrait les lignes structurées utiles ;
4. remplit la liste déroulante avec les noms des antennes ;
5. affiche les ouvertures à 3 dB et les dimensions du radôme pour l'antenne sélectionnée.

## Format attendu du fichier antenna-specs.txt

Chaque antenne doit être décrite dans un bloc commençant par :

```txt
[ANTENNA] Nom_Antenne
