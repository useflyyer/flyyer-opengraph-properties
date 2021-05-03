/* eslint-disable no-prototype-builtins */

import get from "lodash/get";
import isNil from "lodash/isNil";
import last from "lodash/last";
import pluralize from "pluralize";

const irregulars: [string, string][] = [["audio", "audios"]];
for (const [singular, plural] of irregulars) {
  pluralize.addIrregularRule(singular, plural);
}

interface KeyValue {
  [index: string]: any;
}

export function extractDateTime(
  property: OpenGraphProperty | null | undefined,
  path?: string | number | (string | number)[],
): Date | undefined {
  const value = extractString(property, path);
  return isNil(value) ? undefined : new Date(value);
}

export function extractURL(
  property: OpenGraphProperty | null | undefined,
  path?: string | number | (string | number)[],
): URL | undefined {
  const value = extractString(property, path);
  return isNil(value) ? undefined : new URL(value);
}

export function extractNumber(
  property: OpenGraphProperty | null | undefined,
  path?: string | number | (string | number)[],
): number | undefined {
  const value = extractString(property, path);
  return isNil(value) ? undefined : Number(value);
}

export function extractString(
  property: OpenGraphProperty | null | undefined,
  path?: string | number | (string | number)[],
): string | undefined {
  if (isNil(property)) {
    return undefined;
  } else if (isNil(path)) {
    const value = property.$value;
    return isNil(value) ? undefined : String(value);
  } else {
    const leaf = get(property, path);
    return isNil(leaf) ? undefined : extractString(leaf);
  }
}

export class OpenGraphProperty<T = any> implements KeyValue {
  constructor(public $value?: T, public readonly data: Record<string, OpenGraphProperty | OpenGraphProperty[]> = {}) {}

  /**
   * Compatibility with https://liquidjs.com/api/interfaces/context_scope_.plainobject.html#Optional-toLiquid
   */
  toLiquid = () => {
    return this.data;
  };

  toString = () => {
    return this.$value;
    // return this.$value ?? "";
  };

  push = (root: string, properties: string[], content: any) => {
    if (!root) return;
    const isRoot = properties.length === 0;

    const singular = root;
    const plural = pluralize(singular); // TODO: what happens if by mistake 'root' is plural, eg: og:images?

    if (isRoot) {
      // @ts-ignore
      let value: OpenGraphProperty | undefined = this.data[singular];
      // @ts-ignore
      const values: OpenGraphProperty[] =
        this.data[plural] && Array.isArray(this.data[plural]) ? this.data[plural] : [];
      this.data[plural] = values;
      if (value) {
        // Push new value but keep first as predominant value
        values.push(new OpenGraphProperty(content));
      } else {
        value = new OpenGraphProperty(content);
        values.push(value);
        this.data[singular] = value;
      }
    } else {
      // @ts-ignore
      const values: OpenGraphProperty[] =
        this.data[plural] && Array.isArray(this.data[plural]) ? this.data[plural] : [];
      let value = last(values);
      if (!value) {
        value = new OpenGraphProperty();
        // Also add singular key
        values.push(value);
        this.data[singular] = value;
      }
      const [property, ...moreProperties] = properties;
      value.push(property!, moreProperties, content);
      this.data[plural] = values;
    }
  };

  seal = () => {
    for (const [key, value] of Object.entries(this.data)) {
      if (Array.isArray(value)) {
        for (const val of value) {
          val.seal();
        }
      } else {
        // Maybe is not necessary because is included in the arrays
        value.seal();
      }
      // @ts-ignore
      if (this.hasOwnProperty(key)) {
        // Already defined.
      } else {
        Object.defineProperty(this, key, {
          get: () => this.data[key],
          enumerable: true, // TODO: true or false?
        });
      }
    }
  };
}

export interface MetaTag {
  name?: string | null;
  property?: string | null;
  content?: string | null;
}

interface ParseMetaTagsOptions {
  /**
   * Convert `name` or `property` key to lowercase and trim whitespace.
   */
  normalizeKey?: boolean;

  /**
   * Trim white space from `content`.
   */
  normalizeValue?: boolean;
}

/**
 * Convert meta-tags into a object with accessor. Supports single and multiple tags via pluralization.
 */
export function parseMetaTags(
  metatags: MetaTag[],
  { normalizeKey = false, normalizeValue = false }: ParseMetaTagsOptions = {},
): Record<string, OpenGraphProperty> {
  const result: Record<string, OpenGraphProperty> = {};

  for (const tag of metatags) {
    let content = tag.content;
    if (!isNil(content) && normalizeValue) {
      content = content.trim();
    }

    const key = tag["property"] || tag["name"];
    if (!key) continue;
    const [prefix, root, ...properties] = (normalizeKey ? key.trim().toLowerCase() : key).split(":"); // eg: ["og", "image", "width"]
    if (!prefix || !root) continue;

    const namespaceKey = prefix.toLowerCase();
    const namespace = result[namespaceKey] || new OpenGraphProperty();
    namespace.push(root, properties, content);
    result[namespaceKey] = namespace;
  }

  for (const namespace of Object.values(result)) {
    namespace.seal();
  }

  return result;
}
