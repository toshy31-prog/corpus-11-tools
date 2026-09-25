import fs from "node:fs/promises";
import path from "node:path";

import {
  auditCase,
  readDiscogsToken
} from "./live-track-resolution-audit.mjs";


const ROOT =
  path.resolve(".");

const QUEUE_FILE =
  path.join(
    ROOT,
    "validation-0.14",
    "resolution-priority-227.json"
  );

const RESULT_FILE =
  path.join(
    ROOT,
    "validation-0.14",
    "resolution-priority-227-results.json"
  );


function clean(value = "") {
  if (value == null) return "";

  return String(value)
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}


async function readJson(file) {
  return JSON.parse(
    await fs.readFile(
      file,
      "utf8"
    )
  );
}


async function loadState() {
  try {
    return await readJson(
      RESULT_FILE
    );
  } catch {
    return {
      format:
        "youtube-scout-resolution-priority-results",
      version: 1,
      generatedAt:
        new Date().toISOString(),

      mode:
        "read_only",

      mutationsAllowed:
        false,

      sourceQueue:
        QUEUE_FILE,

      results: []
    };
  }
}


async function saveState(state) {
  state.updatedAt =
    new Date().toISOString();

  /*
   * Écriture atomique :
   * fichier temporaire puis rename.
   */
  const tmp =
    `${RESULT_FILE}.tmp`;

  await fs.writeFile(
    tmp,
    JSON.stringify(
      state,
      null,
      2
    ),
    "utf8"
  );

  await fs.rename(
    tmp,
    RESULT_FILE
  );
}


function testCaseFromQueueItem(item) {
  const video =
    item.video || {};

  return {
    id:
      clean(
        item.id ||
        video.videoId ||
        video.id
      ),

    videoId:
      clean(
        video.videoId ||
        video.id ||
        item.id
      ),

    title:
      clean(video.title),

    channelTitle:
      clean(
        video.channelTitle
      ),

    description:
      String(
        video.description || ""
      ),

    durationSeconds:
      Number.isFinite(
        Number(
          video.durationSeconds
        )
      )
        ? Number(
            video.durationSeconds
          )
        : null,

    publishedAt:
      clean(
        video.publishedAt
      )
  };
}


function resultId(result) {
  return clean(
    result?.id ||
    result?.video?.videoId ||
    ""
  );
}


async function main() {
  const queue =
    await readJson(
      QUEUE_FILE
    );

  if (
    !queue ||
    !Array.isArray(queue.items)
  ) {
    throw new Error(
      "File 227 invalide : items[] absent."
    );
  }

  if (
    queue.items.length !== 227
  ) {
    throw new Error(
      `La file contient ${queue.items.length} éléments au lieu de 227.`
    );
  }

  const state =
    await loadState();

  const done =
    new Set(
      state.results
        .map(resultId)
        .filter(Boolean)
    );

  const discogsToken =
    await readDiscogsToken();

  console.log(
    "========================================"
  );
  console.log(
    "RESOLUTION PRIORITY RUNNER"
  );
  console.log(
    "========================================"
  );

  console.log(
    `Queue       : ${queue.items.length}`
  );

  console.log(
    `Déjà faits  : ${done.size}`
  );

  console.log(
    `Restants    : ${
      queue.items.length -
      done.size
    }`
  );

  console.log(
    `Discogs     : ${
      discogsToken
        ? "disponible"
        : "absent"
    }`
  );

  console.log(
    "Mode        : READ ONLY"
  );

  console.log(
    "Graphe      : AUCUNE MUTATION"
  );


  let index = 0;

  for (
    const item of
    queue.items
  ) {
    index++;

    const testCase =
      testCaseFromQueueItem(
        item
      );

    if (!testCase.id) {
      throw new Error(
        `Élément ${index} sans identifiant.`
      );
    }

    if (
      done.has(
        testCase.id
      )
    ) {
      console.log(
        `\n[${index}/227] SKIP ${testCase.id}`
      );

      continue;
    }

    console.log(
      "\n========================================"
    );

    console.log(
      `[${index}/227] ${testCase.id}`
    );

    console.log(
      testCase.title
    );

    console.log(
      `raison: ${
        item.priority?.reason ||
        "unknown"
      }`
    );

    console.log(
      "========================================"
    );

    const startedAt =
      new Date().toISOString();

    try {
      const result =
        await auditCase(
          testCase,
          discogsToken
        );

      state.results.push({
        ...result,

        id:
          testCase.id,

        priority:
          item.priority || null,

        runner: {
          state:
            "completed",

          startedAt,

          finishedAt:
            new Date()
              .toISOString()
        }
      });

      done.add(
        testCase.id
      );

    } catch (error) {
      /*
       * Un échec réseau ou provider ne doit PAS
       * supprimer le morceau de la file.
       *
       * On sauvegarde l'erreur et on continue.
       */
      state.results.push({
        id:
          testCase.id,

        video:
          testCase,

        priority:
          item.priority || null,

        runner: {
          state:
            "failed",

          startedAt,

          finishedAt:
            new Date()
              .toISOString(),

          error:
            String(
              error?.message ||
              error
            )
        }
      });

      console.error(
        `ERREUR ${testCase.id}:`,
        error?.message ||
        error
      );
    }

    /*
     * CHECKPOINT APRÈS CHAQUE MORCEAU.
     */
    await saveState(
      state
    );

    const completed =
      state.results.filter(
        (row) =>
          row.runner?.state ===
          "completed"
      ).length;

    const failed =
      state.results.filter(
        (row) =>
          row.runner?.state ===
          "failed"
      ).length;

    console.log(
      `Checkpoint : completed=${completed} failed=${failed}`
    );
  }


  await saveState(
    state
  );


  const completed =
    state.results.filter(
      (row) =>
        row.runner?.state ===
        "completed"
    );

  const failed =
    state.results.filter(
      (row) =>
        row.runner?.state ===
        "failed"
    );

  const decisions = {};

  for (const row of completed) {
    const decision =
      row.decision?.decision ||
      row.decision ||
      "unknown";

    decisions[decision] =
      (
        decisions[decision] ||
        0
      ) + 1;
  }


  console.log(
    "\n========================================"
  );

  console.log(
    "FIN RUNNER 227"
  );

  console.log(
    "========================================"
  );

  console.log(
    `Completed : ${completed.length}`
  );

  console.log(
    `Failed    : ${failed.length}`
  );

  console.log(
    `Total     : ${state.results.length}`
  );

  console.log(
    "Décisions :",
    JSON.stringify(
      decisions,
      null,
      2
    )
  );

  console.log(
    `Rapport   : ${RESULT_FILE}`
  );

  console.log(
    "Mutations : 0"
  );
}


main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  }
);
