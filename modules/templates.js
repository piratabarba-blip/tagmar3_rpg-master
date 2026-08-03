/**
* Define a set of template paths to pre-load
* Pre-loaded templates are compiled and cached for fast access when rendering
* @return {Promise}
*/
export const preloadHandlebarsTemplates = async function() {
	return loadTemplates([

        "systems/tagmar_rpg/templates/sheets/personagem-sheet.hbs",
        "systems/tagmar_rpg/templates/sheets/npc-sheet.hbs",
        "systems/tagmar_rpg/templates/sheets/inventario-sheet.hbs",
        "systems/tagmar_rpg/templates/sheetsPoints/personagem-sheet.hbs",

        "systems/tagmar_rpg/templates/sheets/combate-sheet.hbs",
        "systems/tagmar_rpg/templates/sheets/defesa-sheet.hbs",
        "systems/tagmar_rpg/templates/sheets/habilidade-sheet.hbs",
        "systems/tagmar_rpg/templates/sheets/magia-sheet.hbs",
        "systems/tagmar_rpg/templates/sheets/pertence-sheet.hbs",
        "systems/tagmar_rpg/templates/sheets/profissao-sheet.hbs",
        "systems/tagmar_rpg/templates/sheets/raca-sheet.hbs",
        "systems/tagmar_rpg/templates/sheets/tecnicascombate-sheet.hbs",
        "systems/tagmar_rpg/templates/sheets/tecnica_combate-sheet.hbs",
        "systems/tagmar_rpg/templates/sheets/transporte-sheet.hbs",
        "systems/tagmar_rpg/templates/sheets/efeito-sheet.hbs"
	]);
};