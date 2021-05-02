# @flayyer/opengraph-properties

Convert meta-tags into a object with accessor. Supports single and multiple tags via [pluralization](https://github.com/plurals/pluralize).

```sh
yarn add @flayyer/opengraph-properties
```

## Usage

```ts
import { parseMetaTags, MetaTag, extractString, extractNumber } from "@flayyer/opengraph-properties";
import * as cheerio from "cheerio";

const raw = `
  <meta property="og:image" content="https://example.com/rock.jpg" />
  <meta property="og:image:width" content="300" />
  <meta property="og:image:height" content="300" />
  <meta property="og:image" content="https://example.com/rock2.jpg" />
  <meta property="og:image" content="https://example.com/rock3.jpg" />
  <meta property="og:image:height" content="1000" />
`;

// means there are 3 images on this page, the first image is 300x300, the middle one has unspecified dimensions, and the last one is 1000px tall.

const $ = cheerio.load(raw);
const metatags: MetaTag[] = Array.from($("meta"), (meta) => meta.attribs);
const parsed = parseMetaTags(metatags, {
  // Convert `name` or `property` key to lowercase and trim whitespace.
  normalizeKey: true,
  // Trim white space from `content`.
  normalizeValue: true,
});

// First appearance take precedence.
extractString(parsed.og["image"]) === "https://example.com/rock.jpg";
extractNumber(parsed.og["image"]["width"]) === 300;
extractNumber(parsed.og["image"]["height"]) === 300;

// A pluralized key is always created to handle multiple appearances.
extractString(parsed.og["images"][0]) === "https://example.com/rock.jpg";
extractNumber(parsed.og["images"][0]["width"]) === 300;
extractNumber(parsed.og["images"][0]["height"]) === 300;
extractString(parsed.og["images"][1]) === "https://example.com/rock2.jpg";
extractString(parsed.og["images"][2]) === "https://example.com/rock3.jpg";
extractNumber(parsed.og["images"][2]["height"]) === 1000;
```

Undeclared properties are `undefined`.

```ts
extractNumber(parsed.og["images"][2]["width"]) === undefined
```

Also a property accessor can be used as second argument.

```ts
extractNumber(parsed.og, "images.2.height") === 1000;
extractNumber(parsed.og, ["images", 2, "height"]) === 1000;
```

### LiquidJS

Can be used with [liquidjs](https://github.com/harttle/liquidjs).

```ts
import { parseMetaTags, MetaTag, extractString, extractNumber } from "@flayyer/opengraph-properties";
import { Liquid } from "liquidjs";

const metatags: MetaTag[] = [
  {
    property: "og:audio",
    content: "https://example.com/bond/theme.mp3",
  },
  {
    property: "og:locale",
    content: "en_GB",
  },
  {
    property: "og:locale:alternate",
    content: "fr_FR",
  },
  {
    property: "og:locale:alternate",
    content: "es_ES",
  },
];

const parsed = parseMetaTags(metatags);
const engine = new Liquid({ globals: parsed });

const print = engine.parseAndRenderSync(`
  Listening to {{ og.audio }} in {{ og.locale }}

  Available locales:
  {% for locale in og.locale.alternates %}
    Language: {{ locale }}
  {% endfor %}
`);
console.log(print);
```

Will print:

```txt
Listening to https://example.com/bond/theme.mp3 in en_GB

Available locales:
Language: fr_FR
Language: es_ES
```
