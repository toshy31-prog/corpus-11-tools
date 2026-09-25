#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

import {
  auditCase,
  readDiscogsToken
} from "./live-track-resolution-engine.mjs";

const ROOT = path.resolve(".");
const queuePath = path.resolve(
  process.argv[2] ||
  "validation-0.14/resolution-network-queue.json"
);

const outputPath = path.join(
  ROOT,
  "validation-0.14",
  "live-track-resolution-queue-results.json"
);

const checkpointPath = path.join(
  ROOT,
  "validation-0.14",
  "live-track-resolution-queue-checkpoint.json"
);

function clean(value = "") {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

function getQueue(document) {
  if (
    Array.isArray(document?.queues?.priority)
  ) {
    return document.queues.priority;
  }

  if (Array.isArray(document)) return document;

  for (
    const key of [
      "queue",
      "rows",
      "items",
      "externalQueue",
      "priorityQueue"
    ]
  ) {
    if (Array.isArray(document?.[key])) {
      return document[key];
    }
  }

  throw new Error(
    "Impossible de trouver le tableau de la file réseau."
  );
}

function sourceVideo(row = {}) {
  return (
    row.video ||
    row.item ||
    row.source ||
    row
  );
}

function caseId(row, index) {
  const video = sourceVideo(row);

  return clean(
    row.caseId ||
    row.id ||
    video.videoId ||
    video.id ||
    `queue-${index + 1}`
  );
}

function toAuditCase(row, index) {
  const video = sourceVideo(row);

  const preferredNames =
    Array.isArray(row.interpreted?.preferredArtists)
      ? row.interpreted.preferredArtists
      : [];

  const competingNames =
    Array.isArray(row.interpreted?.competingArtists)
      ? row.interpreted.competingArtists
      : [];

  const issueTypes =
    Array.isArray(row.interpreted?.issueTypes)
      ? row.interpreted.issueTypes
      : [];

  const preferredArtists =
    preferredNames
      .map((name) => clean(name))
      .filter(Boolean)
      .map((name) => ({
        name,
        role: "primary",
        confidence: 0.94,
        sources: ["queue_precomputed"]
      }));

  const secondaryCredits =
    competingNames
      .map((name) => clean(name))
      .filter(Boolean)
      .map((name) => ({
        name,
        role: "channel_hint",
        confidence: 0.68,
        sources: ["queue_precomputed_competing"]
      }));

  const issues = [];

  if (
    issueTypes.includes("topic_channel_disagreement") &&
    preferredNames.length &&
    competingNames.length
  ) {
    issues.push({
      type: "topic_channel_disagreement",
      severity: "info",
      headerCandidates:
        preferredNames.map((name) => clean(name)).filter(Boolean),
      channelCandidate:
        clean(competingNames[0])
    });
  }

  if (
    issueTypes.includes("multiple_primary_candidates")
  ) {
    issues.push({
      type: "multiple_primary_candidates",
      severity: "review",
      candidates: [
        ...preferredNames.map((name) => ({
          name: clean(name),
          role: "primary",
          sources: ["queue_precomputed"]
        })),
        ...competingNames.map((name) => ({
          name: clean(name),
          role: "primary",
          sources: ["queue_precomputed_competing"]
        }))
      ].filter(({ name }) => name)
    });
  }

  for (const type of issueTypes) {
    if (
      type !== "topic_channel_disagreement" &&
      type !== "multiple_primary_candidates"
    ) {
      issues.push({
        type,
        severity: "info",
        source: "queue_precomputed"
      });
    }
  }

  const raw = {
    id:
      clean(
        video.videoId ||
        video.id ||
        row.videoId ||
        ""
      ),

    title:
      clean(
        video.title ||
        row.title
      ),

    channelTitle:
      clean(
        video.channelTitle ||
        video.channel ||
        row.channelTitle ||
        row.channel
      ),

    description:
      String(
        video.description ||
        row.description ||
        ""
      ),

    durationSeconds:
      video.durationSeconds ??
      row.durationSeconds ??
      null,

    publishedAt:
      clean(
        video.publishedAt ||
        row.publishedAt
      )
  };

  const projectedQueries =
    Array.isArray(
      row.searchPlan?.projectedQueries
    )
      ? row.searchPlan.projectedQueries
      : [];

  return {
    id: caseId(row, index),

    raw,

    sourceVideoId:
      raw.id,

    priority:
      row.priority ||
      null,

    projection: {
      interpreted: {
        title:
          clean(
            row.interpreted?.title ||
            raw.title
          ),

        preferredArtists,

        secondaryCredits,

        version:
          clean(
            row.interpreted?.version ||
            ""
          ),

        catalogueCode:
          clean(
            row.interpreted?.catalogueCode ||
            ""
          ),

        identityStatus:
          clean(
            row.interpreted?.identityStatus ||
            "unresolved"
          ) || "unresolved",

        issues
      },

      queries:
        projectedQueries.map(
          (query) => ({
            ...query,
            artist:
              clean(query.artist),
            title:
              clean(query.title),
            version:
              clean(query.version),
            catalogueCode:
              clean(query.catalogueCode)
          })
        )
    }
  };
}

async function loadExisting() {
  try {
    const value =
      JSON.parse(
        await fs.readFile(
          outputPath,
          "utf8"
        )
      );

    if (
      value &&
      Array.isArray(value.results)
    ) {
      return value;
    }
  } catch {}

  return {
    mode: "READ_ONLY",
    mutations: false,
    results: []
  };
}

async function saveWorkingState(state) {
  await fs.writeFile(
    outputPath,
    JSON.stringify(
      {
        ...state,
        generatedAt:
          new Date().toISOString()
      },
      null,
      2
    ) + "\n",
    "utf8"
  );
}

async function main() {
  const document =
    JSON.parse(
      await fs.readFile(
        queuePath,
        "utf8"
      )
    );

  const queue =
    getQueue(document);

  if (queue.length !== 227) {
    throw new Error(
      `File attendue: 227 ; obtenue: ${queue.length}`
    );
  }

  const state =
    await loadExisting();

  const completed =
    new Set(
      state.results
        .filter(
          (entry) =>
            entry?.caseId
        )
        .map(
          (entry) =>
            clean(entry.caseId)
        )
    );

  const discogsToken =
    await readDiscogsToken();

  console.log(
    "===== EXECUTION LIVE READ-ONLY DES 227 ====="
  );
  console.log(
    `Total       : ${queue.length}`
  );
  console.log(
    `Déjà faits  : ${completed.size}`
  );
  console.log(
    `Discogs     : ${
      discogsToken
        ? "disponible"
        : "absent"
    }`
  );
  console.log(
    "Mutations   : INTERDITES"
  );

  for (
    let index = 0;
    index < queue.length;
    index++
  ) {
    const row =
      queue[index];

    const id =
      caseId(
        row,
        index
      );

    if (
      completed.has(id)
    ) {
      continue;
    }

    console.log(
      `\n[${index + 1}/${queue.length}] ${id}`
    );

    let record;

    try {
      const result =
        await auditCase(
          toAuditCase(
            row,
            index
          ),
          {
            discogsToken
          }
        );

      record = {
        caseId: id,
        queueIndex: index,
        priority:
          row.priority ||
          null,
        ok: true,
        result
      };
    } catch (error) {
      record = {
        caseId: id,
        queueIndex: index,
        priority:
          row.priority ||
          null,
        ok: false,
        error: {
          name:
            error?.name ||
            "Error",
          message:
            clean(
              error?.message ||
              error
            )
        }
      };

      console.error(
        `ERREUR: ${record.error.message}`
      );
    }

    state.results.push(
      record
    );

    completed.add(id);

    await saveWorkingState(
      state
    );

    await fs.writeFile(
      checkpointPath,
      JSON.stringify(
        {
          updatedAt:
            new Date().toISOString(),

          mode:
            "READ_ONLY",

          mutations:
            false,

          total:
            queue.length,

          completed:
            completed.size,

          pending:
            queue.length -
            completed.size,

          current:
            id
        },
        null,
        2
      ) + "\n",
      "utf8"
    );
  }

  const successes =
    state.results.filter(
      ({ ok }) =>
        ok === true
    );

  const failures =
    state.results.filter(
      ({ ok }) =>
        ok === false
    );

  const decisions = {};

  for (
    const entry of successes
  ) {
    const decision =
      entry.result
        ?.decision
        ?.decision ||
      entry.result
        ?.decision ||
      "unknown";

    decisions[decision] =
      (
        decisions[decision] ||
        0
      ) + 1;
  }

  const finalReport = {
    generatedAt:
      new Date().toISOString(),

    mode:
      "READ_ONLY",

    mutations:
      false,

    queue:
      queuePath,

    total:
      queue.length,

    completed:
      completed.size,

    pending:
      queue.length -
      completed.size,

    success:
      successes.length,

    failures:
      failures.length,

    decisions,

    results:
      state.results
  };

  await fs.writeFile(
    outputPath,
    JSON.stringify(
      finalReport,
      null,
      2
    ) + "\n",
    "utf8"
  );

  console.log(
    "\n===== RESUME FINAL ====="
  );

  console.log(
    JSON.stringify(
      {
        total:
          finalReport.total,

        completed:
          finalReport.completed,

        pending:
          finalReport.pending,

        success:
          finalReport.success,

        failures:
          finalReport.failures,

        decisions:
          finalReport.decisions,

        mutations:
          false
      },
      null,
      2
    )
  );

  console.log(
    `\nRapport : ${outputPath}`
  );

  console.log(
    "Aucune mutation du graphe Scout effectuée."
  );
}

main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  }
);
