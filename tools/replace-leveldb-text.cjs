const path = require("node:path");

const [classicLevelPath, searchText, replacementText, ...databasePaths] = process.argv.slice(2);

if (!classicLevelPath || !searchText || !replacementText || !databasePaths.length) {
  console.error("Uso: node replace-leveldb-text.cjs <classic-level> <texto-antigo> <texto-novo> <banco...>");
  process.exit(1);
}

const { ClassicLevel } = require(path.resolve(classicLevelPath));

async function replaceInDatabase(databasePath) {
  const database = new ClassicLevel(path.resolve(databasePath), {
    keyEncoding: "buffer",
    valueEncoding: "buffer"
  });
  let changed = 0;

  try {
    await database.open();
    for await (const [key, value] of database.iterator()) {
      const text = value.toString("utf8");
      if (!text.includes(searchText)) continue;
      await database.put(key, Buffer.from(text.replaceAll(searchText, replacementText), "utf8"));
      changed += 1;
    }
  } finally {
    await database.close();
  }

  console.log(`${databasePath}: ${changed} registro(s) atualizado(s)`);
  return changed;
}

(async () => {
  let total = 0;
  for (const databasePath of databasePaths) total += await replaceInDatabase(databasePath);
  if (!total) {
    console.error("Nenhum registro continha o texto procurado.");
    process.exitCode = 2;
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
