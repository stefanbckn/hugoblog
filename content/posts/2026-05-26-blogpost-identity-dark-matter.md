---
date: 2026-05-26T09:30:14
title: "Identity Dark Matter"
slug: identitydarkmatter
categories:
  - tech
tags:
  - IAM
toc: true
---
## Een nieuw buzzword - Identity Dark Matter

Orchid Security publiceerde vorige week hun [*Identity Gap: 2026 Snapshot*](https://www.orchid.security/reports/the-identity-gap-2026-snapshot-identity-insight-straight-from-the-source). Het rapport geeft een volledig overzicht over de status van Identity Security. Het belicht de meest voorkomende en hardnekkigste _control gaps_, _account exposure_, _risk behaviors_ en meer.

> The Invisible Elements of Identity Now Overshadow The Visible Ones

**Een paar belangrijke cijfers**

57% van de enterprise-applicaties gebruiken geen centrale, beveiligde _identity provider (IdP)_. De meerderheid van deze applicaties regelen hun toegang buiten het zicht van een _IAM stack_. Twee derde van de _non-human identities_ authentificeren en autoriseren zich locaal, binnen de applicatie, zonder directory, IdP, of centraal overzicht.
40% van alle accounts zijn _orphan accounts_ en hebben geen owner binnen het bedrijf. En als laatste cijfer; Eén op drie enterprise-applicaties slaan _credentials_ op in _plain text_.

Deze gaps bestaan uiteraard al langer en het rapport geeft dit ook weer. Het vooruitzicht van de groei van AI agents tegen eind 2026 maakt dit pas echt een probleem. De blinde vlek binnen je _IAM stack_ is net diegene dat de _efficiency-driven agents_ gaan gebruiken zodat de snelste route gekozen kan worden.

Ondanks de snelheid van de _agentic adoption_ hebben minder dan 1 in vijf bedrijven een volwassen governance model in plaats voor _AI agents_.

## Identity Dark Matter

_Identity dark matter_. Het klinkt als het nieuwste buzzword, al is de achterliggende gedachte heel concreet.

Je IAM-platform, je IdP, je IGA-tool, je PAM-oplossing; je _IAM stack_ gaat ervan uit dat alle nieuwe identiteiten door een governance workflow worden aangemaakt. Je komt in dienst, je account wordt aangemaakt, je lifecycle binnen het bedrijf gaat van start. Dit proces is bij de meeste bedrijven ondertussen goed ingericht.
Waar het begint te wringen is bij service accounts en die accounts mag je in de breedste vorm van het woord zien. Traditionele Windows service accounts maar ook API keys, oAuth clients, certificates, machine identities, bots, CI/CD identities. Een betere term is dan ook _Non-human Identities_.

Hier bestaat in de meeste bedrijven geen governance model voor. Er is geen structuur. Geen eigenaar, geen lifecycle, geen review of recertifications,... 

Orchid's data toont dat 67% van alle _Non-human identities_ op die manier wordt aangemaakt, volledig buiten je _IAM stack_ om. Zoals eerder aangegeven beheren 57% van de enterprise-applicaties hun eigen authenticatie, zonder centrale IdP. Op zich hoeft dit geen probleem te zijn zolang de identiteiten wel centraal beheerd worden in een IGA-tool en de nodige _security controls_ voor handen zijn tijdens authenticatie. Denk aan MFA of Passwordless authentication.

Is dit niet het geval en worden identiteiten aangemaakt buiten het zicht en de controle van je _IAM stack_ dan spreken we van _Identity Dark Matter_.
## Hoe zijn we hier beland?

Een IAM-project wordt te vaak als een technisch project aangevat. Hierdoor vergeet men alle processen te bekijken die onder de IAM-invloedsfeer vallen. De eerste stap die genomen wordt is het JML-proces (Joiner, Mover, Leaver) van _human identities_ en daar stopt het vaak.

De focus ligt op _human identities_. Een nieuwe medewerker heeft een account en toegangen nodig. Een huidige medewerker heeft een nieuwe rol en dus nieuwe toegangen nodig. Een medewerker verlaat het bedrijf dus de toegangen moeten weggenomen worden. Wat er met de _non-human identities_ gebeurt, wordt niet bekeken.

Hierdoor komen de volgende twee bevindingen dan ook tot stand. Zoals het rapport aangeeft zijn 40% van de accounts actief nadat de eigenaar of het bijhorende proces weg is. Bij deze orphaned accounts komt ook nog dat 30% van alle applicaties in productie credentials hard-coded én in _plain text_ in de code of configuratie bewaren.

> 40% of all accounts were found to be orphaned.

Voeg hier ook nog de _privilege creep_ bij, waarbij in meer dan 70% van de geanalyseerde applicaties het aantal geprivilegieerde accounts groter is dan operationeel nodig, dan krijg je een gevaarlijke cocktail. Toegang wordt zelden ingetrokken. _Least privilege_ is meestal wel van toepassing maar zelden een operationele realiteit.
## Waarom AI-agents dit gevaarlijk maken

_Identity Dark Matter_ is als term misschien nieuw maar de problemen die het verduidelijkt zijn dat zeker niet. Die bestonden al langer, buiten het zicht van je _IAM stack_. Deze problemen werden toegestaan door _policy exceptions_, het bestaan van legacy applicaties en er werd uiteindelijk, vaak stilzwijgend, geaccepteerd dat de centrale _IAM stack_ niet alles onder controle had. Wat tot nu toe een behapbaar en beheersbaar iets was wordt door AI-agents een acuut probleem.

Een AI-agent is ontworpen om taken te voltooien. Als hij de juiste toegang niet heeft, zoekt hij naar wat er wel beschikbaar is. Hardcoded credentials in een config-file? Die werken. Een orphaned service account met brede rechten die al vijf jaar niemand heeft gereviewd? Die werkt ook. Een over-geprivilegieerd integratieaccount dat ooit voor iets anders werd aangemaakt? Prima.

En dit gaat niet traag. AI-agents doen het op machine-snelheid, over meerdere systemen tegelijk, zonder menselijke review.

> The gap between deployment speed and identity readiness is where breaches happen.

Het probleem schaalt nu mee met je AI-adoptie. Elke nieuwe agent die je deployt vergroot je aanvalsoppervlak.
## Waar je realistisch begint

Waar er een nieuw buzzword is om problemen aan te duiden, is er vaak ook één om het probleem aan te pakken: _Identity Visibility and Intelligence Platforms (IVIP)_.
Wie heeft toegang tot wat? Traditionele identity models hebben het moeilijk om hierop te antwoorden. IVIP kan deze antwoorden wel tevoorschijn toveren. Het zorgt voor vertrouwen in een toekomst waar _identity behavior_ dynamischer, gedistribueerder en geautomatiseerder is dan voorheen.

Als we eerst het governance model helemaal op punt willen hebben, dan lopen we achter de feiten aan.

De eerste stap is visibility. Welke non-human identities bestaan er in mijn omgeving? Waar zijn ze aangemaakt? Tot welke systemen hebben ze toegang? Zijn er hard-coded credentials in applicaties die momenteel in productie draaien?

Een gerichte discovery-oefening die een werkelijk beeld geeft van je _Identity Surface_ en niet het ideaalbeeld dat je IAM-dashboard je toont.

Eens je dit volledig beeld hebt, kun je prioriteren: welke accounts zijn het meest risicovol? Welke hebben brede toegang en geen eigenaar? Welke credentials kunnen worden geroteerd?

Governance volgt op visibility. Niet andersom.