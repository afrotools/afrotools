# specs/ — CLAUDE.md (ATSS v1.1)

🇫🇷 Français · 🇬🇧 [English](./ATSS.md)

## Qu'est-ce que l'ATSS

L'ATSS (Afro Tools Spec Standard) définit la structure, les champs obligatoires et les règles
de chaque spec de ce registre.

Une spec est une description structurée et lisible par une machine d'une capacité d'API.
Ce n'est pas un wrapper. Ce n'est pas un SDK. C'est une description déclarative.

> **Note de terminologie :** dans ce repo, « spec » désigne une description d'API ATSS
> (`schema.json` + `canonical_example.ts`).
> C'est différent des « skills » de Claude Code (fichiers SKILL.md dans `plugin/skills/`),
> qui sont des fichiers d'instructions pour les agents IA.

---

## Structure de dossiers

```
specs/{category}/{provider_slug}/
├── provider.json              ← provider-level metadata
└── {capability}/
    ├── schema.json            ← capability spec
    └── canonical_example.ts   ← working TypeScript example
```

**category** — `payment`, `communications`, `identity`, `logistics` ou `language` (extensible à d'autres catégories).
`communications` couvre les fournisseurs qui envoient des SMS, WhatsApp, USSD, voix ou email —
les canaux précis vont dans le champ `channels` de `provider.json`, pas dans le nom de la catégorie.
**provider_slug** — minuscules, sans espaces, sans tirets (ex. `paycard`, `wave`, `nimbasms`). Unique, toutes catégories confondues : le registre, le MCP et le site cherchent les fournisseurs par leur seul slug, donc un fournisseur qui propose des produits dans plusieurs catégories utilise un slug par produit. `validate.js` rejette un slug réutilisé dans une autre catégorie.
**capability** — verbe en snake_case (ex. `create_payment`, `verify_payment`, `send_otp`)

Chaque dossier de capacité doit contenir exactement ces deux fichiers. Rien d'autre.

---

## provider.json — champs obligatoires

Un `provider.json` par dossier de fournisseur. Porte les métadonnées du fournisseur, migrées depuis `schema.json`.

```json
{
  "slug": "paycard",
  "name": "Paycard",
  "category": "payment",
  "country_code": ["GN"],
  "description": "Paycard is a Guinean mobile money payment gateway that lets you accept payments via MTN, Orange, and Cellcom mobile wallets.",
  "example_prompt": "Integrate Paycard to accept mobile money payments in Guinea. Create a payment, extract the operation_reference, and verify the transaction server-side before fulfilling the order."
}
```

| Champ | Type | Règle |
|---|---|---|
| slug | string | Minuscules, sans espaces, sans tirets — correspond au nom du dossier |
| name | string | Nom d'affichage du fournisseur |
| category | string | `"payment"`, `"communications"`, `"identity"`, `"logistics"` ou `"language"` — chaque catégorie a un `plugin/skills/{category}/SKILL.md` correspondant |
| channels | string[] | Obligatoire quand `category` vaut `"communications"`, facultatif sinon. Tableau non vide, valeurs parmi `sms`, `whatsapp`, `ussd`, `voice`, `email`. Liste les canaux que la doc publique du fournisseur décrit — pas seulement ceux qui ont déjà une spec |
| country_code | string[] | Codes ISO 3166-1 alpha-2 — tableau non vide |
| description | string | Description du fournisseur en une phrase, pour l'affichage et le contexte MCP |
| example_prompt | string | Prompt d'usage complet pour les agents IA — décrit un scénario d'intégration de bout en bout |

**Account** — facultatif : qui peut ouvrir le compte dont l'API a besoin (compte marchand, entreprise ou développeur —
pas un portefeuille grand public), tel que les pages du fournisseur le disent. Un agent s'en sert pour dire à un utilisateur, avant tout code,
si le fournisseur lui convient — par exemple une vendeuse sans entreprise enregistrée.

