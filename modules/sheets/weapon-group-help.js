const weaponGroupNames = {
    CD: "Combate desarmado", CI: "Combate de imobilização", CL: "Corte leve",
    CLD: "Combate leve à distância", EL: "Esmagamento leve", CmE: "Corte médio com espadas",
    CmM: "Corte médio com machados", EM: "Esmagamento médio", PmA: "Penetração média com arcos",
    PmL: "Penetração média com lanças", CpE: "Corte pesado com espadas", CpM: "Corte pesado com machados",
    EP: "Esmagamento pesado", PP: "Penetração pesada", PpA: "Penetração pesada com arcos",
    PpB: "Penetração pesada com bestas"
};

export async function activateWeaponGroupHelp(root) {
    const buttons = [...root.querySelectorAll(".tagmar-weapon-group-help")];
    if (!buttons.length) return;

    const packs = ["criando-fichas", "criando-fichas-t3er", "terras-selvagens", "terras-selvagens-t3er"]
        .map(name => game.packs.get(game.system.id + "." + name)).filter(pack => pack?.visible);
    const results = await Promise.allSettled(packs.map(pack => pack.getIndex({fields:["type", "system.tipo"]})));
    const weapons = new Map(Object.keys(weaponGroupNames).map(code => [code, new Set()]));
    for (const result of results) {
        if (result.status !== "fulfilled") continue;
        for (const entry of result.value.values()) {
            if (entry.type === "Combate") weapons.get(entry.system?.tipo)?.add(entry.name);
        }
    }

    for (const button of buttons) {
        const code = button.dataset.weaponGroup;
        const label = code + " · " + weaponGroupNames[code];
        const content = document.createElement("div");
        const heading = document.createElement("strong");
        heading.textContent = label;
        content.append(heading);
        const names = [...weapons.get(code)].sort((a,b) => a.localeCompare(b, "pt-BR"));
        if (names.length) {
            const list = document.createElement("ul");
            for (const name of names) {
                const item = document.createElement("li");
                item.textContent = name;
                list.append(item);
            }
            content.append(list);
        } else {
            const empty = document.createElement("p");
            empty.textContent = "Sem armas disponíveis no Compêndio para este grupo.";
            content.append(empty);
        }
        button.setAttribute("aria-label", label);
        button.dataset.tooltipHtml = content.innerHTML;
        button.dataset.tooltipDirection = "DOWN";
        button.dataset.tooltipClass = "tagmar-weapon-group-tooltip";
        const open = () => game.tooltip.activate(button, {html:content.innerHTML, direction:"DOWN", cssClass:"tagmar-weapon-group-tooltip"});
        button.addEventListener("focus", open);
        button.addEventListener("click", open);
        button.addEventListener("blur", () => game.tooltip.deactivate());
        button.addEventListener("keydown", event => {
            if (event.key === "Escape") game.tooltip.deactivate();
        });
        if (button === document.activeElement) open();
    }
}
