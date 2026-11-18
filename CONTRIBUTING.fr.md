# Contribuer à Afro.tools

🇫🇷 Français · 🇬🇧 [English](./CONTRIBUTING.md)

Merci d'aider à étendre la couverture AI-ready des API africaines.

---

## Ce que vous pouvez contribuer

- **Nouvelle spec** — un `provider.json` + `schema.json` + `canonical_example.ts` pour un fournisseur/une capacité pas encore dans le registre. Pas le temps de l'écrire vous-même ? Partagez la documentation du fournisseur — un lien ou un fichier — sur [afro.tools/fr/contribute](https://afro.tools/fr/contribute) à la place ; un mainteneur écrit la spec pour vous
- **Correction** — corriger un champ, améliorer les pièges (gotchas), ou corriger une erreur de compilation
- **Documentation** — améliorer ATSS.md/ATSS.fr.md, le README ou ce fichier
- **Rapport d'intégration** — vous avez intégré un fournisseur à partir de sa spec : dites-nous si ça correspondait à l'API (ci-dessous)

---

## Signaler une intégration

Les mainteneurs ne peuvent pas tester chaque fournisseur en production. Si vous en avez intégré un à partir de sa spec —
en sandbox ou en production — [ouvrez un rapport d'intégration](https://github.com/afrotools/afrotools/issues/new?template=integration-report.yml), que ça ait marché ou pas.
Un rapport couvre le flux complet d'un fournisseur (ex. initialisation du paiement, vérification du statut, webhook) : listez
chaque capacité utilisée avec son propre résultat.
Avec le MCP Afro.tools, demandez à votre agent : il appelle `report_integration` et vous donne un lien
pré-rempli ; vous choisissez l'environnement et le résultat, vérifiez qu'aucun secret ne s'y trouve et vous l'envoyez.
L'agent n'envoie jamais rien lui-même.

- **Ça a marché** — un mainteneur vérifie le rapport et l'enregistre comme preuve pour chaque capacité
  qui a fonctionné : `status: "verified"` avec `verification.method: "community_report"` et un lien vers
  votre issue (ATSS.fr.md § verified). Vous êtes crédité en tant que contributeur.
- **Une spec est fausse** — le rapport devient une correction : le champ, le code de statut ou le piège est corrigé
  à partir de votre retour et de la documentation du fournisseur.

---

## Prérequis

- Node.js 20+
- Python 3.9+ (pour la vérification live de l'API) — `pip install jsonschema` (`test:live` s'en sert
  pour vérifier les réponses), plus `pip install certifi` si vous rencontrez une erreur de certificat TLS (fréquent sur les builds macOS
  de python.org)
- `npm install` à la racine du repo

---

## Ajouter une spec

Vous pouvez ajouter une spec à la main (étapes ci-dessous) ou utiliser le skill `/afrotools:new` pour automatiser
le processus. Le skill lit la documentation de l'API du fournisseur et génère `provider.json`,
`schema.json` et `canonical_example.ts` pour chaque capacité trouvée, puis lance la validation.

Avant d'invoquer le skill, mettez-le toujours à jour vers la dernière version :

```bash
claude plugin update afrotools
```

Puis indiquez-lui l'URL de la documentation du fournisseur — la catégorie et le slug du fournisseur sont
déduits automatiquement, il n'est pas nécessaire de les préciser :

```
/afrotools:new https://docs.example.com/api
```

Si la documentation du fournisseur nécessite de se connecter ou n'est pas accessible publiquement, donnez-lui
un fichier local à la place :

```
/afrotools:new ./my-provider-docs.html
```

Le fichier local peut être n'importe quel format de documentation que le fournisseur vous a donné — un fichier
OpenAPI/Swagger JSON ou YAML, un PDF, une page HTML exportée ou une collection Postman. Enregistrez-le
localement et donnez-le directement au skill.

Que vous utilisiez le skill ou que vous travailliez à la main, l'étape de vérification live de l'API (§ 7 ci-dessous)
s'applique dans les deux cas.

### 1. Créer une branche

```bash
git pull origin main

# Nouveau fournisseur (toutes les capacités dans une seule PR) :
git checkout -b spec/{provider_slug}

# Ajout de capacités à un fournisseur existant :
git checkout -b spec/{provider_slug}-{short-description}
# ex. spec/wave-payouts, spec/nimbasms-contacts
```

### 2. Créer la structure de dossiers

```
specs/{category}/{provider_slug}/
├── provider.json                ← créé une seule fois par fournisseur
└── {capability}/
    ├── schema.json
    └── canonical_example.ts
```

- `category` : `payment`, `communications` (SMS, WhatsApp, USSD, voix, email), `identity` (KYC, vérification de document, AML) ou `logistics` (livraison, coursiers, suivi de colis)
- `provider_slug` : minuscules. Les fournisseurs à un seul mot n'utilisent pas de séparateur (ex. `wave`, `nimbasms`). Les variantes composées ou géographiques peuvent utiliser des tirets (ex. `orangemoney-mali`).
- `capability` : verbe en snake_case (ex. `create_payment`, `send_message`)

### 3. Ajouter `provider.json`

Créez `specs/{category}/{provider_slug}/provider.json` s'il n'existe pas déjà :

```json
{
  "slug": "wave",
  "name": "Wave",
  "category": "payment",
  "country_code": ["SN", "CI", "ML"],
  "website": "https://www.wave.com",
  "docs_url": "https://docs.wave.com/business",
  "docs_public": true,
  "sandbox": false,
  "description": "One factual sentence describing the provider.",
  "example_prompt": "Full integration scenario for AI agents."
}
```

Les 10 champs sont obligatoires. Les fournisseurs de la catégorie `communications` doivent aussi avoir
`channels` — un tableau non vide des canaux documentés par le fournisseur, parmi
`sms`, `whatsapp`, `ussd`, `voice`, `email` (ex. `"channels": ["sms", "whatsapp"]`).
Si le fournisseur a déjà un `provider.json`, ne l'écrasez pas.

### 4. Ajouter `schema.json`

Utilisez `schema.template.json` comme point de départ. Voir [ATSS.fr.md](./ATSS.fr.md) pour les règles relatives aux champs (aussi disponible en anglais : [ATSS.md](./ATSS.md)).

> **Ne pas inclure** `provider_slug`, `provider_name`, `category`, `country_code`, `sandbox`,
> `docs_url` ou `docs_public` dans `schema.json` — ces champs ont été déplacés vers `provider.json`.

### 5. Ajouter `canonical_example.ts`

- TypeScript strict — doit compiler avec `tsc --noEmit`
- Fetch natif uniquement — aucun import npm
- Tous les identifiants via `process.env`, vérifiés en haut avec un `throw` explicite
- Interfaces TypeScript explicites pour les types d'entrée, de réponse et d'erreur
- Exporter la fonction principale
- Inclure un bloc de commentaire d'usage en bas

### 6. Valider

```bash
npm run validate:changed   # plus rapide pendant le développement — ne valide que les specs modifiées
npm run validate           # vérification complète du registre — à lancer avant d'ouvrir une PR
```

Doit passer sans aucune erreur.

### 7. Vérifier les schémas de réponse par rapport à l'API live (fortement recommandé)

La validation statique vérifie la structure et la compilation, mais elle ne peut pas détecter des noms de champ
incorrects, des types erronés, ou des écarts spécifiques au sandbox dans `response_schema`. La vérification live
détecte les vrais écarts avant qu'ils n'induisent un agent IA en erreur.

**Comment ça marche :**

Créez un fichier `live_test_fixtures.json` dans le dossier du fournisseur
(`specs/{category}/{provider_slug}/live_test_fixtures.json`) qui décrit les étapes de test et leurs
payloads. Le script générique `scripts/test_live.py` lit ce fichier, s'authentifie
avec la config `auth` de chaque `schema.json`, appelle la vraie API, et vérifie chaque réponse par rapport à
la spec : le statut HTTP, tout le `response_schema` (types, champs imbriqués, la branche `oneOf` à laquelle la
réponse correspond) et `success_condition` quand la spec en a un.

Vous n'avez pas besoin d'écrire ce fichier à la main — demandez à un agent IA de le générer. Partagez les
fichiers `schema.json` et la liste des dossiers de capacité, puis relisez le résultat et commitez-le.

Format de la fixture :

```json
{
  "steps": [
    {
      "capability": "list_customers",
      "query_params": { "page": 1, "size": 10 }
    },
    {
      "capability": "create_customer",
      "body": { "email": "test@afrotools.dev", "name": { "first": "Test", "last": "User" } },
      "store_as": "customer"
    },
    {
      "capability": "create_charge",
      "body": {
        "customer_id": "$customer.data.id",
        "amount": 1,
        "currency": "GHS"
      }
    }
  ]
}
```

Champs clés de la fixture :
- `sandbox_base_url` — remplace l'hôte de production par l'hôte sandbox pour toutes les requêtes. Pas
  nécessaire quand `provider.json` déclare `environments.sandbox` (ATSS 1.1), que `test:live` lit
  en premier — de même qu'il lit la requête de token dans `auth.token_exchange` de la spec
- `store_as` — stocke la réponse complète sous un nom pour que les étapes suivantes puissent s'y référer
- `$store_as_value.field.nested` — référence une valeur de la réponse stockée d'une étape précédente
- `auth_secondary_env` — une deuxième variable d'environnement nécessaire au run : la partie mot de passe
  d'une authentification `basic`, ou un deuxième identifiant (ex. un ID partenaire) que les étapes envoient via `$env:NAME` dans leurs `headers`
- `$env:NAME` — référence une variable d'environnement (typiquement dans les `headers` d'une étape)
- `content_type` (par étape) — `application/json` (défaut), `application/x-www-form-urlencoded`, ou
  `multipart/form-data` (les objets/tableaux imbriqués sont envoyés comme chaînes JSON ; l'upload de fichier n'est pas pris en charge)
