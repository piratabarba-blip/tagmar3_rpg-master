import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const category = "o-imperio";
const manifest = JSON.parse(await readFile(join(cacheDir, "manifest.json"), "utf8"));
const system = JSON.parse(await readFile(join(root, "system.json"), "utf8"));
const revisedSnapshot = JSON.parse(await readFile(join(cacheDir, "snapshot-criando-fichas-t3er.json"), "utf8"));
const sources = manifest.pages
  .filter((page) => page.category === category)
  .sort((a, b) => a.pageName.localeCompare(b.pageName, "pt-BR"));
if (sources.length !== 20) throw new Error(`Esperadas 20 páginas oficiais de O Império; encontradas ${sources.length}`);

const stableId = (namespace, name) => createHash("sha256")
  .update(`${namespace}:${name.normalize("NFC").toLocaleLowerCase("pt-BR")}`)
  .digest("hex").slice(0, 16);
const snapshotFilename = (page) => `${createHash("sha256").update(`${page.category}:${page.pageName}`).digest("hex").slice(0, 16)}.html`;

const foldersByTopic = new Map([
  ["O império", "00 - GUIA E INTRODUÇÃO"],
  ["Império - Cronologia", "01 - HISTÓRIA, DEUSES E CRONOLOGIA"],
  ["Império - Deuses", "01 - HISTÓRIA, DEUSES E CRONOLOGIA"],
  ["Império - Império Aktar", "02 - IMPÉRIO AKTAR"],
  ["Império - Cidades-Estado Dicitíneas", "03 - CIDADES-ESTADO DICITÍNEAS"],
  ["Império - Cidades-Estado Birsas", "04 - CIDADES-ESTADO BIRSAS"],
  ["Império - Povos do Deserto", "05 - POVOS DO DESERTO"],
  ["Império - Bestiais", "06 - BESTIAIS"],
  ["Império - Crisom", "07 - CRISOM"],
  ["Império - Palátinus", "08 - PALÁTINUS"],
  ["Império - Tessaldarianos", "09 - TESSALDARIANOS"]
]);
const magicFolder = "10 - MAGIA E ORGANIZAÇÕES";
const folderNames = [...new Set([...foldersByTopic.values(), magicFolder])];
const folderColors = ["#11bfae", "#9a612a", "#b99300", "#2878a8", "#31778f", "#c07a33", "#8d3c3c", "#a84f7a", "#5947a8", "#298b57", "#7254a8"];
const folderIds = new Map();
const folders = folderNames.map((name, index) => {
  const id = stableId("tagmar-imperio-folder", name);
  folderIds.set(name, id);
  return {
    _id: id, name, type: "JournalEntry", folder: null, sorting: "m", sort: index * 100000,
    color: folderColors[index] ?? "#7254a8", flags: {},
    _stats: { systemId: "tagmar_rpg", systemVersion: system.version, coreVersion: "14.366", createdTime: null, modifiedTime: null, lastModifiedBy: null }
  };
});

function folderFor(pageName) {
  if (foldersByTopic.has(pageName)) return foldersByTopic.get(pageName);
  if (pageName === "Império - A Magia no Império" || pageName.startsWith("A Magia no Império - ")) return magicFolder;
  throw new Error(`Página sem pasta editorial: ${pageName}`);
}

function displayName(pageName) {
  if (pageName === "O império") return "O Império — Guia Oficial";
  return pageName.replace(/^Império - /, "").replace(/^A Magia no Império - /, "");
}

function absolutizeOfficialUrls(html, pageUrl) {
  return html.replace(/\b(href|src)=(?:"([^"]*)"|'([^']*)')/gi, (match, attribute, doubleQuoted, singleQuoted) => {
    const quote = doubleQuoted !== undefined ? '"' : "'";
    const value = doubleQuoted ?? singleQuoted;
    const normalized = value.replace(/&amp;/gi, "&").trim();
    if (/^(?:https?:|data:|mailto:|tel:|#|@UUID\[|systems\/)/i.test(normalized)) return match;
    try {
      const absolute = new URL(normalized, pageUrl).href.replace(/&/g, "&amp;");
      return `${attribute}=${quote}${absolute}${quote}`;
    } catch {
      return match;
    }
  });
}

