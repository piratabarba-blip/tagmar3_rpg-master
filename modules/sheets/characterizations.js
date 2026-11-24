// SPDX-License-Identifier: GPL-3.0-or-later
const flagPath = "flags.tagmarzero.characterizations";
const pageSize = 20;
const openActors = new WeakSet();
const searchKey = value => String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").trim();
const esc = value => String(value ?? "").replace(/[&<>"']/g, ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch]);

function currentChoices(actor) {
    const values = actor.flags?.tagmarzero?.characterizations;
    return Array.isArray(values) ? values.filter(value=>typeof value?.id === "string" && typeof value.title === "string")
        .map(({id,title,note})=>({id,title,note:typeof note === "string" ? note : ""})) : [];
}

function updateBiography(html, oldChoices, choices) {
    const template = document.createElement("template");
    template.innerHTML = html;
    const blocks = [...template.content.querySelectorAll('[data-tagmar-characterizations="1"],#tagmar-characterizations')];
    for (const block of blocks) block.remove();
    let removed = blocks.length > 0;
    // The rich text editor may preserve the heading and list while dropping wrapper attributes.
    if (!removed && oldChoices.length) {
        const lists = [...template.content.querySelectorAll("h3 + ul")].reverse();
        const list = lists.find(candidate=>candidate.previousElementSibling.textContent.trim() === "Caracterizações"
            && Array.from(candidate.children,entry=>entry.textContent.trim()).join("\n") === oldChoices
                .map(({title,note})=>title+(note ? " — "+note : "")).join("\n"));
        if (list) {
            list.previousElementSibling.remove();
            list.remove();
            removed = true;
        }
    }
    const story = removed ? template.innerHTML : html;
    if (!choices.length) return story;
    const items = choices.map(({title,note})=>`<li><strong>${esc(title)}</strong>${note ? " — "+esc(note) : ""}</li>`).join("");
    return story+`<div id="tagmar-characterizations" data-tagmar-characterizations="1"><h3>Caracterizações</h3><ul>${items}</ul></div>`;
}

function renderPicker(root, pack, entries, chosen, rule) {
    const search = root.querySelector("[type=search]");
    const group = root.querySelector("select");
    const selected = root.querySelector(".characterization-selected");
    const results = root.querySelector(".characterization-results");
    const more = root.querySelector(".characterization-more");
    let limit = pageSize;

    function bindExcerpt(details, entry) {
        const body = details.querySelector(".characterization-excerpt");
        details.addEventListener("toggle", async () => {
            if (!details.open || body.dataset.loaded) return;
            body.dataset.loaded = "1";
            body.textContent = "Carregando…";
            try {
                const journal = await pack.getDocument(entry._id);
                const html = journal?.pages.contents[0]?.text?.content;
                body.innerHTML = foundry.utils.cleanHTML(html || "<p>Descrição indisponível.</p>");
            } catch (error) {
                console.warn("Tagmar | Abrir Caracterização",error);
                body.textContent = "Não foi possível abrir o texto. Feche e reabra este tópico para tentar de novo.";
                delete body.dataset.loaded;
            }
        });
    }

    function renderChoices() {
        selected.replaceChildren();
        for (const choice of chosen.values()) {
            const row = document.createElement("div");
            row.className = "characterization-choice";
            row.innerHTML = `<strong>${esc(choice.title)}</strong><label>Detalhe ou custo escolhido <input type="text" maxlength="240" value="${esc(choice.note)}"></label><button type="button" aria-label="Retirar ${esc(choice.title)}">Retirar</button>`;
            row.querySelector("input").oninput = event => { choice.note = event.currentTarget.value; };
            row.querySelector("button").onclick = () => {
                chosen.delete(choice.id);
                refresh();
                search.focus();
            };
            selected.append(row);
        }
        if (!chosen.size) selected.textContent = "Nenhuma Caracterização escolhida.";
    }

    function renderResults() {
        const term = searchKey(search.value);
        const matches = entries.filter(entry=>!chosen.has(entry.id) && (!group.value || group.value === entry.group)
            && entry.search.includes(term));
        results.replaceChildren();
        for (const entry of matches.slice(0,limit)) {
            const details = document.createElement("details");
            details.innerHTML = `<summary>${esc(entry.name)} <small>${esc(entry.group)}</small></summary><div class="characterization-excerpt"></div><button type="button">Adicionar à biografia</button>`;
            details.querySelector("button").setAttribute("aria-label", "Adicionar " + entry.name);
            details.querySelector("button").onclick = () => {
                chosen.set(entry.id,{id:entry.id,title:entry.name,note:""});
                refresh();
                search.focus();
            };
            bindExcerpt(details,entry);
            results.append(details);
        }
        if (!matches.length) results.textContent = "Nenhuma Caracterização encontrada.";
        more.hidden = matches.length <= limit;
    }

    function refresh() {
        renderChoices();
        renderResults();
    }

    root.querySelector(".characterization-rules").hidden = !rule;
    if (rule) bindExcerpt(root.querySelector(".characterization-rules"),rule);
    search.onkeydown = event => { if (event.key === "Enter") event.preventDefault(); };
    search.oninput = group.onchange = () => { limit = pageSize; renderResults(); };
    more.onclick = () => { limit += pageSize; renderResults(); };
    refresh();
    search.focus();
}

async function openPicker(actor) {
    if (openActors.has(actor) || !actor.canUserModify(game.user,"update")) return;
    openActors.add(actor);
    try {
        const pack = game.packs.get(game.system.id + ".caracterizacoes");
        if (!pack?.visible) throw new Error("O compêndio Caracterizações não está disponível para este usuário.");
        const index = await pack.getIndex({fields:["flags.tagmarzero.characterization"]});
        const records = [...index.values()].flatMap(entry=>{
            const info = entry.flags?.tagmarzero?.characterization;
            return info?.id ? [{_id:entry._id,id:info.id,name:entry.name,group:info.group,search:searchKey(entry.name+" "+(info.group??""))}] : [];
        });
        const entries = records.filter(entry=>entry.group).sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
        if (!entries.length) throw new Error("O compêndio Caracterizações está vazio.");
        const rule = records.find(entry=>entry.id === "complementares-162");
        const groups = [...new Set(entries.map(entry=>entry.group))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
        const snapshot = currentChoices(actor);
        const chosen = new Map(snapshot.map(value=>[value.id,{...value}]));

        const save = await foundry.applications.api.DialogV2.wait({
            window:{title:"Escolher Caracterizações"},position:{width:720},rejectClose:false,
            content:`<div class="tagmar-characterizations">
                <p>Consulte as descrições, escolha os traços e anote as variantes ou os custos combinados com o mestre.</p>
                <details class="characterization-rules"><summary>Como adquirir Caracterizações</summary><div class="characterization-excerpt"></div></details>
                <div class="characterization-filters">
                    <label>Buscar Caracterização <input type="search" placeholder="Nome ou grupo"></label>
                    <label>Grupo <select><option value="">Todos os grupos</option>${groups.map(group=>`<option>${esc(group)}</option>`).join("")}</select></label>
                </div>
                <section aria-label="Na Biografia"><h3>Na Biografia</h3><div class="characterization-selected"></div></section>
                <section aria-label="Opções"><h3>Opções</h3><div class="characterization-results"></div><button type="button" class="characterization-more" hidden>Mostrar mais</button></section>
            </div>`,
            render:(_event,dialog)=>renderPicker(dialog.element.querySelector(".tagmar-characterizations"),pack,entries,chosen,rule),
            buttons:[{action:"cancel",label:"Cancelar",callback:()=>false},
                {action:"save",label:"Salvar na biografia",callback:()=>true}]
        });
        if (!save) return;
        if (!actor.canUserModify(game.user,"update")) throw new Error("Você não tem permissão para editar esta ficha.");
        if (JSON.stringify(currentChoices(actor)) !== JSON.stringify(snapshot)) {
            throw new Error("As Caracterizações mudaram enquanto esta janela estava aberta. Abra a janela novamente para conferir.");
        }
        const values = [...chosen.values()];
        await actor.update({[flagPath]:values,"system.descricao":updateBiography(actor.system.descricao ?? "",snapshot,values)});
        ui.notifications.info("Caracterizações salvas na Biografia.");
    } finally { openActors.delete(actor); }
}

export function activateCharacterizations(root, actor) {
    const button = root.querySelector(".tagmar-open-characterizations");
    if (!button) return;
    button.addEventListener("click", () => openPicker(actor).catch(error=>{
        ui.notifications.error(error.message || "Não foi possível abrir as Caracterizações.");
        console.error("Tagmar | Caracterizações",error);
    }));
}