- `skip_auth` (par étape) — ne pas envoyer l'auth dérivée du schéma sur cette étape : utile pour un
  appel d'échange de token qui porte ses propres identifiants dans `headers`, ou un endpoint non authentifié
- `wait_seconds` (par étape) — pause avant l'étape, ex. pour qu'un job asynchrone créé par une étape
  précédente soit visible avant que son statut ne soit lu
- `expected_status` (par étape) — codes de statut HTTP qui comptent comme un succès (défaut : tout 2xx). Une étape
  échoue quand l'appel ne réussit pas, sauf si son erreur est listée dans `acceptable_error_codes`. Un
  statut attendu non-2xx (un test négatif) vérifie seulement le statut : `response_schema` décrit un succès
- `acceptable_error_codes` (par étape) — préfixes du `details` de la réponse qui constituent une
  erreur sandbox attendue, pas un échec

Un run échoue (exit 1) quand une étape reçoit un statut HTTP inattendu, reçoit une réponse qui casse
`response_schema` ou `success_condition`, ou est sautée : schéma manquant, un `$name.field` d'une
étape précédente qui n'a rien retourné (dans `path_params`, `query_params`, `body` ou `headers`), un
path param vide, ou un placeholder d'`endpoint.url` qu'aucun `path_params` ne remplit. Ailleurs, un `$env:NAME`
non défini est envoyé comme une chaîne vide.