function prepareOfficialHtml(html, page) {
  const portable = absolutizeOfficialUrls(html, page.url)
    .replace(/<p>\s*<\/p>/gi, "")
    .replace(/http:\/\/www\.tagmar\.com\.br/gi, "https://tagmar.com.br")
    .replace(/http:\/\/tagmar\.com\.br/gi, "https://tagmar.com.br");
  return `<section class="tagmar-imperio-referencia">
${portable}
<hr>
<p><strong>Fonte oficial sincronizada:</strong> <a href="${page.url}" target="_blank" rel="noopener">${page.pageName}</a></p>
<p><small>Conteúdo do suplemento oficial O Império. Fonte registrada por URL e hash para verificação de atualizações.</small></p>
</section>`;
}

const documents = [];
const pages = [];
const revisedItems = revisedSnapshot.documents ?? [];
const revisedFolders = revisedSnapshot.folders ?? [];
const revisedPack = "tagmar_rpg.criando-fichas-t3er";
const revisedFolderId = (name) => revisedFolders.find((folder) => folder.name === name && folder.folder === null)?._id;
const revisedItem = (name, rootFolderName) => revisedItems.find((item) => item.name === name && item.folder === revisedFolderId(rootFolderName));
const itemLink = (name, rootFolderName) => {
  const item = revisedItem(name, rootFolderName);
  if (!item) throw new Error(`Item revisado ausente no guia do Império: ${rootFolderName} / ${name}`);
  return `@UUID[Compendium.${revisedPack}.Item.${item._id}]{${name}}`;
};
const raceLinks = ["Anão", "Elfo Dourado", "Elfo Florestal", "Humano", "Meio Elfo", "Pequenino"]
  .map((name) => `<li>${itemLink(name, "01 - RAÇAS")}</li>`).join("\n");
const professionLinks = ["Bardo", "Guerreiro", "Ladino", "Mago", "Rastreador", "Sacerdote"]
  .map((name) => `<li>${itemLink(name, "02 - PROFISSÕES")}</li>`).join("\n");
