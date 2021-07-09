import * as cheerio from "cheerio";
import { Liquid } from "liquidjs";
import type { FS } from "liquidjs/dist/fs/fs";
import type { LiquidOptions } from "liquidjs/dist/liquid-options";

import { extractNumber, extractString, MetaTag, parseMetaTags } from "../src";

describe("parse", () => {
  describe("og", () => {
    it("https://ogp.me/#array", () => {
      const raw = `
        <meta property="og:image" content="https://example.com/rock.jpg" />
        <meta property="og:image:width" content="300" />
        <meta property="og:image:height" content="300" />
        <meta property="og:image" content="https://example.com/rock2.jpg" />
        <meta property="og:image" content="https://example.com/rock3.jpg" />
        <meta property="og:image:height" content="1000" />
      `;

      const $ = cheerio.load(raw);
      const metatags: MetaTag[] = Array.from($("meta"), (meta) => meta.attribs);
      const parsed = parseMetaTags(metatags);
      const engine = new FlyyerLiquid({
        globals: parsed,
      });

      expect(extractString(parsed.og["image"])).toEqual("https://example.com/rock.jpg");
      expect(extractNumber(parsed.og["image"]["width"])).toEqual(300);
      expect(extractNumber(parsed.og["image"]["height"])).toEqual(300);
      expect(engine.parseAndRenderSync(`{{ og.image }}`)).toEqual("https://example.com/rock.jpg");
      expect(engine.parseAndRenderSync(`{{ og.image.width }}`)).toEqual("300");
      expect(engine.parseAndRenderSync(`{{ og.image.height }}`)).toEqual("300");

      expect(extractString(parsed.og["images"][0])).toEqual("https://example.com/rock.jpg");
      expect(extractNumber(parsed.og["images"][0]["width"])).toEqual(300);
      expect(extractNumber(parsed.og["images"][0]["height"])).toEqual(300);
      expect(engine.parseAndRenderSync(`{{ og.images[0] }}`)).toEqual("https://example.com/rock.jpg");
      expect(engine.parseAndRenderSync(`{{ og.images[0].width }}`)).toEqual("300");
      expect(engine.parseAndRenderSync(`{{ og.images[0].height }}`)).toEqual("300");

      expect(extractString(parsed.og["images"][1])).toEqual("https://example.com/rock2.jpg");

      expect(extractString(parsed.og["images"][2])).toEqual("https://example.com/rock3.jpg");
      expect(extractNumber(parsed.og["images"][2]["height"])).toEqual(1000);
      expect(extractNumber(parsed.og["images"][2]["width"])).toBeUndefined();
      expect(extractNumber(parsed.og, ["images", 2, "width"])).toBeUndefined();
    });

    it("https://ogp.me/#metadata", () => {
      const raw = `
        <meta property="og:audio" content="https://example.com/bond/theme.mp3" />
        <meta property="og:description" content="Sean Connery found fame and fortune as the suave, sophisticated British agent, James Bond." />
        <meta property="og:determiner" content="the" />
        <meta property="og:locale" content="en_GB" />
        <meta property="og:locale:alternate" content="fr_FR" />
        <meta property="og:locale:alternate" content="es_ES" />
        <meta property="og:site_name" content="IMDb" />
        <meta property="og:video" content="https://example.com/bond/trailer.swf" />

        <meta property="og:image" content="https://example.com/ogp.jpg" />
        <meta property="og:image:secure_url" content="https://secure.example.com/ogp.jpg" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="400" />
        <meta property="og:image:height" content="300" />
        <meta property="og:image:alt" content="A shiny red apple with a bite taken out" />
      `;

      const $ = cheerio.load(raw);
      const metatags: MetaTag[] = Array.from($("meta"), (meta) => meta.attribs);
      const parsed = parseMetaTags(metatags);
      const engine = new FlyyerLiquid({
        globals: parsed,
      });

      expect(String(parsed.og["audio"])).toEqual("https://example.com/bond/theme.mp3");
      expect(String(parsed.og["audios"][0])).toEqual("https://example.com/bond/theme.mp3");
      expect(parsed.og["audios"][1]).toBeUndefined();
      expect(engine.parseAndRenderSync(`{{ og.audio }}`)).toEqual("https://example.com/bond/theme.mp3");
      expect(engine.parseAndRenderSync(`{{ og.audios[0] }}`)).toEqual("https://example.com/bond/theme.mp3");
      expect(engine.parseAndRenderSync(`{{ og.audios[0].invalid }}`)).toEqual("");
      expect(engine.parseAndRenderSync(`{{ og.audios[1] }}`)).toEqual("");

      expect(String(parsed.og["site_name"])).toEqual("IMDb");
      expect(String(parsed.og["site_names"][0])).toEqual("IMDb");

      expect(String(parsed.og["locale"])).toEqual("en_GB");
      expect(String(parsed.og["locales"][0])).toEqual("en_GB");
      expect(String(parsed.og["locale"]["alternate"])).toEqual("fr_FR");
      expect(String(parsed.og["locale"]["alternates"][0])).toEqual("fr_FR");
      expect(String(parsed.og["locale"]["alternates"][1])).toEqual("es_ES");
      expect(parsed.og["locale"]["alternates"][2]).toBeUndefined();
      expect(engine.parseAndRenderSync(`{{ og.locale }}`)).toEqual("en_GB");
      expect(engine.parseAndRenderSync(`{{ og.locales[0] }}`)).toEqual("en_GB");
      expect(engine.parseAndRenderSync(`{{ og.locale.alternate }}`)).toEqual("fr_FR");
      expect(engine.parseAndRenderSync(`{{ og.locale.alternates[0] }}`)).toEqual("fr_FR");
      expect(engine.parseAndRenderSync(`{{ og.locale.alternates[1] }}`)).toEqual("es_ES");
      expect(engine.parseAndRenderSync(`{{ og.locale.alternates[2] }}`)).toEqual("");

      expect(String(parsed.og["image"])).toEqual("https://example.com/ogp.jpg");
      expect(String(parsed.og["images"][0])).toEqual("https://example.com/ogp.jpg");
      expect(String(parsed.og["image"]["width"])).toEqual("400");
      expect(String(parsed.og["images"][0]["width"])).toEqual("400");

      const print = engine.parseAndRenderSync(`
        Listening to {{ og.audio }} in {{ og.locale }}

        Available locales:
        {% for locale in og.locale.alternates %}
          Language: {{ locale }}
        {% endfor %}
      `);
      expect(print).toBeTruthy(); // TODO
    });
  });

  it("normalizeKey and normalizeValue works", () => {
    const tag: MetaTag = { name: "  twitter:TiTlE ", content: " ConTen t" };
    const parsedNormalizedKey = parseMetaTags([tag], { normalizeKey: true });
    expect(extractString(parsedNormalizedKey.twitter["title"])).toEqual(tag.content);

    const parsedNormalizedValue = parseMetaTags([tag], { normalizeKey: true, normalizeValue: true });
    expect(extractString(parsedNormalizedValue.twitter["title"])).toEqual("ConTen t");
  });

  it("gets nested value", () => {
    const raw = `
      <meta property="og:article:author" content="Patricio Lopez Juri" />
    `;

    const $ = cheerio.load(raw);
    const metatags: MetaTag[] = Array.from($("meta"), (meta) => meta.attribs);
    const parsed = parseMetaTags(metatags);
    expect(extractString(parsed.og["articles"][0]["authors"][0])).toEqual("Patricio Lopez Juri");
    expect(extractString(parsed.og["articles"][0]["author"])).toEqual("Patricio Lopez Juri");
    expect(extractString(parsed.og["article"]["author"])).toEqual("Patricio Lopez Juri");
  });
});

class FlyyerLiquid extends Liquid {
  static fs: FS = {
    resolve: function (...args: any[]) {
      throw new Error("You are not allowed to use the file system.");
    },
  } as any;

  static DEFAULTS: LiquidOptions = {
    fs: FlyyerLiquid.fs,
    // trimTagLeft: true, // TODO: not sure
    trimTagRight: true, // TODO: not sure
  };

  constructor(options: LiquidOptions) {
    super({ ...FlyyerLiquid.DEFAULTS, ...options });
  }
}