**Le lancer :**

```bash
export PROVIDER_CREDENTIALS="..."   # la variable d'environnement déclarée dans auth.env_var —
                                    # ou chacune de auth.credentials (ATSS 1.1)
npm run test:live -- --provider {slug} --report live-report.json
```

Sortie :
- ✅ L'appel a réussi et la réponse correspond à la spec
- ❌ Là où la réponse casse `response_schema` (chemin et raison) ou `success_condition` → corrigez la
  spec ou la fixture
- ⚠️  Champ présent dans la réponse, absent de la spec → mérite d'être ajouté à `response_schema`, pas
  bloquant

`--report` écrit un rapport JSON : par étape, le statut HTTP, le résultat, les erreurs et le
`spec_hash` testé, avec la date et le commit du registre. Le `spec_hash` d'une étape `pass`
est la valeur que son bloc `verification` enregistre ; une étape `expected_error` ne prouve rien sur la
réponse. Le rapport ne contient jamais de valeur de réponse. Attachez-le à votre PR, ou liez le run GitHub Actions, qui le garde comme artefact.

**Astuces :**
- Le script ne cible jamais que le sandbox. Si le fournisseur n'a pas de sandbox
  (`"sandbox": false` dans `provider.json`), il **refuse de s'exécuter** — il n'y a pas de dérogation.
  Vérifiez un fournisseur sans sandbox via une intégration fonctionnelle dans `afrotools/examples` à la place.
