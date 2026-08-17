import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the food-access service", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Manger aujourd’hui à Paris<\/title>/i);
  assert.match(html, /Manger aujourd’hui/);
  assert.match(html, /34(?:<!-- -->)? solutions intégrées/);
  assert.match(html, /Trois choix pour aujourd’hui/);
  assert.match(html, /Aucune carte ni orientation/);
  assert.match(html, /Peu importe/);
  assert.match(html, /Distribution alimentaire Porte de la Villette/);
  assert.match(html, /Restaurant Saint-Blaise/);
  assert.match(html, /Restaurant solidaire Boutebrie/);
  assert.match(html, /casvp-did-restaurants-solidaires@paris\.fr/);
  assert.match(html, /Donnée à renouveler|Prévu aujourd’hui|Un autre jour/);
  assert.match(html, /https:\/\/soliguide\.fr\//);
  assert.match(html, /href="tel:115"/);
  assert.match(html, /Pas de formulaire\. Pas de traçage\./);
  assert.match(html, /http:\/\/localhost(?::3000)?\/og\.jpg/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview/);
});

test("marks external destinations safely", async () => {
  const response = await render();
  const html = await response.text();
  const externalLinks = html.match(/<a[^>]+target="_blank"[^>]*>/g) ?? [];
  assert.ok(externalLinks.length >= 6);
  for (const link of externalLinks) {
    assert.match(link, /rel="noreferrer"/);
  }
});
