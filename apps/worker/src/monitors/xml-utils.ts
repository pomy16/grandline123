import { decodeEntities, stripHtml } from "./parser-utils";

export function tagValues(xml: string, tag: string) {
  const values: string[] = [];
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "gi");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml))) values.push(decodeEntities(match[1].trim()));
  return values;
}

export function firstTagValue(xml: string, tag: string) {
  return tagValues(xml, tag)[0] ?? null;
}

export function blocks(xml: string, tag: string) {
  const values: string[] = [];
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${tag}>`, "gi");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml))) values.push(match[0]);
  return values;
}

export function cdataText(value: string | null) {
  if (!value) return null;
  return stripHtml(value.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, ""));
}