- Commitez `live_test_fixtures.json` avec `provider.json` — il ne contient aucun identifiant,
  seulement des schémas de test et une logique de séquencement. Les autres contributeurs en profitent.
- Vous pouvez aussi déclencher ça depuis GitHub Actions (workflow `Live test`, déclenchement manuel) si
  vous préférez ne pas le lancer localement. Ça ne fonctionne que pour un fournisseur qui a déjà un
  GitHub Environment configuré avec ses identifiants — c'est une opération de configuration du repo, qu'un
  mainteneur fait une seule fois par fournisseur (voir l'en-tête de commentaire dans `.github/workflows/live-test.yml` pour les étapes
  exactes). Si votre fournisseur n'en a pas encore, demandez à un mainteneur de l'ajouter, ou lancez simplement
  `test:live` en local — vous n'avez pas besoin d'attendre.

Si vous sautez la vérification live, ajoutez ce piège à chaque spec dont la réponse n'a pas été vérifiée :

```
"response_schema not verified against live API — validate field names and types before shipping."
```

### 8. Définir le statut

Mettez `"status": "draft"` pendant que vous travaillez, `"ready"` une fois que la validation est passée et que vous êtes
satisfait de la spec. Ne mettez jamais `"verified"` — c'est réservé aux mainteneurs.

**Comment une spec `ready` devient `verified` (ce n'est pas automatique — quelqu'un doit agir) :**

- **Le fournisseur a un sandbox** (`provider.json.sandbox: true`) — écrivez `live_test_fixtures.json`
  (§ 7) et assurez-vous que `npm run test:live -- --provider {slug}` passe. Liez le run réussi
  (sortie locale ou URL du run GitHub Actions) dans la description de votre PR. Un mainteneur relit
  et bascule le statut.
- **Le fournisseur n'a pas de sandbox** — la vérification nécessite une intégration fonctionnelle dans
  `afrotools/examples`. Si vous ne pouvez pas en construire une vous-même, dites-le dans la PR ; ça reste `ready`
  (visible dans le MCP, avec un avertissement explicite "pas encore vérifié" pour les agents) jusqu'à ce que quelqu'un le fasse.