const guideDefinitions = [
  {
    name: "00 — Como criar um personagem do Império",
    content: `<h1>Como criar um personagem do Império</h1>
<p>Este guia combina as regras oficiais disponíveis no compêndio <strong>Criando Fichas — Edição Revisada</strong> com a ambientação oficial de <strong>O Império</strong>. Ele não cria novas regras e não transforma automaticamente os povos descritos no suplemento em raças jogáveis.</p>
<ol>
<li>Escolha uma raça oficial no guia <strong>01 — Raças disponíveis</strong>.</li>
<li>Escolha uma profissão oficial no guia <strong>02 — Profissões disponíveis</strong>.</li>
<li>Monte atributos, habilidades, combate, defesa e pertences normalmente pelo Criando Fichas.</li>
<li>Escolha técnicas de combate permitidas para a profissão.</li>
<li>Se a profissão usar magia, selecione somente as magias e especializações às quais ela tem acesso pelas regras gerais.</li>
<li>Por último, escolha a origem imperial no guia <strong>05 — Origens e conceitos</strong> e consulte a pasta correspondente deste compêndio.</li>
</ol>
<p><strong>Regra de ouro:</strong> a origem no Império muda cultura, história, religião, relações e interpretação. Ela não concede gratuitamente ajustes raciais, técnicas ou magias que o livro não tenha definido mecanicamente.</p>`
  },
  {
    name: "01 — Raças disponíveis",
    content: `<h1>Raças disponíveis</h1>
<p>Todas as raças oficiais gerais abaixo podem aparecer em uma campanha ambientada no Império, desde que o Mestre aprove uma origem coerente:</p>
<ul>${raceLinks}</ul>
<p><strong>Escolha diretamente sustentada pela ambientação:</strong> Humano é a opção mais simples para personagens nascidos entre Aktar, Dicitíneos, Birsos e Povos do Deserto.</p>
<p><strong>Visitantes, migrantes e minorias:</strong> Anões, Elfos Dourados, Elfos Florestais, Meio-Elfos e Pequeninos podem ser usados com as regras gerais, mas sua presença e procedência devem ser explicadas na história do personagem.</p>
<p><strong>Povos descritos em O Império:</strong> Bestiais, Crisom, Palátinus e Tessaldarianos possuem informação de ambientação neste compêndio, mas não devem ser tratados como novas raças de jogador enquanto não houver uma ficha racial oficial completa.</p>`
  },
  {
    name: "02 — Profissões disponíveis",
    content: `<h1>Profissões disponíveis</h1>
<p>As seis profissões oficiais gerais podem ser usadas no Império:</p>
<ul>${professionLinks}</ul>
<h2>Correspondências de ambientação</h2>
<ul>
<li><strong>Guerreiro:</strong> exércitos, guardas, cavalaria, mercenários, gladiadores e forças das cidades-estado.</li>
<li><strong>Ladino:</strong> agentes, espiões, comerciantes clandestinos, criminosos, exploradores urbanos e navegadores.</li>
<li><strong>Mago:</strong> Ordem Imperial de Magia, Academia Dictínea de Magia, Guilda Birsa de Magia e outras tradições descritas no suplemento.</li>
<li><strong>Sacerdote:</strong> cultos e ordens religiosas admitidos na região, respeitando a divindade e a ordem escolhidas nas regras gerais.</li>
<li><strong>Rastreador:</strong> guias, caçadores, batedores, viajantes e protetores das fronteiras e desertos.</li>
<li><strong>Bardo:</strong> artistas, cronistas, diplomatas, mensageiros e representantes das tradições culturais imperiais.</li>
</ul>
<p>As organizações locais servem como origem e vínculo narrativo. Elas não substituem a profissão nem concedem automaticamente uma especialização mecânica.</p>`
  },
  {
    name: "03 — Habilidades e técnicas de combate",
    content: `<h1>Habilidades e técnicas de combate</h1>
<p>Use as habilidades e técnicas oficiais de <strong>Criando Fichas — Edição Revisada</strong>. A região de origem ajuda a decidir quais escolhas são coerentes, mas os custos, pré-requisitos, limites e níveis continuam sendo os das regras gerais.</p>
<h2>Técnicas</h2>
<ul>
<li><strong>Guerreiros:</strong> escolha entre as técnicas básicas e as academias oficiais disponíveis para Guerreiros.</li>
<li><strong>Ladinos:</strong> escolha entre as técnicas básicas e as guildas oficiais disponíveis para Ladinos.</li>
<li><strong>Bardos, Magos, Rastreadores e Sacerdotes:</strong> utilize a seção compartilhada destinada a essas profissões.</li>
</ul>
<p>Descrições militares, armas típicas ou estilos culturais encontrados no livro O Império não viram uma técnica nova por si só. Material chamado <em>Combate no Império</em> classificado como extraoficial deve permanecer fora deste guia oficial.</p>`
  },
  {
    name: "04 — Magias e tradições imperiais",
    content: `<h1>Magias e tradições imperiais</h1>
<p>Personagens usam as magias oficiais já disponíveis para sua profissão no <strong>Criando Fichas — Edição Revisada</strong>: Bardos, Magos, Rastreadores e Sacerdotes conservam suas listas, especializações, custos e limitações normais.</p>
<h2>Como usar as referências locais</h2>
<ul>
<li>A Ordem Imperial, a Academia Dictínea e a Guilda Birsa podem servir como formação, patrono ou ligação de um Mago.</li>
<li>As tradições de sacerdotes, rastreadores e artistas descritas no suplemento ajudam a definir mestre, culto, escola e papel social.</li>
<li>A Magia Magmática e outras manifestações narradas no livro somente devem receber efeitos jogáveis quando uma fonte oficial apresentar níveis, alcance, duração, evocação e demais regras necessárias.</li>
</ul>
<p>Uma tradição de ambientação não libera automaticamente todas as magias nem cria uma nova especialização.</p>`
  },
  {
    name: "05 — Origens e conceitos de personagem",
    content: `<h1>Origens e conceitos de personagem</h1>
<ul>
<li><strong>Império Aktar:</strong> soldado, funcionário, sacerdote, mago de ordem, diplomata, artista ou viajante ligado à estrutura imperial.</li>
<li><strong>Cidades-Estado Dicitíneas:</strong> cidadão de uma pólis, estudioso, guerreiro, navegador, comerciante ou membro da Academia Dictínea.</li>
<li><strong>Cidades-Estado Birsas:</strong> mercador, marinheiro, agente, aventureiro urbano ou integrante da Guilda Birsa.</li>
<li><strong>Povos do Deserto:</strong> guia, batedor, caçador, guerreiro tribal, sacerdote ou viajante das rotas desérticas.</li>
<li><strong>Bestiais, Crisom, Palátinus e Tessaldarianos:</strong> use os capítulos próprios para personagens ligados a esses povos. Caso não exista ficha racial oficial, represente o conceito com uma raça mecanicamente oficial aprovada pelo Mestre, sem inventar bônus.</li>
</ul>
<p>Depois de escolher o conceito, consulte o capítulo regional correspondente para nomes, história, religião, costumes e conflitos. A ficha mecânica continua sendo construída com os itens revisados oficiais.</p>`
  }
];
for (const [index, guide] of guideDefinitions.entries()) {
  const documentId = stableId("tagmar-imperio-guide-journal", guide.name);
  const pageId = stableId("tagmar-imperio-guide-page", guide.name);
  const guideFlags = { sourceBook: "O Império + Criando Fichas — Edição Revisada", guideType: "official-rules-mapping", synchronizedAt: manifest.generatedAt };
  documents.push({
    _id: documentId, name: guide.name, folder: folderIds.get("00 - GUIA E INTRODUÇÃO"), pages: [pageId], sort: index * 100000,
    ownership: { default: 0 }, flags: { tagmarSync: guideFlags },
    _stats: { systemId: "tagmar_rpg", systemVersion: system.version, coreVersion: "14.366", createdTime: null, modifiedTime: null, lastModifiedBy: null, compendiumSource: null, duplicateSource: null }
  });
  pages.push({
    _id: pageId, name: guide.name, type: "text", title: { show: false, level: 1 },
    text: { format: 1, content: `<section class="tagmar-imperio-guia">${guide.content}<hr><p><small>Guia editorial: combina regras oficiais existentes com a ambientação oficial sem criar mecânicas novas.</small></p></section>` }, image: {},
    video: { controls: true, volume: 0.5 }, src: null, system: {}, sort: 0,
    ownership: { default: -1 }, flags: { tagmarSync: guideFlags },
    _stats: { systemId: null, systemVersion: null, coreVersion: "14.366", createdTime: null, modifiedTime: null, lastModifiedBy: null, compendiumSource: null, duplicateSource: null }
  });
}
for (const [index, pageSource] of sources.entries()) {
  const html = await readFile(join(cacheDir, "pages", snapshotFilename(pageSource)), "utf8");
  const name = displayName(pageSource.pageName);
  const documentId = stableId("tagmar-imperio-journal", pageSource.pageName);
  const pageId = stableId("tagmar-imperio-page", pageSource.pageName);
  const syncFlags = {
    sourceBook: "O Império", sourcePage: pageSource.pageName, sourceUrl: pageSource.url,
    sourceHash: pageSource.hash, synchronizedAt: manifest.generatedAt
  };
  documents.push({
    _id: documentId, name, folder: folderIds.get(folderFor(pageSource.pageName)), pages: [pageId], sort: (index + guideDefinitions.length) * 100000,
    ownership: { default: 0 }, flags: { tagmarSync: syncFlags },
    _stats: { systemId: "tagmar_rpg", systemVersion: system.version, coreVersion: "14.366", createdTime: null, modifiedTime: null, lastModifiedBy: null, compendiumSource: null, duplicateSource: null }
  });
  pages.push({
    _id: pageId, name, type: "text", title: { show: false, level: 1 },
    text: { format: 1, content: prepareOfficialHtml(html, pageSource) }, image: {},
    video: { controls: true, volume: 0.5 }, src: null, system: {}, sort: 0,
    ownership: { default: -1 }, flags: { tagmarSync: syncFlags },
    _stats: { systemId: null, systemVersion: null, coreVersion: "14.366", createdTime: null, modifiedTime: null, lastModifiedBy: null, compendiumSource: null, duplicateSource: null }
  });
}

await mkdir(cacheDir, { recursive: true });
await Promise.all([
  writeFile(join(cacheDir, "preview-imperio-documents.json"), `${JSON.stringify(documents, null, 2)}\n`, "utf8"),
  writeFile(join(cacheDir, "preview-imperio-pages.json"), `${JSON.stringify(pages, null, 2)}\n`, "utf8"),
  writeFile(join(cacheDir, "preview-imperio-folders.json"), `${JSON.stringify(folders, null, 2)}\n`, "utf8")
]);
console.log(JSON.stringify({ documents: documents.length, pages: pages.length, folders: folders.length }, null, 2));
