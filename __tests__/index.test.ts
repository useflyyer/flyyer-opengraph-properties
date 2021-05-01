import * as cheerio from "cheerio";

import { parse } from "../src";

describe("parse", () => {
  const raw = `
    <meta property="og:audio" content="https://example.com/bond/theme.mp3" />
    <meta property="og:description" content="Sean Connery found fame and fortune as the suave, sophisticated British agent, James Bond." />
    <meta property="og:determiner" content="the" />
    <meta property="og:locale" content="en_GB" />
    <meta property="og:locale:alternate" content="fr_FR" />
    <meta property="og:locale:alternate" content="es_ES" />
    <meta property="og:site_name" content="IMDb" />
    <meta property="og:video" content="https://example.com/bond/trailer.swf" />
  `;

  const $ = cheerio.load(raw);
  const metatags = Array.from($("meta"), (meta) => meta.attribs);
  // console.log(metatags);

  describe("og", () => {
    it("create singular and multiple tags", () => {
      const parsed = parse(metatags);

      expect(String(parsed["og"]["audio"])).toEqual("https://example.com/bond/theme.mp3");
      expect(String(parsed["og"]["audios"][0])).toEqual("https://example.com/bond/theme.mp3");
      expect(parsed["og"]["audios"][1]).toBeUndefined();

      expect(String(parsed["og"]["locale"])).toEqual("en_GB");
      expect(String(parsed["og"]["locale"]["alternate"])).toEqual("fr_FR");
      expect(String(parsed["og"]["locale"]["alternates"][0])).toEqual("fr_FR");
      expect(String(parsed["og"]["locale"]["alternates"][1])).toEqual("es_ES");
      expect(String(parsed["og"]["locales"][0])).toEqual("en_GB");
    });
  });
});