- **Quelqu'un l'a intégré** — un [rapport d'intégration](#signaler-une-intégration) accepté suffit,
  en sandbox ou en production.

Le mainteneur enregistre la preuve dans le bloc `verification` de la spec (méthode, environnement, date,
lien, `spec_hash` — voir ATSS.fr.md § Blocs ajoutés dans l'ATSS 1.1). `npm run validate` rejette une
spec `verified` sans ce bloc ; il rejette aussi une spec déjà vérifiée mais modifiée depuis, et cela jusqu'à
ce qu'elle soit revérifiée.

Si votre PR ajoute une spec et qu'aucun de ces chemins ne s'applique encore, ce n'est pas un problème — `ready` est un état
réel et utile. Ne bloquez pas le merge d'une spec pour la faire passer en `verified`.

### 9. Ouvrir une PR

Remplissez le template de PR. Le workflow CI relancera la validation.

### 10. Après le merge

Mettez à jour `CHANGELOG.md` sous `## [Unreleased]`.

---

## Contribuer au plugin

`plugin/skills/` contient deux types de skill : les auto-activés qui se déclenchent selon le contexte
(`studio`, `payment`, `communications`, `identity`, `logistics`, `language`, `debug`) et
les commandes manuelles uniquement (`spec`, `list`, `new`, `check`, `review`, `diagnose`). Chacun se trouve à
`plugin/skills/{name}/SKILL.md`, avec un dossier `references/` optionnel pour le contenu plus long
que le skill charge à la demande (les cinq phases de Studio, par exemple, sont chacune un fichier sous
`plugin/skills/studio/references/`).

**Copier un fichier tiers dans le `references/vendor/` d'un skill** (comme le fait Studio, depuis
`phuryn/pm-skills`, `addyosmani/agent-skills`, `hookdeck/webhook-skills` et
`anthropics/skills`) : le fichier doit commencer par sa source, sa licence et ce que vous avez changé, et
la licence elle-même va dans `plugin/third_party/`. `scripts/third-party.test.js` vérifie que chaque
fichier copié déclare sa source et sa licence — lancez-le avant d'ouvrir la PR.

**Tester un changement de skill.** Il n'y a pas d'équivalent à `npm run validate` pour les skills : vérifiez votre
changement en lançant la commande concernée (ou, pour `studio`, la phase que vous avez touchée) de bout en bout
dans un projet de test, et dites dans la description de votre PR ce que vous avez testé et ce que vous n'avez pas testé
— la même honnêteté que celle demandée par le statut `verified` des specs. Ne prétendez pas qu'un changement de skill est testé
alors qu'il n'a été que relu.

Si votre changement touche `plugin/skills/`, voir "Mettre à jour les skills du plugin" ci-dessous : le bump de version
qu'elle décrit est obligatoire, vérifié par la CI.

---

## Conventions de commit

Nous utilisons [Conventional Commits](https://www.conventionalcommits.org/) :

| Type | Quand l'utiliser |
|---|---|
| `feat(provider)` | Ajout d'une nouvelle spec |
| `fix(provider)` | Correction d'une spec |
| `docs` | Changements de documentation |
| `plugin(skill)` | Mise à jour d'un skill dans `plugin/skills/` |
| `chore` | Outillage, CI, dépendances |

Exemples :
```
feat(wave): add create_checkout_session spec
fix(wave): correct webhook auth field
docs: update ATSS gotcha writing guide
plugin(new): add live API verification phase
```

---

## Mettre à jour les skills du plugin

Le plugin Claude Code est distribué via le marketplace. Quand un utilisateur l'installe,
les fichiers de skill sont **figés dans un cache local** à ce commit git. Les mises à jour poussées sur
le repo ne se propagent pas automatiquement — les utilisateurs continuent sur la version en cache jusqu'à
ce qu'ils la rafraîchissent explicitement.

### Si votre PR touche `plugin/skills/`

Une fois votre PR mergée, toute personne utilisant le plugin doit rafraîchir son cache pour obtenir
la nouvelle version du skill :

```bash
claude plugin update afrotools
```

Jusqu'à ce qu'elle le fasse, son agent exécutera l'ancien skill. Documentez ça dans la description de votre PR
pour que les relecteurs sachent qu'il faut se mettre à jour.

### Pour les contributeurs qui travaillent dans ce repo

Si vous récupérez des changements qui incluent des mises à jour de skill (tout commit de type `plugin(skill)`),
lancez la commande de mise à jour avant votre prochaine invocation `/afrotools:*` :

```bash
git pull origin main
claude plugin update afrotools   # rafraîchir le cache pour qu'il corresponde au repo actuel
```

### Bump de version obligatoire

`plugin/.claude-plugin/plugin.json` porte un champ `version`. Le job `check-plugin-version` de la CI
fait échouer toute PR qui touche `plugin/skills/` sans l'incrémenter — incrémentez-le dans le cadre de
votre changement, avant d'ouvrir la PR. Ça permet seulement aux relecteurs et à la CI de savoir qu'un skill a changé ;
ça ne rafraîchit pas l'installation en cache d'un utilisateur — il doit toujours lancer `claude plugin
update afrotools` lui-même, comme décrit plus haut.

`.claude-plugin/marketplace.json` porte son propre `metadata.version`, séparé — la
version du manifeste marketplace, pas celle du plugin. Elle n'est pas vérifiée par la CI et n'a pas
besoin de suivre `plugin.json` ; incrémentez-la à la main quand le listing marketplace lui-même change
(un plugin ajouté ou retiré, sa `description`, ses `keywords` ou sa `category` modifiés dans
`marketplace.json`) — pas à chaque changement de `plugin/skills/`.

---

## Règles

- Chaque dossier de capacité doit contenir exactement `schema.json` + `canonical_example.ts` — rien d'autre
- Chaque dossier de fournisseur doit avoir un `provider.json`
- Ne jamais ajouter `provider_slug`, `category`, `country_code`, `sandbox`, `docs_url` ou `docs_public` dans `schema.json`
- Ne jamais mettre en dur des clés API ou des secrets
- Ne jamais ajouter de `package.json` dans un dossier de spec
- Ne jamais utiliser `require()` ou des imports npm dans `canonical_example.ts`
- Ne jamais pousser directement sur `main` — tous les changements passent par une PR
- Squash merge uniquement

---

## Questions

Ouvrez une issue ou démarrez une discussion dans le repo.