```jsonc
"account": {
  "holder": "business_only",             // business_only | business_or_individual, for all the provider's countries — omitted when the pages don't say
  "country_exceptions": { "SN": "business_or_individual" },  // optional: countries whose answer differs from holder
  "documents": ["RCCM"],                 // optional: documents the pages list, as a span quotes them
  "sources": [                           // required with holder, country_exceptions or documents
    { "source_url": "https://provider.example/faq", "spans": ["Pour ouvrir un compte marchand, fournissez votre RCCM."] },
    { "source_url": "https://provider.example/sn", "country_code": ["SN"], "spans": ["Au Sénégal, les particuliers peuvent ouvrir un compte."] }
  ],
  "checked_at": "2026-11-03",            // when the sources were read
  "open_questions": [                    // what the pages don't answer — required without holder or country_exceptions
    "The Senegal page (https://provider.example/sn) does not say which documents an individual needs."
  ]
}
```

| Champ | Règle |
|---|---|
| `holder` | `business_only` — les pages exigent une entreprise enregistrée (société ou immatriculation d'entreprise) ; `business_or_individual` — les pages indiquent qu'une personne sans entreprise enregistrée peut en ouvrir un. Tout le reste est une entrée d'`open_questions`, jamais une supposition |
| `country_exceptions` | Un `country_code` du fournisseur → `business_only` ou `business_or_individual`, pour un pays dont les pages répondent différemment de `holder` — jamais la même valeur que `holder`. Chacun a une source dont le `country_code` le liste. Sans `holder`, c'est la seule réponse que donnent les pages : quand elle couvre moins de pays que le `country_code` du fournisseur, `open_questions` est obligatoire et précise ce qui reste inconnu pour les autres |
| `documents` | Les documents du compte que `holder` désigne, chacun présent dans un span (`validate` le vérifie, sans tenir compte de la casse), dans les mots du fournisseur. Les paliers, les plafonds et le KYC d'un tiers (un agrégateur ou un PSP derrière le fournisseur) vont dans les spans et les questions ouvertes, pas ici |
| `sources` | Les pages propres du fournisseur (doc, FAQ, page d'inscription, conditions) — jamais un blog, un article ou un tiers. `source_url` et `spans` ont le même sens que dans `evidence` : chaque span est copié tel quel depuis la page, dans sa langue d'origine. `country_code`, quand il est présent, liste des pays du `country_code` du fournisseur. Pas de `snapshot_hash` : ce sont des pages commerciales et d'aide qui changent sans préavis — `checked_at` date la lecture à la place. `holder` a besoin d'au moins une source sans `country_code` — une déclaration valable pour tous les pays du fournisseur. Une source qui n'appuie ni l'un ni l'autre est acceptée : elle appuie alors une question ouverte (ex. deux pages qui se contredisent) |
| `open_questions` | Chaînes non vides qui nomment les pages consultées. Un agent doit en informer l'utilisateur avant de recommander le fournisseur |

Pour un utilisateur d'un pays donné, un agent lit `country_exceptions[country]`, sinon `holder`, sinon les questions ouvertes. Les exigences qui diffèrent selon l'étape (inscription ou passage en production, nom d'expéditeur) vont dans les spans et les questions ouvertes.

---

## schema.json — champs obligatoires

```json
{
  "spec_version": "1.0",
  "provider_api_version": "2024-01-01",
  "capability": "create_payment",
  "capability_type": "synchronous",
  "status": "ready",
  "currency": ["GNF"],
  "sandbox": false,
  "docs_url": "https://paycard.com/docs/create-payment",
  "docs_public": false,
  "auth": {
    "type": "api_key",
    "location": "body",
    "field": "c",
    "format": "{token}",
    "env_var": "PAYCARD_API_KEY"
  },
  "endpoint": {
    "method": "POST",
    "url": "https://mapaycard.com/epay/create/"
  },
  "example_prompt": "Initiate a Paycard mobile money payment for a given amount in GNF, extract the operation_reference from the response, and store it immediately before redirecting the user.",
  "input_schema": {},
  "response_schema": {},
  "error_schema": {},
  "gotchas": [
    "Always verify payment status server-side before fulfilling an order."
  ]
}
```

### Règles relatives aux champs

| Champ | Type | Règle |
|---|---|---|
| spec_version | string | `"1.0"`, ou `"1.1"` quand la spec utilise un bloc ajouté en 1.1 (voir § Blocs ajoutés dans l'ATSS 1.1) |
| provider_api_version | string | AAAA-MM-JJ si le fournisseur n'a pas de numéro de version |
| capability | string | snake_case — correspond au nom du dossier |
| capability_type | enum | `synchronous`, `asynchronous`, `webhook` ou `sdk` |
| status | enum | `unverified`, `draft`, `ready`, `verified`, `deprecated`, `archived` |
| currency | string[] | Codes ISO 4217. Obligatoire quand la `category` du fournisseur est `"payment"` (et doit correspondre à son `country_code` — voir `COUNTRY_CURRENCY_MAP` dans `scripts/validate.js` ; un code d'avant redénomination que le fournisseur utilise encore, comme `SLL`, est accepté via `LEGACY_CURRENCY_CODES`) ; facultatif sinon — l'omettre pour identity, communications, etc. |
| sandbox | boolean | true si le fournisseur a un environnement sandbox |
| docs_url | string | Peut valoir `""` — le fournisseur n'a pas d'URL de doc publique |
| docs_public | boolean | false si le fournisseur ne publie pas sa doc d'API publiquement |
| auth | object | Descripteur d'authentification — voir les variantes d'auth ci-dessous |
| endpoint | object | `{ method, url }` |
| example_prompt | string | Obligatoire pour `ready`/`verified` — décrit l'usage de cette capacité précise pour les agents IA |
| input_schema | object | JSON Schema décrivant le corps de la requête. Les paramètres de chemin, de requête et d'en-tête vont dans `parameters` (1.1) |
| response_schema | object | JSON Schema décrivant la réponse de succès |
| error_schema | object | JSON Schema décrivant la réponse d'erreur |
| gotchas | string[] | OBLIGATOIRE — au moins 1 entrée, sans exception |

**Champs absents de schema.json** (migrés vers provider.json) : `provider_slug`, `provider_name`, `category`, `country_code`.

### `evidence` — obligatoire seulement quand `status` vaut `"unverified"`

```jsonc
"evidence": {
  "source_url": "https://provider.com/docs/create-payment",
  "source_reference": "Section 'Create a payment'",
  "extracted_at": "2026-09-15T10:00:00Z",
  "snapshot_hash": "a1b2c3…",
  "spans": ["POST /v1/payments", "Authorization: Bearer {api_key}"]
}
```

Chaque entrée de `spans[]` doit apparaître littéralement (espaces et casse normalisés) dans le document source à `source_url`. C'est ce qui permet à un relecteur de vérifier qu'une spec `unverified` n'a pas été inventée, sans relire toute la doc du fournisseur depuis zéro.

### Blocs ajoutés dans l'ATSS 1.1

Facultatifs, vérifiés par rapport à [`atss.schema.json`](./atss.schema.json) via `npm run validate`. Une spec
qui en utilise un met `spec_version: "1.1"` ; une spec 1.0 reste valide telle quelle.

```jsonc
"verification": {                        // required when status is "verified", forbidden otherwise
  "method": "test_live",                 // test_live | app | community_report
  "environment": "sandbox",              // sandbox | production
  "at": "2026-10-24",                    // date of the test
  "ref": "https://…",                    // the run, the app, or the report issue — required for community_report
  "spec_hash": "sha256:…"                // what was tested: schema.json without this block + canonical_example.ts
},
"open_questions": [                      // what the provider's docs do not answer — never filled with a guess
  "Does the payment URL embed the public or the secret key?"
]
```

| Champ | Règle |
|---|---|
| `verification.method` | `test_live` — `npm run test:live` a réussi ; `app` — une intégration qui fonctionne (`afrotools/examples` ou une app en usage) ; `community_report` — un rapport d'intégration accepté par un mainteneur |
| `verification.environment` | Où ça a été testé. `sandbox` prouve la structure des requêtes et des réponses, pas le comportement en production (prérequis, limites, argent réel) |
| `verification.ref` | URL de l'exécution, du code de l'app ou du rapport. Pour `community_report`, l'issue d'`afrotools/afrotools` |
| `verification.spec_hash` | `validate` le recalcule : une spec vérifiée puis modifiée échoue tant qu'elle n'est pas revérifiée, à moins qu'un mainteneur ayant contrôlé le changement ne mette le hash à jour (le message d'erreur affiche la nouvelle valeur) |
| `open_questions` | Chaînes non vides. Un agent doit en informer l'utilisateur avant de s'appuyer sur la spec. Voir § Pièges — guide d'écriture |

**Une authentification à plus d'une clé** — s'ajoute à `auth`, à côté des champs 1.0 (qui restent) :

```jsonc
"auth": {
  "type": "bearer", "location": "header", "field": "Authorization", "format": "Bearer {access_token}", "env_var": "DJOMY_CLIENT_ID",
  "credentials": [                       // every secret the user must provide
    { "env_var": "DJOMY_CLIENT_ID", "description": "clientId (API key), provided in the Djomy merchant space" },
    { "env_var": "DJOMY_CLIENT_SECRET", "description": "clientSecret (secret key), provided in the Djomy merchant space" }
  ],
  "signing": {                           // produces {signature}
    "algorithm": "HMAC-SHA256", "key": "{DJOMY_CLIENT_SECRET}", "message": "{DJOMY_CLIENT_ID}", "encoding": "hex"
  },
  "token_exchange": {                    // produces {access_token}
    "method": "POST", "path": "/v1/auth",
    "headers": [{ "in": "header", "name": "X-API-KEY", "value": "{DJOMY_CLIENT_ID}:{signature}" }],
    "token_field": "data.accessToken",   // dotted path in the response body
    "expires_in_s": 3600
  },
  "apply": [                             // what every request of this capability sends
    { "in": "header", "name": "X-API-KEY", "value": "{DJOMY_CLIENT_ID}:{signature}" },
    { "in": "header", "name": "Authorization", "value": "Bearer {access_token}" }
  ]
}
```

**Signature de webhook** — uniquement sur une spec `capability_type: "webhook"` :

```jsonc
"webhook": {
  "signature": {
    "header": "X-Webhook-Signature",
    "format": "v1:{signature}",          // how the header carries it
    "algorithm": "HMAC-SHA256", "key": "{DJOMY_CLIENT_SECRET}", "message": "{raw_body}", "encoding": "hex"
  }
}
```

**Paramètres hors du corps** — `input_schema` est le corps de la requête ; ce qui voyage dans le chemin de l'URL,
la chaîne de requête ou un en-tête va dans `parameters` :

```jsonc
"endpoint": { "method": "POST", "url": "https://api.example.com/v1/payouts/{batch_id}/items" },
"parameters": [                          // illustrative provider
  { "name": "batch_id", "in": "path", "required": true, "schema": { "type": "string" }, "description": "Payout batch id" },
  { "name": "dry_run", "in": "query", "schema": { "type": "boolean" } },
  { "name": "Idempotency-Key", "in": "header", "required": true, "schema": { "type": "string" } }
]
```

**Condition de succès** — quand une réponse 2xx ne suffit pas (ex. HTTP 200 avec `{"code": 1}` pour un
paiement échoué), le champ de la réponse qui indique que l'appel a réussi :

```jsonc
"success_condition": { "field": "code", "equals": 0 }              // or "in": ["SUCCESS", "PENDING"]
```

**Environnements** — dans `provider.json`, l'URL de base de chaque environnement que le fournisseur documente :

```jsonc
"environments": { "sandbox": { "base_url": "https://sandbox-api.djomy.africa" } }
```

**Dépréciation et retrait** — voir § Politique de compatibilité :

```jsonc
"deprecation": {                         // schema.json: required when status is "deprecated", forbidden otherwise
  "reason": "The provider retires this endpoint on 2027-01-31 (changelog link).",
  "replaced_by": "create_charge",        // optional: a capability of the same provider
  "removed_after": "2027-01-31"          // optional: the registry removes the capability after this date
},
"removed_capabilities": [                // provider.json: one tombstone per removed capability
  { "capability": "create_bill", "removed_in": "2027-02-03", "reason": "The provider shut the endpoint down on 2027-01-31.", "alternatives": ["create_charge"] }
]
```

| Règle | |
|---|---|
| Placeholders | `{ENV_VAR}` est un identifiant déclaré ; `{signature}` demande `auth.signing` (ou c'est le résultat de `webhook.signature`) ; `{access_token}` demande `auth.token_exchange` ; `{raw_body}` est le corps de la requête exactement comme reçu, et `{header:Name}` la valeur brute d'un en-tête de requête — les deux uniquement dans `webhook.signature.message`, où un `{ENV_VAR}` peut aussi être un identifiant qui vous appartient et que `canonical_example.ts` lit (ex. `{header:Response-Timestamp}{SMILEID_PARTNER_ID}sid_request`) ; ailleurs, `{ENV_VAR}` est un identifiant déclaré. `validate` rejette un placeholder qui ne se résout en rien |
| `auth.credentials` | Chaque variable d'environnement une seule fois ; absent de `auth.type: "none"` ; inclut l'`auth.env_var` de la 1.0. Dès que ce champ est présent, chaque lecture de `process.env` dans `canonical_example.ts` doit y être déclarée (ou être le secret `webhook.signature.key`, ou une variable d'environnement signée dans `webhook.signature.message`) : une variable non déclarée fait échouer la validation, au lieu du simple avertissement de la 1.0 |
| `auth.apply` | `in` : `header`, `query`, `body` ou `path` — une clé qui voyage dans le chemin de l'URL, où `name` est le `{placeholder}` de `endpoint.url` qu'elle remplit (ex. `/epay/{c}/{ref}/status` chez Paycard) |
| `auth.token_exchange` | `path` (sur l'URL de base de l'environnement) ou `url` (un serveur de jetons sur un autre hôte, ex. `https://idp.flutterwave.com/…/token`) — un seul des deux. `body` (paires nom/valeur) avec son `content_type` (`application/x-www-form-urlencoded`) pour une requête de jeton encodée en formulaire ; `headers` ne contient que des en-têtes (`in: "header"`) |
| `webhook.signature.key` | Exactement un `{ENV_VAR}` — le secret, jamais une valeur en dur. Il déclare cette variable d'environnement pour la spec |
| `algorithm`, `encoding` | `HMAC-SHA256` ; `hex` ou `base64` — les seules valeurs que les specs utilisent pour l'instant ; d'autres s'ajoutent avec la première spec qui en a besoin |
| `parameters` | `in` : `path`, `query` ou `header` ; `name` une seule fois par `in` (les noms d'en-tête ignorent la casse), jamais un nom que `auth.apply` envoie déjà ; `schema` est un JSON Schema. Un paramètre `path` est `required: true` et remplit un `{placeholder}` d'`endpoint.url` ; dès que `parameters` est présent, chaque `{placeholder}` de l'URL est rempli par un paramètre de chemin ou par `auth.apply` (`{UPPER_SNAKE_CASE}` reste une variable d'environnement) ; un paramètre n'est jamais aussi une propriété d'`input_schema`, et un `GET`/`DELETE` avec `parameters` n'a pas de corps. `validate` avertit pour une spec 1.1 dont l'URL a des placeholders sans `parameters`. Pas sur un webhook : son URL est la vôtre |
| `success_condition` | `field` est un chemin pointé (`data.status`, à travers les éléments d'un tableau) décrit par `response_schema`, quand celui-ci décrit quelque chose ; exactement un de `equals` (une chaîne, un nombre, un booléen ou null) ou `in` (une liste de ces valeurs), du type du champ (`0`, pas `"0"`, pour un `code` entier). Seulement ce que la doc du fournisseur énonce — sinon, une question ouverte. Pas sur un webhook |
| Idempotence | Convention, signalée par un avertissement de `validate` : un `POST` d'un fournisseur de paiement qui déplace de l'argent (paiement, checkout, versement, transfert, débit, remboursement, cash-in/out, confirmation d'OTP — pas une vérification de statut ni une création de bénéficiaire) précise si une nouvelle tentative est sans danger — son en-tête d'idempotence dans `parameters` (ou son champ dans `input_schema`), le comportement dans `gotchas`, ou une entrée d'`open_questions` quand la doc ne dit rien. Un versement retenté sans cela peut payer deux fois |
| `environments` | `sandbox` et/ou `production`, chacun avec une `base_url` du type `https://host[:port]` (sans chemin, requête ni fragment). L'`endpoint.url` de chaque spec non-webhook du fournisseur doit commencer par l'une d'elles. Un environnement que le fournisseur ne documente pas est omis — jamais deviné — et son absence va dans les `open_questions` des specs (une convention, non vérifiée) |
| `deprecation` | `reason` dit ce que le fournisseur a annoncé, avec sa date quand il en a donné une. `replaced_by` nomme un autre dossier de capacité du même fournisseur ; `removed_after` est une date (`AAAA-MM-JJ`) |
| `removed_capabilities` | `capability` une seule fois par liste, sans dossier restant dans le répertoire du fournisseur ; `removed_in` est la date du retrait ; `reason` une chaîne non vide ; `alternatives` (facultatif) des dossiers de capacité du même fournisseur |

### Définitions de capability_type

- `synchronous` — requête/réponse, résultat disponible immédiatement dans la réponse HTTP
- `asynchronous` — le fournisseur traite en arrière-plan, on interroge un endpoint séparé pour le résultat
- `webhook` — le fournisseur envoie un POST HTTP à votre endpoint quand un événement se produit
- `sdk` — capacité livrée via un script SDK côté client (pas d'endpoint HTTP direct). `endpoint.url` porte l'URL CDN du script SDK ; `endpoint.method` vaut `null`. Le `canonical_example.ts` exporte un helper de configuration côté serveur ; l'appel au SDK proprement dit est montré dans le bloc de commentaire d'usage. L'identifiant d'authentification va dans `auth.location: "sdk_param"` (l'objet de config du SDK).

---

## canonical_example.ts — règles

### Règles obligatoires

1. TypeScript strict — doit compiler avec `tsc --noEmit`, zéro erreur
2. Fetch natif uniquement — pas d'axios, pas de node-fetch, aucune bibliothèque HTTP externe
3. Tous les identifiants via `process.env` — vérifiés en haut, avec un throw si manquants
4. Interfaces TypeScript explicites pour les types d'entrée, de réponse et d'erreur
5. Exporter la fonction principale
6. Inclure un exemple d'usage dans un bloc de commentaire en bas
7. En-tête JSDoc : fournisseur, capacité, version ATSS, capability_type
8. L'expéditeur d'un message (numéro, sender ID, nom d'expéditeur) vient de `process.env.{PROVIDER}_{CHANNEL}_SENDER`
   dans l'exemple d'usage (ex. `INFOBIP_WHATSAPP_SENDER`), déclaré dans `auth.credentials`, jamais une valeur en dur : il
   change entre un expéditeur de test et celui du compte réel

### Modèle

```typescript
/**
 * @provider Paycard
 * @capability create_payment
 * @atss 1.0
 * @capability_type synchronous
 */

const PAYCARD_API_KEY = process.env.PAYCARD_API_KEY;
if (!PAYCARD_API_KEY) throw new Error("Missing env: PAYCARD_API_KEY");

interface CreatePaymentInput {
  amount: number;
  currency: string;
  reference: string;
  callback_url: string;
}

interface CreatePaymentResponse {
  id: string;
  payment_url: string;
  status: string;
}

interface PaycardError {
  code: string;
  message: string;
}

export async function createPayment(
  input: CreatePaymentInput
): Promise<CreatePaymentResponse> {
  const response = await fetch("https://mapaycard.com/epay/create/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...input, c: PAYCARD_API_KEY }),
  });

  if (!response.ok) {
    const error: PaycardError = await response.json();
    throw new Error(`Paycard error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<CreatePaymentResponse>;
}

/*
Usage example:

const payment = await createPayment({
  amount: 100000,
  currency: "GNF",
  reference: "order_123",
  callback_url: "https://myapp.com/callback",
});

// Store payment.operation_reference immediately
// Always verify payment status server-side before fulfilling the order
*/
```

### Ce qui ne doit jamais apparaître dans canonical_example.ts

- Tout import npm (`axios`, `node-fetch`, etc.) — fetch natif uniquement
- `require()` — modules ES uniquement
- Des clés API ou des secrets en dur
- Le type `any` sans un commentaire expliquant pourquoi

---

## Cycle de vie du statut

```
unverified → draft → ready → verified → deprecated → archived
```

### unverified — critères

- [ ] `schema.json` passe `npm run validate` (structure + bloc evidence)
- [ ] Bloc `evidence` présent avec `source_url`, `source_reference`, `extracted_at`, `snapshot_hash`, et au moins une entrée `spans[]` fondée
- [ ] Généré automatiquement par le pipeline de découverte (`core/tools/discovery`) — les contributeurs n'écrivent pas de spec `unverified` à la main
- [ ] Pas encore relu par un humain pour la justesse, au-delà des contrôles automatisés — un mainteneur qui relit la PR la fait passer à `draft` (nécessite plus de travail) ou à `ready` (semble correcte) en modifiant `status`, et en retirant ou gardant `evidence` à titre de documentation

### ready — critères

- [ ] `schema.json` passe `npm run validate`
- [ ] `canonical_example.ts` compile avec `tsc --noEmit`
- [ ] `gotchas[]` contient au moins 1 entrée précise, actionnable et sourcée (§ Pièges — guide d'écriture)
- [ ] `example_prompt` n'est pas vide
- [ ] `provider.json` existe dans le dossier parent du fournisseur
- [ ] Le champ `status` est mis à `ready`

Une spec `ready` est visible dans le serveur MCP.

### verified — critères

- [ ] Tous les critères `ready` sont remplis
- [ ] **L'un de :**
  - `npm run test:live -- --provider <slug>` réussit (exit 0) — `method: "test_live"` ; son `--report`
    donne le `spec_hash` de chaque capacité
  - Une intégration qui fonctionne : `afrotools/examples` ou une app en usage — `method: "app"`
  - Un rapport d'intégration accepté par un mainteneur (voir `CONTRIBUTING.md` § Signaler une intégration) — `method: "community_report"`
- [ ] Le bloc `verification` enregistre la méthode, l'environnement, la date et le `spec_hash`
- [ ] Un mainteneur a mis le statut à `verified`

`verified` signifie que la spec a correspondu à l'API une fois, dans `verification.environment`. Une spec vérifiée en
`sandbox` n'a pas été essayée avec des identifiants de production. `test:live` ne cible jamais que le sandbox —
il refuse de s'exécuter sur un fournisseur sans sandbox (trafic de production réel, aucun filet de sécurité
automatisé) ; voir `CONTRIBUTING.md` § Vérification live.

### AI Ready

AI Ready est une promesse du registre tout entier, pas un badge par fournisseur : chaque fournisseur publié
a des specs ATSS à partir desquelles un agent peut l'intégrer sans parser des pages de documentation. Ça ne veut pas dire
qu'une spec est sans erreur — une spec peut être fausse jusqu'à ce qu'elle soit testée, ce que `status` indique à l'
agent. Ne jamais décrire AI Ready comme « vérifié », « testé » ou « prêt pour la production ».

---

## Politique de compatibilité

Les agents maintiennent des intégrations générées à partir de ces specs. Un changement qui rend une telle intégration
fausse sans en avertir l'agent est **breaking** :

- retirer une capacité : supprimer son dossier, ou faire repasser une spec servie (`unverified`, `ready`,
  `verified`, `deprecated`) à `draft` ou à `archived`, que le MCP ne sert pas ;
- retirer ou renommer un champ de `response_schema` ;
- retirer ou renommer un champ d'`input_schema` ou de `parameters`, y compris un changement de casse ou
  un déplacement vers un autre endroit du corps. Un déplacement seul n'est pas une rupture : une propriété
  de premier niveau d'`input_schema` qui devient un paramètre du même nom, ou l'inverse (la migration ATSS 1.1) —
  l'agent lit le nouvel emplacement dans la spec. Seuls les noms d'en-tête ignorent la casse.

Changer le type d'un champ, rendre obligatoire une entrée optionnelle ou restreindre un enum casse aussi des
intégrations ; le relecteur en juge. Ajouter une capacité, un champ optionnel, un piège ou
une question ouverte, ou corriger une description, n'est pas breaking.

`scripts/spec-diff.js` compare les specs d'une PR à `main` et liste les capacités retirées ainsi que les
champs retirés ou renommés (un renommage apparaît comme un retrait), et, pour information, les champs de requête
qui ont été déplacés. La CI échoue quand elle trouve un retrait, sauf si la PR porte le label `breaking` : un mainteneur
le pose une fois le retrait confirmé comme intentionnel, puis relance le job.

**Quand le fournisseur déprécie une capacité** (annonce sa fin ou un remplacement) :

1. Mettre `status` à `"deprecated"` avec un bloc `deprecation` (`spec_version: "1.1"`) : `reason`,
   et `replaced_by` / `removed_after` quand c'est connu. Le MCP continue à servir la spec, avec un avertissement
   qui nomme `replaced_by`.
2. Une fois que le fournisseur l'a vraiment arrêtée (ou après `removed_after`), supprimer le dossier et ajouter une
   tombe dans `removed_capabilities` de `provider.json`. `get_spec` répond alors avec une erreur
   portant `removed_in`, `reason` et `alternatives`, au lieu d'un simple « introuvable ». Cette PR a besoin
   du label `breaking`.

**Quand le registre retire une capacité que le fournisseur offre toujours** (une réécriture, une spec qui n'aurait
pas dû être écrite) : supprimer le dossier, avec le label `breaking`, sans statut `deprecated`
ni tombe — `get_spec` répond avec les capacités restantes du fournisseur. Exemple : les 25
capacités Flutterwave que afrotools/afrotools#94 a retirées.

---

## Pièges — guide d'écriture

**Bon :**
```
"Always verify payment status server-side before fulfilling an order.
The callback URL alone is not sufficient — it can be forged."
```

**Mauvais :**
```
"Read the docs carefully."
```

Les pièges doivent être précis, actionnables et sourcés : la doc du fournisseur (citée ou pointée), un test
réellement effectué (`test:live` ou un appel sandbox, daté : « observé en sandbox, test live le 2026-10-24 »), une
intégration qui fonctionne ou un rapport d'intégration accepté par un mainteneur. Une conséquence de faits sourcés est
un piège valide quand elle nomme ces faits (« le callback n'est pas signé, donc il peut être falsifié »).

- Une valeur citée depuis la doc doit appartenir au champ dont parle l'entrée. Un résultat de recherche est une piste, pas
  une source : vérifiez qu'elle se trouve bien sous ce champ (le paramètre, la propriété du schéma ou un exemple de
  cet endpoint) avant de la citer, et précisez où elle se trouve.
- Attendez d'avoir lu l'endpoint en entier (paramètres, schémas liés, chaque réponse y compris les erreurs, exemples)
  et les pages partagées dont il dépend (codes d'erreur, authentification, webhooks) avant d'écrire que la doc ne dit
  pas quelque chose. Un 400 documenté « format invalide » veut dire qu'un format est imposé même quand il
  n'est pas donné : écrivez que le format est imposé mais non documenté, pas que n'importe quelle valeur fonctionne.
- La spec d'un autre fournisseur n'est pas une source. Un piège ou un choix repris d'elle a besoin que sa raison
  soit rétablie à partir de la doc de ce fournisseur-ci : par exemple, si une valeur est fiable dépend d'
  où elle vient ici (redirection navigateur, callback, webhook signé, les propres registres du marchand) et
  de quel identifiant l'appel envoie.
- Donnez la source dans la description de la PR (URL et section ; pour une doc privée, le fichier et l'endroit exact).
  Ne la mettez dans l'entrée elle-même que si le lecteur en a besoin pour juger l'entrée (« observé en
  sandbox, test live le 2026-10-24 », « la doc n'est pas publique »).

Une question ouverte nomme ce qui a été vérifié (l'endpoint, les pages) et n'est jamais remplie par une supposition.
Le bloc account garde sa propre règle sur les sources (§ provider.json — champs obligatoires, **Account**).

---

## Index des fournisseurs

Voir le tableau auto-généré dans [README.md](./README.md) — il est régénéré par la CI
(`scripts/generate-readme.js`) à chaque merge sur `main` et n'est jamais désynchronisé.
Ce fichier gardait autrefois une deuxième copie, maintenue à la main, de ce tableau ; elle s'était
désynchronisée de la réalité en quelques semaines, et ça ne vaut pas la peine de la réintroduire ici. Pour une page par
fournisseur — capacités, pièges, exigences de compte — voir
[afro.tools/fr/providers](https://afro.tools/fr/providers), construite à partir de ce même registre.
