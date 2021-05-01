import last from "lodash/last";
import set from "lodash/set";
import pluralize from "pluralize";

const irregulars: [string, string][] = [["audio", "audios"]];
for (const [singular, plural] of irregulars) {
  pluralize.addIrregularRule(singular, plural);
}

interface KeyValue {
  [index: string]: any;
}
export class OpenGraphProperty<T = any> implements KeyValue {
  constructor(public $value?: T) {}
  toString() {
    return this.$value ?? "";
  }
}

export class OpenGraphNamespace {
  constructor(
    public name: string,
    public readonly data: Record<string, OpenGraphProperty | OpenGraphProperty[]> = {},
  ) {}

  /**
   * Compatibility with https://liquidjs.com/api/interfaces/context_scope_.plainobject.html#Optional-toLiquid
   */
  toLiquid() {
    return this.data;
  }

  push(root: string, properties: string[], content: any) {
    if (!root) return;
    const isRoot = properties.length === 0;

    const singular = root;
    const plural = pluralize(singular); // TODO: what happens if by mistake 'root' is plural, eg: og:images?

    if (isRoot) {
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
        values.push(value);
      }
      set(value, properties, new OpenGraphProperty(content));
      this.data[plural] = values;
    }
  }

  seal() {
    for (const key of Object.keys(this.data)) {
      Object.defineProperty(this, key, {
        get: () => this.data[key],
      });
    }
  }
}

export interface MetaTag {
  name?: string | null;
  property?: string | null;
  content?: string | null;
}

export function parse(metatags: MetaTag[]): Record<string, OpenGraphNamespace> {
  const result: Record<string, OpenGraphNamespace> = {};

  for (const tag of metatags) {
    const content = tag.content;
    const key = tag["property"] || tag["name"];
    if (!key) continue;
    const [prefix, root, ...properties] = key.split(":"); // eg: ["og", "image", "width"]
    if (!prefix || !root) continue;

    const namespaceKey = prefix.toLowerCase();
    const namespace = result[namespaceKey] || new OpenGraphNamespace(namespaceKey);
    namespace.push(root, properties, content);
    result[namespaceKey] = namespace;
  }

  for (const namespace of Object.values(result)) {
    namespace.seal();
  }

  return result;
}
