import { createRequire } from "node:module";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const foundryModules = process.env.TAGMAR_FOUNDRY_MODULES
  ?? "D:/FOUNDRY VTT 14/FoundryVTT-WindowsPortable-14.366/App/resources/app/node_modules";
const { ClassicLevel } = require(`${foundryModules}/classic-level`);
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const source = process.env.TAGMAR_CREATURE_PACK
  ? resolve(process.env.TAGMAR_CREATURE_PACK)
  : resolve(root, "packs", "criaturas-t3er");
const allMatched = process.argv.includes("--all-matched");
const allOfficial = process.argv.includes("--all-official");
const fullScope = allMatched || allOfficial;
const mechanics = JSON.parse(await readFile(join(root, ".cache", "tagmar-sync", "creatures", fullScope ? "mechanics.json" : "mechanics-pilot.json"), "utf8"));
const fullDetails = JSON.parse(await readFile(join(root, ".cache", "tagmar-sync", "creatures", "full-details.json"), "utf8"));
const syncAudit = JSON.parse(await readFile(join(root, ".cache", "tagmar-sync", "creature-sync-audit.json"), "utf8"));
const classic = JSON.parse(await readFile(join(root, ".cache", "tagmar-sync", "snapshot-criando-fichas.json"), "utf8"));
const revised = JSON.parse(await readFile(join(root, ".cache", "tagmar-sync", "snapshot-criando-fichas-t3er.json"), "utf8"));
const normalize = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, " ").trim().toLocaleLowerCase("pt-BR");
const canonicalSkills = revised.documents
  .filter((item) => item.type === "Habilidade")
  .filter((item, index, catalog) => catalog.findIndex((candidate) => normalize(candidate.name) === normalize(item.name)) === index);
const canonicalSkillByName = new Map(canonicalSkills.map((item) => [normalize(item.name), item]));
const canonicalSpecialTechniques = new Map(
  classic.documents
    .filter((item) => item.type === "Tecnica_Combate" && item.folder === "7BDhfDa5LnprQwDc")
    .map((item) => [normalize(item.name), item])
);
const temporaryRoot = await mkdtemp(join(tmpdir(), "tagmar-audit-creatures-pilot-"));
const readable = join(temporaryRoot, "pack");
await cp(source, readable, { recursive: true });
await writeFile(join(readable, "CURRENT"), `${(await readFile(join(readable, "CURRENT"), "utf8")).trim()}\n`, "utf8");
const db = new ClassicLevel(readable, { keyEncoding: "utf8", valueEncoding: "json", readOnly: true });
const actors = new Map();
const items = [];

try {
  await db.open();
  for await (const [key, value] of db.iterator()) {
    const actorMatch = key.match(/^!actors!([^.]+)$/);
    if (actorMatch) actors.set(actorMatch[1], value);
    const itemMatch = key.match(/^!actors\.items!([^.]+)\.(.+)$/);
    if (itemMatch) items.push({ actorId: itemMatch[1], itemId: itemMatch[2], ...value });
  }
} finally {
  await db.close();
  await rm(temporaryRoot, { recursive: true, force: true });
}

const errors = [];
const warnings = [];
if (canonicalSkills.length !== 42) errors.push(`catálogo revisado: ${canonicalSkills.length} habilidades, esperadas 42`);
const matchedNames = new Set(syncAudit.matched.filter((row) => row.classic.length === 1).map((row) => row.name));
const mechanicsByName = new Map(mechanics.creatures.map((creature) => [creature.name, creature]));
const fullDetailsByName = new Map(fullDetails.creatures.map((creature) => [creature.name, creature]));
const expectedCreatures = allOfficial
  ? [...syncAudit.matched.filter((row) => row.classic.length === 1), ...syncAudit.officialOnly]
      .map((row) => mechanicsByName.get(row.name) ?? { name: row.name, habilidades: [], tecnicas: [], mechanicsPending: true })
  : allMatched
  ? [...matchedNames].map((name) => mechanicsByName.get(name) ?? { name, habilidades: [], tecnicas: [], mechanicsPending: true })
  : mechanics.creatures;
const unresolvedSkillModels = new Set(["Extrair Informação", "Operação de Cerco"]);
const sameNumber = (actual, expected) => Number(actual) === Number(expected);
const requireNumber = (creature, label, actual, expected) => {
  if (!sameNumber(actual, expected)) errors.push(`${creature}/${label}: ${actual}, esperado ${expected}`);
};
if (actors.size !== expectedCreatures.length) errors.push(`atores: esperado ${expectedCreatures.length}, encontrado ${actors.size}`);
for (const creature of expectedCreatures) {
  const actorEntry = [...actors.entries()].find(([, actor]) => actor.name === creature.name);
  if (!actorEntry) {
    errors.push(`${creature.name}: ator ausente`);
    continue;
  }
  const [actorId, actor] = actorEntry;
  if (actor.prototypeToken?.actorLink !== false) errors.push(`${creature.name}: token protótipo está vinculado ao ator`);
  if (/^https?:\/\//i.test(String(actor.img ?? ""))) errors.push(`${creature.name}: imagem do ator ainda é remota`);
  if (/^https?:\/\//i.test(String(actor.prototypeToken?.texture?.src ?? ""))) errors.push(`${creature.name}: imagem do token ainda é remota`);
  const details = fullDetailsByName.get(creature.name);
  if (!details) errors.push(`${creature.name}: detalhes oficiais completos ausentes`);
  else {
    const combat = details.combat;
    requireNumber(creature.name, "estágio", actor.system?.estagio, combat.stage);
    for (const code of ["INT", "AUR", "CAR", "FOR", "FIS", "AGI", "PER"]) {
      const expected = details.attributes?.values?.[code.toLowerCase()];
      requireNumber(creature.name, `atributo ${code}`, actor.system?.atributos?.[code], expected);
      requireNumber(creature.name, `teste ${code}`, actor.system?.valor_teste?.[code], Number(expected) * 4);
    }
    requireNumber(creature.name, "EF", actor.system?.ef_npc?.max, combat.ef);
    requireNumber(creature.name, "EF atual", actor.system?.ef_npc?.value, combat.ef);
    requireNumber(creature.name, "EH", actor.system?.eh_npc?.max, combat.eh);
    requireNumber(creature.name, "EH atual", actor.system?.eh_npc?.value, combat.eh);
    requireNumber(creature.name, "Karma", actor.system?.karma_npc?.max, combat.karma);
    requireNumber(creature.name, "RF", actor.system?.rf, combat.rf);
    requireNumber(creature.name, "RM", actor.system?.rm, combat.rm);
    requireNumber(creature.name, "Moral", actor.system?.moral, combat.moral);
    requireNumber(creature.name, "VB", actor.system?.vb, combat.vb);
    if (actor.system?.d_ativa?.categoria !== combat.defense.category) errors.push(`${creature.name}/defesa: categoria ${actor.system?.d_ativa?.categoria}, esperada ${combat.defense.category}`);
    requireNumber(creature.name, "defesa ativa", actor.system?.d_ativa?.valor, combat.defense.value);
    if (!String(actor.system?.descricao ?? "").includes(details.sourceUrl)) errors.push(`${creature.name}: biografia não contém a fonte oficial`);
    if (!String(actor.system?.descricao ?? "").trim()) errors.push(`${creature.name}: biografia vazia`);
    if (actor.flags?.tagmarSync?.detailHash !== details.sourceHash) errors.push(`${creature.name}: hash dos detalhes oficiais divergente`);
  }
  if (creature.mechanicsPending) warnings.push(`${creature.name}: ator clássico preservado; mecânica oficial pendente`);
  const actorItems = items.filter((item) => item.actorId === actorId);
  const inlineItems = Array.isArray(actor.items) ? actor.items : [];
  if (inlineItems.length !== actorItems.length) {
    errors.push(`${creature.name}: lista interna possui ${inlineItems.length} itens, banco incorporado possui ${actorItems.length}`);
  } else {
    const inlineIds = new Set(inlineItems.map((item) => typeof item === "string" ? item : item?._id));
    const missingInline = actorItems.filter((item) => !inlineIds.has(item.itemId));
    if (missingInline.length) errors.push(`${creature.name}: ${missingInline.length} itens não constam na lista interna do ator`);
  }
  const duplicateGroups = [...actorItems.reduce((map, item) => {
    const key = `${item.type}:${normalize(item.name)}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
    return map;
  }, new Map())].filter(([, groupedItems]) => groupedItems.length > 1);
  const synchronizedDuplicates = duplicateGroups.filter(([, groupedItems]) => groupedItems.some((item) => item.flags?.tagmarSync?.creatureEmbedded));
  if (synchronizedDuplicates.length) errors.push(`${creature.name}: itens sincronizados duplicados por tipo/nome: ${synchronizedDuplicates.map(([key]) => key).join(", ")}`);
  for (const [key] of duplicateGroups.filter((entry) => !synchronizedDuplicates.includes(entry))) {
    warnings.push(`${creature.name}: duplicação clássica preservada: ${key}`);
  }

  for (const expected of creature.habilidades) {
    if (unresolvedSkillModels.has(expected.name)) {
      warnings.push(`${creature.name}/${expected.name}: habilidade oficial sem modelo; ator preservado sem fabricação de regra`);
      continue;
    }
    const item = actorItems.find((candidate) => candidate.type === "Habilidade" && normalize(candidate.name) === normalize(expected.name));
    if (!item) errors.push(`${creature.name}: habilidade ausente: ${expected.name}`);
    else {
      if (Number(item.system?.total) !== Number(expected.value)) errors.push(`${creature.name}/${expected.name}: total ${item.system?.total}, esperado ${expected.value}`);
      if (Number(item.system?.nivel) > Number(actor.system?.estagio)) errors.push(`${creature.name}/${expected.name}: nível ${item.system?.nivel} acima do estágio ${actor.system?.estagio}`);
      if (item.flags?.tagmarSync?.mappingStatus !== "oficial-exata") errors.push(`${creature.name}/${expected.name}: mapeamento não marcado como oficial-exata`);
    }
  }
  for (const expected of canonicalSkills) {
    const candidates = actorItems.filter((candidate) => candidate.type === "Habilidade" && normalize(candidate.name) === normalize(expected.name));
    if (candidates.length !== 1) {
      errors.push(`${creature.name}/${expected.name}: esperado exatamente 1 exemplar no repertório, encontrados ${candidates.length}`);
      continue;
    }
    const item = candidates[0];
    if (item.flags?.tagmarSync?.mappingStatus === "repertorio-nao-treinado") {
      if (Number(item.system?.nivel) !== 0) errors.push(`${creature.name}/${expected.name}: habilidade não treinada com nível ${item.system?.nivel}`);
      if (Number(item.system?.total) !== -7) errors.push(`${creature.name}/${expected.name}: habilidade não treinada com total ${item.system?.total}, esperado -7`);
      if (Boolean(item.system?.nao_rolar_sem_nivel) !== Boolean(expected.system?.nao_rolar_sem_nivel)) {
        errors.push(`${creature.name}/${expected.name}: regra de teste sem nível divergiu do catálogo revisado`);
      }
      if (normalize(item.system?.tipo) !== normalize(expected.system?.tipo)) errors.push(`${creature.name}/${expected.name}: grupo da habilidade divergiu do catálogo revisado`);
      if (item.system?.ajuste?.atributo !== expected.system?.ajuste?.atributo) errors.push(`${creature.name}/${expected.name}: atributo da habilidade divergiu do catálogo revisado`);
    }
  }
  const generatedUntrained = actorItems.filter((item) => item.type === "Habilidade" && item.flags?.tagmarSync?.mappingStatus === "repertorio-nao-treinado");
  for (const item of generatedUntrained) {
    if (!canonicalSkillByName.has(normalize(item.name))) errors.push(`${creature.name}/${item.name}: habilidade não treinada não pertence ao catálogo revisado`);
  }
  if (details) {
    const officialAttackItems = actorItems.filter((item) => item.type === "Combate" && item.flags?.tagmarSync?.mappingStatus === "oficial-tabela-combate");
    const expectedAttacks = details.combat.attacks ?? [];
    if (officialAttackItems.length !== expectedAttacks.length) {
      errors.push(`${creature.name}: ${officialAttackItems.length} ataques oficiais, esperados ${expectedAttacks.length}`);
    }
    for (const expected of expectedAttacks) {
      const candidates = officialAttackItems.filter((item) => normalize(item.name) === normalize(expected.name));
      if (candidates.length !== 1) {
        errors.push(`${creature.name}/${expected.name}: esperado 1 ataque oficial, encontrados ${candidates.length}`);
        continue;
      }
      const item = candidates[0];
      requireNumber(creature.name, `${expected.name} coluna L`, item.system?.def_l, expected.l - details.combat.stage);
      requireNumber(creature.name, `${expected.name} coluna M`, item.system?.def_m, expected.m - details.combat.stage);
      requireNumber(creature.name, `${expected.name} coluna P`, item.system?.def_p, expected.p - details.combat.stage);
      for (const percentage of [25, 50, 75, 100]) {
        requireNumber(creature.name, `${expected.name} dano ${percentage}%`, item.system?.dano?.[`d${percentage}`], expected.damage[`d${percentage}`]);
      }
      if (item.flags?.tagmarSync?.sourceUrl !== details.sourceUrl) errors.push(`${creature.name}/${expected.name}: fonte oficial divergente`);
    }
  }
  for (const expected of creature.tecnicas) {
    const specialWithoutTotal = new Set(["ataques multiplos", "bote", "prender"]).has(normalize(expected.name));
    const item = actorItems.find((candidate) => candidate.type === "Tecnica_Combate" && normalize(candidate.name) === normalize(expected.name));
    if (!item) errors.push(`${creature.name}: técnica ausente: ${expected.name}`);
    else {
      if (expected.value != null && !specialWithoutTotal && Number(item.system?.fa) !== Number(expected.value)) errors.push(`${creature.name}/${expected.name}: FA ${item.system?.fa}, esperada ${expected.value}`);
      if (specialWithoutTotal && Number(item.system?.fa) !== 0) errors.push(`${creature.name}/${expected.name}: não possui total próprio, mas FA é ${item.system?.fa}`);
      if (Number(item.system?.nivel) > Number(actor.system?.estagio)) errors.push(`${creature.name}/${expected.name}: nível ${item.system?.nivel} acima do estágio ${actor.system?.estagio}`);
      if (!item.flags?.tagmarSync?.mappingStatus) errors.push(`${creature.name}/${expected.name}: política de mapeamento ausente`);
      if (item.flags?.tagmarSync?.needsMechanicalReview) warnings.push(`${creature.name}/${expected.name}: verbete oficial vazio; revisão mecânica sinalizada`);
      if (normalize(expected.name) === "ataques multiplos" && expected.value != null) {
        if (Number(item.flags?.tagmarSync?.officialValue) !== Number(expected.value)) errors.push(`${creature.name}/${expected.name}: quantidade oficial não preservada nas flags`);
        if (!String(item.system?.restricao ?? "").includes(`Quantidade oficial: ${expected.value} ataques por rodada.`)) errors.push(`${creature.name}/${expected.name}: quantidade oficial ausente da restrição`);
      }
      if (normalize(expected.name) === "prender" && expected.difficulty) {
        if (item.flags?.tagmarSync?.officialDifficulty !== expected.difficulty) errors.push(`${creature.name}/${expected.name}: dificuldade oficial não preservada nas flags`);
        if (!String(item.system?.restricao ?? "").includes(`Dificuldade oficial para Escapar: ${expected.difficulty}.`)) errors.push(`${creature.name}/${expected.name}: dificuldade oficial ausente da restrição`);
      }
      if (["Ataques múltiplos", "Bote", "Carga Aérea", "Carga de Quadrúpede", "Prender"].includes(expected.name)) {
        const canonical = canonicalSpecialTechniques.get(normalize(expected.name));
        if (item.flags?.tagmarSync?.mappingStatus !== "oficial-livro-criaturas") errors.push(`${creature.name}/${expected.name}: regra especial não veio do Livro de Criaturas`);
        if (item.flags?.tagmarSync?.canonicalClassicFolder !== "11 - CRIANDO CRIATURAS / TECNICAS ESPECIAIS") errors.push(`${creature.name}/${expected.name}: técnica especial não preservou o modelo clássico canônico`);
        if (!item.flags?.tagmarSync?.canonicalClassicItemId) errors.push(`${creature.name}/${expected.name}: ID do modelo clássico canônico ausente`);
        if (!canonical) errors.push(`${creature.name}/${expected.name}: modelo clássico canônico não encontrado`);
        else {
          for (const field of ["descricao", "mecanica", "duracao", "teste", "pre_requisito", "complemento"]) {
            if (JSON.stringify(item.system?.[field]) !== JSON.stringify(canonical.system?.[field])) {
              errors.push(`${creature.name}/${expected.name}: campo ${field} divergiu do modelo clássico`);
            }
          }
          if (item.img !== canonical.img) errors.push(`${creature.name}/${expected.name}: ícone divergiu do modelo clássico`);
        }
        if (!item.flags?.tagmarSync?.officialGroup) errors.push(`${creature.name}/${expected.name}: grupo oficial ausente`);
        if (!item.flags?.tagmarSync?.ruleSource?.url) errors.push(`${creature.name}/${expected.name}: fonte oficial do livro ausente`);
      }
    }
  }
  if (creature.name === 'Cão de raça "Alão"') {
    const aerial = actorItems.find((item) => item.type === "Tecnica_Combate" && normalize(item.name) === "carga aerea");
    const quadruped = actorItems.find((item) => item.type === "Tecnica_Combate" && normalize(item.name) === "carga de quadrupede");
    if (aerial) errors.push(`${creature.name}: correção editorial falhou; Carga Aérea ainda está presente`);
    if (!quadruped || Number(quadruped.system?.fa) !== 4) errors.push(`${creature.name}: Carga de Quadrúpede editorial ausente ou diferente de 4`);
    if (quadruped && quadruped.flags?.tagmarSync?.editorialCorrection?.from !== "Carga Aérea") errors.push(`${creature.name}: origem da correção editorial não registrada`);
  }
  if (creature.name === "Cobra Venenosa") {
    if (!actorItems.some((item) => item.type === "Combate" && normalize(item.name) === "bote")) errors.push(`${creature.name}: ataque Bote clássico foi removido`);
  }
  if (["Cobra Venenosa", "Crocodilo"].includes(creature.name)
    && !actorItems.some((item) => item.type === "Tecnica_Combate" && normalize(item.name) === "bote")) {
    errors.push(`${creature.name}: técnica Bote oficial não foi incorporada`);
  }
}

const report = {
  generatedAt: new Date().toISOString(), mode: allOfficial ? "all-official" : allMatched ? "all-matched" : "pilot", actors: actors.size, embeddedItems: items.length,
  expectedActors: expectedCreatures.length,
  officialOnlyActors: allOfficial ? syncAudit.officialOnly.length : 0,
  completeOfficialTables: allOfficial ? fullDetails.totals?.completeCombatTables ?? 0 : null,
  byType: Object.fromEntries([...items.reduce((map, item) => map.set(item.type, (map.get(item.type) ?? 0) + 1), new Map())].sort()),
  errors, warnings
};
const output = join(root, ".cache", "tagmar-sync", "creatures", allOfficial ? "all-official-pack-audit.json" : allMatched ? "all-matched-pack-audit.json" : "pilot-pack-audit.json");
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output, ...report }, null, 2));
if (errors.length) process.exitCode = 1;
