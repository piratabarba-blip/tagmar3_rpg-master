import tagmarItemSheet from "./sheets/tagmarItemSheet.js";
import tagmarActorSheet from "./sheets/tagmarActorSheet.js";
import tagmarAltSheet from "./sheets/tagmarAltSheet.js";
import { tagmarItem } from "./tagmarItem.js";
import {tagmarActor} from "./tagmarActor.js";
import { preloadHandlebarsTemplates } from "./templates.js";
import { SystemSettings } from "./settings.js";
import { dadosColoridos } from "./dadosColoridos.js";

let ocultos = false;

const tabela_resol = [
  [-7, "verde", "verde", "verde", "verde", "verde", "verde", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "laranja", "vermelho", "azul", "cinza"],
  [-6, "verde", "verde", "verde", "verde", "verde", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "laranja", "vermelho", "azul", "cinza"],
  [-5, "verde", "verde", "verde", "verde", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "vermelho", "azul", "cinza"],
  [-4, "verde", "verde", "verde", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "vermelho", "azul", "cinza"],
  [-3, "verde", "verde", "verde", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "vermelho", "azul", "cinza"],
  [-2, "verde", "verde", "verde", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "vermelho", "vermelho", "azul", "cinza"],
  [-1, "verde", "verde", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "vermelho", "vermelho", "azul", "cinza"],
  [0, "verde", "verde", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "azul", "cinza"],
  [1, "verde", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "azul", "cinza"],
  [2, "verde", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "vermelho", "vermelho", "azul", "azul", "cinza"],
  [3, "verde", "branco", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "azul", "azul", "cinza"],
  [4, "verde", "branco", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "azul", "azul", "cinza"],
  [5, "verde", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "azul", "azul", "cinza"],
  [6, "verde", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "cinza"],
  [7, "verde", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "cinza"],
  [8, "verde", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "cinza"],
  [9, "verde", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "cinza"],
  [10, "verde", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "azul", "cinza"],
  [11, "verde", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "roxo", "cinza"],
  [12, "verde", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "roxo", "cinza"],
  [13, "verde", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "roxo", "cinza"],
  [14, "verde", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "azul", "roxo", "cinza"],
  [15, "verde", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "roxo", "roxo", "cinza"],
  [16, "verde", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "roxo", "roxo", "cinza"],
  [17, "verde", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "roxo", "roxo", "cinza"],
  [18, "verde", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "azul", "roxo", "roxo", "cinza"],
  [19, "verde", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "roxo", "roxo", "roxo", "cinza"],
  [20, "verde", "amarelo", "laranja", "laranja", "laranja", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "azul", "roxo", "roxo", "roxo", "cinza"]
];

const table_resFisMag = [
  [-2, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 20, 20, 20, 20, 20, 20, 20],
  [-1, 13, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 20, 20, 20, 20, 20, 20],
  [ 0, 12, 13, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 20, 20, 20, 20, 20],
  [ 1, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 20, 20, 20, 20],
  [ 2, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 20, 20, 20],
  [ 3,  9, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 20, 20],
  [ 4,  8,  9, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 20],
  [ 5,  7,  8,  9, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20],
  [ 6,  7,  7,  8,  9, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20],
  [ 7,  6,  7,  7,  8,  9, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19],
  [ 8,  6,  6,  7,  7,  8,  9, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19],
  [ 9,  5,  6,  6,  7,  7,  8,  9, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17, 18, 18],
  [10,  5,  5,  6,  6,  7,  7,  8,  9, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17, 18],
  [11,  4,  5,  5,  6,  6,  7,  7,  8,  9, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17],
  [12,  4,  4,  5,  5,  6,  6,  7,  7,  8,  9, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17],
  [13,  3,  4,  4,  5,  5,  6,  6,  7,  7,  8,  9, 10, 11, 12, 13, 14, 15, 15, 16, 16],
  [14,  3,  3,  4,  4,  5,  5,  6,  6,  7,  7,  8,  9, 10, 11, 12, 13, 14, 15, 15, 16],
  [15,  2,  3,  3,  4,  4,  5,  5,  6,  6,  7,  7,  8,  9, 10, 11, 12, 13, 14, 15, 15],
  [16,  2,  2,  3,  3,  4,  4,  5,  5,  6,  6,  7,  7,  8,  9, 10, 11, 12, 13, 14, 15],
  [17,  2,  2,  2,  3,  3,  4,  4,  5,  5,  6,  6,  7,  7,  8,  9, 10, 11, 12, 13, 14],
  [18,  2,  2,  2,  2,  3,  3,  4,  4,  5,  5,  6,  6,  7,  7,  8,  9, 10, 11, 12, 13],
  [19,  2,  2,  2,  2,  2,  3,  3,  4,  4,  5,  5,  6,  6,  7,  7,  8,  9, 10, 11, 12],
  [20,  2,  2,  2,  2,  2,  2,  3,  3,  4,  4,  5,  5,  6,  6,  7,  7,  8,  9, 10, 11]
];

Hooks.once("init", function(){
  game.tagmar = {
    tagmarItem,
    tagmarActor,
    rollItemMacro,
    tabela_resol,
    table_resFisMag
  };
  CONFIG.Combat.initiative = {
    formula: "1d10 + @iniciativa",
    decimals: 2
  };
  CONFIG.Combat.sounds = Object.assign({ // Exclusivo Tagmar XXX
    tagmar: {
      label: "Tagmar",
      startEncounter: ["/systems/tagmar_rpg/assets/sounds/vo_anno_fight04.wav"]
    }
  }, CONFIG.Combat.sounds);
  CONFIG.Item.documentClass = tagmarItem;
  CONFIG.Actor.documentClass = tagmarActor;
  CONFIG.time.roundTime = 15;
  // Register System Settings
  SystemSettings();
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("tagmar", tagmarItemSheet, {makeDefault: true});

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("tagmar", tagmarActorSheet, {makeDefault: true});
  Actors.registerSheet("tagmar", tagmarAltSheet, {makeDefault: false});
  
  Handlebars.registerHelper('ifeq', function (a, b, options) {
    if (a == b) { return options.fn(this); }
    return options.inverse(this);
  });

  Handlebars.registerHelper('ifgr', function (a, b, options) {
    if (a > b) { return options.fn(this); }
    return options.inverse(this);
  });

  Handlebars.registerHelper('ifge', function (a, b, options) {
    if (a >= b) { return options.fn(this); }
    return options.inverse(this);
  });

  Handlebars.registerHelper('ifle', function (a, b, options) {
    if (a <= b) { return options.fn(this); }
    return options.inverse(this);
  });

  Handlebars.registerHelper('iflw', function (a, b, options) {
    if (a < b) { return options.fn(this); }
    return options.inverse(this);
  });

  Handlebars.registerHelper('ifdf', function (a, b, options) {
    if (a != b) { return options.fn(this); }
    return options.inverse(this);
  });

  Handlebars.registerHelper('ifind', function (a, b, options) {
    if (typeof a === 'undefined') return;
    const a_list = a.split(',');
    const found = a_list.find(element => element == b);
    if (found) {
      return options.fn(this);
    } 
    return options.inverse(this);
  });

  Handlebars.registerHelper('idfind', function (a, b, options) {
    if (typeof a === 'undefined') return;
    const a_list = a.split(',');
    const found = a_list.find(element => element == b);
    if (!found) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  Handlebars.registerHelper('soma', function(a, b, c, d, options) {
    let soma = a + b + c + d;
    return soma;
  });

  Handlebars.registerHelper('multiplica', function(a, b, options) {
    let mult = a * b;
    return mult.toFixed(2);
  });

  Handlebars.registerHelper('toFixed', function(value, decimal, options) {
    return parseFloat(value).toFixed(decimal);
  });

  Handlebars.registerHelper('settingTrue', function(setting, options) {
    if (game.settings.get('tagmar_rpg', setting)) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  Handlebars.registerHelper('fichaPontos', function (data, options) {
    let actor = game.actors.find(a => a.items.find(i => i.id == data._id));
    if (typeof actor != 'undefined') {
      if (actor.ficha != "Sorteio") {
        return options.inverse(this);
      }
    }
    return options.fn(this);
  });

  Handlebars.registerHelper('settingFalse', function(setting, options) {
    if (!game.settings.get('tagmar_rpg', setting)) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  Handlebars.registerHelper('pontos_carac', function(estagio) {
    let pontos = 3;
    if (estagio > 0) {
      if (estagio == 1) return pontos;
      else {
        for (let x = 2; x <= estagio; x++) {
          if ((x % 2) != 0) {
            pontos += 1;
          }
        }
        return pontos;
      }
    } else return 0;
  });

  Handlebars.registerHelper('numHab', function(items) {
    return items.filter(i=> i.type=="Habilidade" && i.system.nivel > 0).length;
  });

  preloadHandlebarsTemplates();
});

Hooks.once("polyglot.init", (LanguageProvider) => {
  class TagmarLanguageProvider extends LanguageProvider {
    languages = {
      males: {
        label: "Males",
        font: "Olde English",
        rng: "default"
      },
      leva: {
        label: "Leva",
        font: "Olde Thorass",
        rng: "default"
      },
      lud: {
        label: "Lud",
        font: "Qijomi",
        rng: "default"
      },
      eredri: {
        label: "Eredri",
        font: "Semphari",
        rng: "default"
      },
      verrogari: {
        label: "Verrogari",
        font: "Oriental",
        rng: "default"
      },
      dantseniano: {
        label: "Dantseniano",
        font: "Reanaarian",
        rng: "default"
      },
      maranes: {
        label: "Maranês",
        font: "Miroslav Normal",
        rng: "default"
      },
      lunes: {
        label: "Lunês",
        font: "Kargi",
        rng: "default"
      },
      runes: {
        label: "Runês",
        font: "Elder Futhark",
        rng: "default"
      },
      abadrim: {
        label: "Abadrim",
        font: "Meroitic Demotic",
        rng: "default"
      },
      planense: {
        label: "Planense",
        font: "Maras Eye",
        rng: "default"
      },
      linguacomumdascidadesestados: {
        label: "Língua comum das Cidades-Estados",
        font: "Scrapbook Chinese",
        rng: "default"
      },
      linguacomumdosmangues: {
        label: "Língua comum dos Mangues",
        font: "Ork Glyphs",
        rng: "default"
      },
      rubeo: {
        label: "Rúbeo",
        font: "Floki",
        rng: "default"
      },
      lazuli: {
        label: "Lazúli",
        font: "High Drowic",
        rng: "default"
      },
      linguasbarbaras: {
        label: "Línguas bárbaras",
        font: "Dovah",
        rng: "default"
      },
      aktar: {
        label: "Aktar",
        font: "Olde Thorass",
        rng: "default"
      },
      dictio: {
        label: "Díctio",
        font: "Nordic",
        rng: "default"
      },
      birso: {
        label: "Birso",
        font: "Nordic",
        rng: "default"
      },
      povosdodeserto: {
        label: "Povos do deserto",
        font: "Valmaric",
        rng: "default"
      },
      lanta: {
        label: "Lanta",
        font: "Thorass",
        rng: "default"
      },
      avozdepedra: {
        label: "A voz de pedra",
        font: "Dethek",
        rng: "default"
      },
      elfico: {
        label: "Élfico",
        font: "Espruar",
        rng: "default"
      },
      tessaldar: {
        label: "Tessaldar",
        font: "Celestial",
        rng: "default"
      },
      kurng: {
        label: "Kurng",
        font: "Dovah",
        rng: "default"
      },
      linguadasfadas: {
        label: "Língua das fadas",
        font: "Celestial",
        rng: "default"
      },
      linguadosdragoes: {
        label: "Língua dos dragões",
        font: "Iokharic",
        rng: "default"
      },
      linguasselvagens: {
        label: "Línguas selvagens",
        font: "Mage Script",
        rng: "default"
      },
      marante: {
        label: "Marante",
        font: "Ophidian",
        rng: "default"
      },
      infernal: {
        label: "Infernal",
        font: "Infernal",
        rng: "default"
      },
      abissal: {
        label: "Abissal",
        font: "Infernal",
        rng: "default"
      }
    }
    async getLanguages() {
      const langs = {
        males: {
          label: "Males",
          font: "Olde English",
          rng: "default"
        },
        leva: {
          label: "Leva",
          font: "Olde Thorass",
          rng: "default"
        },
        lud: {
          label: "Lud",
          font: "Qijomi",
          rng: "default"
        },
        eredri: {
          label: "Eredri",
          font: "Semphari",
          rng: "default"
        },
        verrogari: {
          label: "Verrogari",
          font: "Oriental",
          rng: "default"
        },
        dantseniano: {
          label: "Dantseniano",
          font: "Reanaarian",
          rng: "default"
        },
        maranes: {
          label: "Maranês",
          font: "Miroslav Normal",
          rng: "default"
        },
        lunes: {
          label: "Lunês",
          font: "Kargi",
          rng: "default"
        },
        runes: {
          label: "Runês",
          font: "Elder Futhark",
          rng: "default"
        },
        abadrim: {
          label: "Abadrim",
          font: "Meroitic Demotic",
          rng: "default"
        },
        planense: {
          label: "Planense",
          font: "Maras Eye",
          rng: "default"
        },
        linguacomumdascidadesestados: {
          label: "Língua comum das Cidades-Estados",
          font: "Scrapbook Chinese",
          rng: "default"
        },
        linguacomumdosmangues: {
          label: "Língua comum dos Mangues",
          font: "Ork Glyphs",
          rng: "default"
        },
        rubeo: {
          label: "Rúbeo",
          font: "Floki",
          rng: "default"
        },
        lazuli: {
          label: "Lazúli",
          font: "High Drowic",
          rng: "default"
        },
        linguasbarbaras: {
          label: "Línguas bárbaras",
          font: "Dovah",
          rng: "default"
        },
        aktar: {
          label: "Aktar",
          font: "Olde Thorass",
          rng: "default"
        },
        dictio: {
          label: "Díctio",
          font: "Nordic",
          rng: "default"
        },
        birso: {
          label: "Birso",
          font: "Nordic",
          rng: "default"
        },
        povosdodeserto: {
          label: "Povos do deserto",
          font: "Valmaric",
          rng: "default"
        },
        lanta: {
          label: "Lanta",
          font: "Thorass",
          rng: "default"
        },
        avozdepedra: {
          label: "A voz de pedra",
          font: "Dethek",
          rng: "default"
        },
        elfico: {
          label: "Élfico",
          font: "Espruar",
          rng: "default"
        },
        tessaldar: {
          label: "Tessaldar",
          font: "Celestial",
          rng: "default"
        },
        kurng: {
          label: "Kurng",
          font: "Dovah",
          rng: "default"
        },
        linguadasfadas: {
          label: "Língua das fadas",
          font: "Celestial",
          rng: "default"
        },
        linguadosdragoes: {
          label: "Língua dos dragões",
          font: "Iokharic",
          rng: "default"
        },
        linguasselvagens: {
          label: "Línguas selvagens",
          font: "Mage Script",
          rng: "default"
        },
        marante: {
          label: "Marante",
          font: "Ophidian",
          rng: "default"
        },
        infernal: {
          label: "Infernal",
          font: "Infernal",
          rng: "default"
        },
        abissal: {
          label: "Abissal",
          font: "Infernal",
          rng: "default"
        }
      };
      this.languages = langs;
    }
    getUserLanguages(actor) {
      let known_languages = new Set();
      let literate_languages = new Set();
      if (actor.type == "Inventario") return [known_languages, literate_languages];
      let linguas = actor.system.defesa.categoria.split(';');
      for (let lang of linguas) {
        known_languages.add(lang);
      }
      return [known_languages, literate_languages];
    }
  }
  game.polyglot.api.registerSystem(TagmarLanguageProvider);
});

Hooks.once("ready", async function () {
  game.settings.set('core', 'combatTheme', 'tagmar'); // Exclusivo Tagmar XXX
  if (game.user.isGM) game.settings.set('polyglot', 'allowOOC', 'a');
  Hooks.on("hotbarDrop", (bar, data, slot) => {
    createTagmarMacro(data, slot);
    return false;
  });
  boasVindas();
  $('#logo').attr('src', '/systems/tagmar_rpg/templates/sheets/img/logo.png');
  $('#logo').click(function () {
    if (!ocultos) {
      $('#controls').addClass('esconde');
      $('#navigation').addClass('esconde');
      $('#hotbar').addClass('esconde');
      $('#players').addClass('esconde');
      ocultos = true;
    } else {
      $('#controls').removeClass('esconde');
      $('#navigation').removeClass('esconde');
      $('#players').removeClass('esconde');
      $('#hotbar').removeClass('esconde');
      ocultos = false;
    }
  }); 
  $("#chat-controls > label").click(async () => rollDialog()); // Rolagem avulsa no dadinho do chat
});

Hooks.on('renderPlayerList', function () {
  if (ocultos) {
    $('#players').addClass('esconde');
  } else {
    $('#players').removeClass('esconde');
  }
});

Hooks.on('renderSceneNavigation', function () {
  if (ocultos) {
    $('#navigation').addClass('esconde');
  } else {
    $('#navigation').removeClass('esconde');
  }
});

Hooks.on('renderSceneControls', function () {
  if (ocultos) {
    $('#controls').addClass('esconde');
  } else {
    $('#controls').removeClass('esconde');
  }
});

function boasVindas () {
  if(!game.user.getFlag("tagmar_rpg","boasVindas")) {
    let contento = '<img src="/systems/tagmar_rpg/templates/sheets/img/logo.png" style="display: block; margin-left: auto; margin-right: auto; border-width: 0;" /><h1 class="fairyDust rola" style="text-align:center;">Tagmar RPG</h1>';
    let tagmar_prj = '<p class="rola_desc mediaeval">Conheça sobre o <a href="https://tagmar.com.br/" title="Acessar o site de Tagmar">Projeto Tagmar</a>.</p>';
    let sys_text = '<p class="rola_desc mediaeval">Saiba mais sobre o sistema <a href="https://foundryvtt.com/packages/tagmar">Tagmar RPG no Foundry</a> e também no <a href="https://github.com/marcoswalker/tagmar">GitHub</a>.</p>';
    let youtChan = '<p class="rola_desc mediaeval">Acesse nosso canal no <a href="https://www.youtube.com/channel/UCDyR_0eg3TjV5r5cOUqQaSQ">Youtube</a>.</p>';
    let credits = '<p class="rola_desc"><span class="creditos mediaeval">por Vinicius Fernandez (Pirata) e Marcos Walker</span></p>'
    let options = {
      whisper:[game.user.id],
      content: "<div class='bg-img-items'>" + contento + tagmar_prj + sys_text + youtChan + credits + "</div>"
    };
    ChatMessage.create(options);
    game.user.setFlag("tagmar_rpg", "boasVindas", true);
  }
}

Hooks.on("preCreateToken", function (document, data) {
  if (!game.user.isGM) return;
  if (!game.modules.get('barbrawl') && !game.modules.get('barbrawl').active) return;
  const settingBars = game.settings.get("tagmar_rpg", "autoBars");
  if (settingBars == "no") return;
  let resources = createBrawrs(document, settingBars);
  document.updateSource({
      "flags.barbrawl.resourceBars": resources
  });
});

function createBrawrs(token, setting) {
  const actor = token.actor;
  let resources = {};
  if (setting == "barra_pers") {
    if (actor.type == "Personagem") {
      resources = {
        "bar1": {
            id: "bar1",
            mincolor: "#fbff00",
            maxcolor: "#00ff08",
            position: "top-outer",
            attribute: "eh",
            visibility: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
            ignoreMax: true
        },
        "bar2": {
          id: "bar2",
          mincolor: "#fbff00",
          maxcolor: "#6b6b6b",
          position: "top-outer",
          attribute: "absorcao",
          visibility: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER
        },
        "bar3": {
          id: "bar3",
          mincolor: "#fbff00",
          maxcolor: "#ff0000",
          position: "top-outer",
          attribute: "ef",
          visibility: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
          ignoreMax: true,
          ignoreMin: true
        },
        "bar4": {
          id: "bar4",
          mincolor: "#fbff00",
          maxcolor: "#a600ff",
          position: "bottom-outer",
          attribute: "karma",
          visibility: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER
        },
        "bar5": {
          id: "bar5",
          mincolor: "#fbff00",
          maxcolor: "#003399",
          position: "bottom-outer",
          attribute: "focus",
          visibility: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER
        }
      };
    }
  } else if (setting == "barra_npc") {
    if (actor.type == "NPC") {
      resources = {
        "bar1": {
            id: "bar1",
            mincolor: "#fbff00",
            maxcolor: "#00ff08",
            position: "bottom-outer",
            attribute: "eh_npc",
            visibility: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
            ignoreMax: true
        },
        "bar2": {
          id: "bar2",
          mincolor: "#fbff00",
          maxcolor: "#6b6b6b",
          position: "bottom-outer",
          attribute: "absorcao",
          visibility: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER
        },
        "bar3": {
          id: "bar3",
          mincolor: "#fbff00",
          maxcolor: "#ff0000",
          position: "bottom-outer",
          attribute: "ef_npc",
          visibility: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
          ignoreMax: true,
          ignoreMin: true
        },
        "bar4": {
          id: "bar4",
          mincolor: "#fbff00",
          maxcolor: "#a600ff",
          position: "bottom-outer",
          attribute: "karma_npc",
          visibility: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER
        }
      };
    }
  } else if (setting == "barra_both") {
    if (actor.type == "Personagem") {
      resources = {
        "bareh": {
            id: "bareh",
            mincolor: "#fbff00",
            maxcolor: "#00ff08",
            position: "top-outer",
            attribute: "eh",
            visibility: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
            ignoreMax: true
        },
        "barab": {
          id: "barab",
          mincolor: "#fbff00",
          maxcolor: "#6b6b6b",
          position: "top-outer",
          attribute: "absorcao",
          visibility: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER
        },
        "baref": {
          id: "baref",
          mincolor: "#fbff00",
          maxcolor: "#ff0000",
          position: "top-outer",
          attribute: "ef",
          visibility: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
          ignoreMax: true,
          ignoreMin: true
        },
        "barkm": {
          id: "barkm",
          mincolor: "#fbff00",
          maxcolor: "#a600ff",
          position: "bottom-outer",
          attribute: "karma",
          visibility: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER
        },
        "barfo": {
          id: "barfo",
          mincolor: "#fbff00",
          maxcolor: "#003399",
          position: "bottom-outer",
          attribute: "focus",
          visibility: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER
        }
      };
    } else if (actor.type == "NPC") {
      resources = {
        "bar1": {
            id: "bar1",
            mincolor: "#fbff00",
            maxcolor: "#00ff08",
            position: "bottom-outer",
            attribute: "eh_npc",
            visibility: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
            ignoreMax: true
        },
        "bar2": {
          id: "bar2",
          mincolor: "#fbff00",
          maxcolor: "#6b6b6b",
          position: "bottom-outer",
          attribute: "absorcao",
          visibility: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER
        },
        "bar3": {
          id: "bar3",
          mincolor: "#fbff00",
          maxcolor: "#ff0000",
          position: "bottom-outer",
          attribute: "ef_npc",
          visibility: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
          ignoreMax: true,
          ignoreMin: true
        },
        "bar4": {
          id: "bar4",
          mincolor: "#fbff00",
          maxcolor: "#a600ff",
          position: "bottom-outer",
          attribute: "karma_npc",
          visibility: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER
        }
      };
    }
  }
  return resources;
}

Hooks.on('tagmar_combate_roll', function (rollData) {
  if (game.user != rollData.user) return;
  let input_dano = $('#sidebar #chat #danos #soma_dano');
  let valor = 0;
  if (parseInt(input_dano.val())) valor = parseInt(input_dano.val());
  valor += rollData.dano;
  input_dano.val(valor);  
});

Hooks.once("dragRuler.ready", (SpeedProvider) => { 
  class TagmarSpeedProvider extends SpeedProvider {
      get colors() {
          return [
              {id: "walk", default: 0xFFFF00, name: "tagmar_rpg.speeds.walk"},
              {id: "dash", default: 0x00FF00, name: "tagmar_rpg.speeds.dash"},
              {id: "run", default: 0xFF8000, name: "tagmar_rpg.speeds.run"}
          ];
      }

      getRanges(token) {
        let baseSpeed = 0;
        if (token.document.elevation != 0) baseSpeed = token.actor.system.vbe;
        else baseSpeed = token.actor.system.vb; 

    const ranges = [
      {range: baseSpeed, color: "walk"},
      {range: baseSpeed / 2, color: "dash"}
    ];
          return ranges;
      }
  }

  dragRuler.registerSystem("tagmar_rpg", TagmarSpeedProvider);
});

Hooks.once('diceSoNiceReady', function (dice) {
  dice.addSystem({ id: game.system.id, name: "Tagmar RPG"}, true);
  dice.addDicePreset({
    type: 'd2',
    labels: [
      '1',
      'systems/'+game.system.id+'/assets/logodice.png'
    ],bumpMaps: [,
      'systems/'+game.system.id+'/assets/logodice_bump.png'
    ],
    system: game.system.id
  });
  dice.addDicePreset({
    type: 'd10',
    labels: [
      '1',
      '2', '3', '4', '5', '6', '7', '8', '9',
      'systems/'+game.system.id+'/assets/logodice.png'
    ],
    bumpMaps: [,,,,,,,,,
      'systems/'+game.system.id+'/assets/logodice_bump.png'
    ],
    system: game.system.id
  });
  dice.addDicePreset({
    type: 'd20',
    labels: [
      '1',
      '2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19',
      'systems/'+game.system.id+'/assets/logodice.png',
    ],
    bumpMaps: [,,,,,,,,,,,,,,,,,,,
      'systems/'+game.system.id+'/assets/logodice_bump.png'
    ],
    system: game.system.id
  });
  dice.addColorset({
    name: game.system.id,
    description: ' * Tagmar RPG * ',
    category: 'Colors',
    foreground: '#55420a',
    background: '#6b6b6b',
    outline: '#000000',
    texture: 'metal',
    material: 'metal',
    font: 'Verdana',
    default: true,
  });
  game.user.setFlag('dice-so-nice', 'appearance', { "global": {"system": "tagmar_rpg"}});
});

Hooks.on('renderChatMessage', function (message, jq, messageData) {
  const fonte_size = game.settings.get('tagmar_rpg', 'fonteMsg');
  const rola_desc = jq.find('.rola_desc');
  if (fonte_size > 0) $(rola_desc).css('font-size', fonte_size.toString()+'%');
  else $(rola_desc).css('font-size', '100%');
  jq.find('.showDesc').on('click', function () {
    if (jq.find('.rola_desc').css('display') == 'none') {
      jq.find('.rola_desc').css('display','block');
      jq.find('.showDesc').html('Descrição: <i class="far fa-eye"></i>');
    }
    else {
      jq.find('.rola_desc').css('display','none');
      jq.find('.showDesc').html('Descrição: <i class="far fa-eye-slash"></i>');
    }
  });
  jq.find('.aplicarDano').click(function (event) {
    let tokens = canvas.tokens.controlled;
    if (tokens.length == 0) return ui.notifications.warn('Nenhum token selecionado.');
    for (let token of tokens) {
      let dano = $(event.currentTarget).data('dano');
      let cura = $(event.currentTarget).data('cura');
      let critico = $(event.currentTarget).data('critico');
      token.actor._aplicarDano({"valor": dano, "isCura": cura, "isCritico": critico}, token);
    }
  });
  // Imagem do personagem no chat
  if (!messageData.message.speaker.actor) return;
  let sender = game.actors.get(messageData.message.speaker.actor);
  jq.find('.message-sender').html(`
  <h4><img src="${sender.img}" width=40px height=40px style="border-radius:8px;vertical-align: middle;margin-right:10px;"/>${sender.name}</h4>
  `);
});

Hooks.on('tagmar_Critico', async function (coluna, tabela_resol, user, actor, tipo, falha) {
  if (game.user !== user) return;
  await rolarCritico(coluna, tabela_resol, user, actor, tipo, falha);
});

async function rolarCritico(coluna, tabela_resol, user, actor, tipo, falha) {
  let roll = new Roll('1d20');
  await roll.evaluate();
  let result = roll.total;
  let conteudo = "<h1 class='mediaeval rola' style='text-align:center;'>Rolagem do Crítico</h1><br><p class='mediaeval rola_desc'>";
  let table = "";
  let col_tab = tabela_resol.filter(h => h[0] == coluna);
  let resultado = col_tab[0][result];
  if (resultado == "cinza") {
    conteudo = conteudo + `<h1 class='mediaeval rola' style='color: black; text-align:center;background-color:#bfbfbf;'>Cinza</h1>`;
    if (falha) {
      table = table + `<ul style="list-style-type: disc;" class="rola_desc">
        <li class="mediaeval"><b>Falha:</b> Um golpe ruim. Erra o adversário.</li>
      </ul>`;
    } else {
      table = table + `<ul style="list-style-type: disc;" class="rola_desc">`;
      if (tipo != "") {
        table = table + `<li class="mediaeval"><b>Combate Desarmado:</b> 100%. Nocaute, oponente fica desmaiado por 1 hora e incapacitado por 2 dias.</li>
                        <li class="mediaeval"><b>Garras/Mordida:</b> Força do golpe rasga a carótida.</li>
                        <li class="mediaeval"><b>Corte:</b> O Oponente é decapitado.</li>
                        <li class="mediaeval"><b>Esmagamento:</b> Afundamento torácico destrói os pulmões.</li>
                        <li class="mediaeval"><b>Penetração:</b> Golpe perfura o coração.</li>`;
      } else {
        table = table + `<li class="mediaeval"><b>Magia:</b> Impacto total da magia mata o adversário.</li>`;
      }
      table = table + `<li class="mediaeval"><b>10 a 50 vezes o peso do atacante:</b> 100%. Golpe paralisa por uma rodada causando um ferimento fatal e impondo um ajuste de – 10, depois de 7 rodadas o oponente morre.</li>
        <li class="mediaeval"><b>Peso acima de 50 vezes:</b> 100%. Ferimento no oponente reduz o número de ataques pela metade (se for só 1, passa a ser um a cada duas rodadas).</li>
        </ul>`;
    }
  } else if (resultado == "roxo") {
    conteudo = conteudo + "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#0000ff;'>Azul Escuro</h1>";
    if (falha) {
      table = table + `<ul style="list-style-type: disc;" class="rola_desc">
        <li class="mediaeval"><b>Falha:</b> Descontrole dá um ajuste de – 3 nas próximas duas rodadas.</li>
      </ul>`;
    } else {
      table = table + `<ul style="list-style-type: disc;" class="rola_desc">`;
      if (tipo != "") {
        table = table + `<li class="mediaeval"><b>Combate Desarmado:</b> 100%. Nocaute, oponente fica desmaiado por meia hora.</li>
                        <li class="mediaeval"><b>Garras/Mordida:</b> 100%. Ataque no olho arranca o globo ocular e paralisa o adversário por duas rodadas.</li>
                        <li class="mediaeval"><b>Corte:</b> 100%. Corte vaza o olho. A dor paralisa o adversário por duas rodadas.</li>
                        <li class="mediaeval"><b>Esmagamento:</b> 100%. Golpe no pulso destrói a articulação, obrigando a amputação em 2 dias. O inimigo é paralisado por duas rodadas.</li>
                        <li class="mediaeval"><b>Penetração:</b> 100%. Estocada na mão, inutiliza permanentemente. A dor paralisa o inimigo por duas rodadas.</li>`;
      } else {
        table = table + `<li class="mediaeval"><b>Magia:</b> 100% Impacto no pé do adversário o destrói, e ele fica paralisado por duas rodadas.</li>`;
      }
      table = table + `<li class="mediaeval"><b>10 a 50 vezes o peso do atacante:</b> 100%. Ferimento no oponente reduz o número de ataques pela metade (se for só 1, passa a ser um a cada duas rodadas).</li>
        <li class="mediaeval"><b>Peso acima de 50 vezes:</b> 100%. Golpe paralisa o oponente por uma rodada e impõe um ajuste de – 5 por 10 rodadas.</li>
        </ul>`;
    }
  } else if (resultado == "azul") {
    conteudo = conteudo + "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#00a1e8;'>Azul</h1>";
    if (falha) {
      table = table + `<ul style="list-style-type: disc;" class="rola_desc">
        <li class="mediaeval"><b>Falha:</b> Descontrole dá um ajuste de – 4 nas próximas 3 rodadas.</li>
      </ul>`;
    } else {
      table = table + `<ul style="list-style-type: disc;" class="rola_desc">`;
      if (tipo != "") {
        table = table + `<li class="mediaeval"><b>Combate Desarmado:</b> 100%. Oponente tonto não ataca por duas rodadas.</li>
                        <li class="mediaeval"><b>Garras/Mordida:</b> 100%. Ataque arranca uma orelha e paralisa o adversário por uma rodada.</li>
                        <li class="mediaeval"><b>Corte:</b> 100%. Corte grande no músculo inutiliza um braço por uma semana.</li>
                        <li class="mediaeval"><b>Esmagamento:</b> 100%. Pancada na cabeça. Elmo se parte (caso não seja mágico). Se não tiver Elmo entra em coma por 2 dias.</li>
                        <li class="mediaeval"><b>Penetração:</b> 100%. Perfura o músculo do braço e o inutiliza por uma semana.</li>`;
      } else {
        table = table + `<li class="mediaeval"><b>Magia:</b> 100%. O poder da magia leva o inimigo a inconsciência por um dia.</li>`;
      }
      table = table + `<li class="mediaeval"><b>10 a 50 vezes o peso do atacante:</b> 100%. Golpe paralisa o oponente por duas rodadas e impõe um ajuste de – 5 por 10 rodadas.</li>
        <li class="mediaeval"><b>Peso acima de 50 vezes:</b> 100%. Ferimento desnorteia o oponente impedindo-o de atacar por uma rodada.</li>
        </ul>`;
    }
  } else if (resultado == "vermelho") {
    conteudo = conteudo + "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#ff0000;'>Vermelho</h1>";
    if (falha) {
      table = table + `<ul style="list-style-type: disc;" class="rola_desc">
        <li class="mediaeval"><b>Falha:</b> Ataque precipitado causa 25 % de dano em si mesmo.</li>
      </ul>`;
    } else {
      table = table + `<ul style="list-style-type: disc;" class="rola_desc">`;
      if (tipo != "") {
        table = table + `<li class="mediaeval"><b>Combate Desarmado:</b> 75%. Golpe desarma o oponente e o derruba, a arma cai a 3m dele.</li>
                        <li class="mediaeval"><b>Garras/Mordida:</b> 75%. Ataque rasga o braço causando um ajuste de - 8 por 2 dias.</li>
                        <li class="mediaeval"><b>Corte:</b> 75%. Corte mediano no músculo inutiliza um braço por 2 dias.</li>
                        <li class="mediaeval"><b>Esmagamento:</b> 75%. Pancada na cabeça. Elmo se parte (caso não seja mágico). Se não tiver Elmo fica desacordado por 2 horas e incapacito por 2 dias.</li>
                        <li class="mediaeval"><b>Penetração:</b> 75%. Perfura o músculo do braço e o inutiliza por 2 dias.</li>`;
      } else {
        table = table + `<li class="mediaeval"><b>Magia:</b> 75%. O poder da magia leva o inimigo a inconsciência por meia hora.</li>`;
      }
      table = table + `<li class="mediaeval"><b>10 a 50 vezes o peso do atacante:</b> 75%. Golpe paralisa o oponente por uma rodada e impõe um ajuste de – 5 por 10 rodadas.</li>
        <li class="mediaeval"><b>Peso acima de 50 vezes:</b> 75%. Golpe reduz a velocidade base à metade e o impede de realizar sua próxima ação.</li>
        </ul>`;
    }
  } else if (resultado == "laranja") {
    conteudo = conteudo + "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#ff9900;'>Laranja</h1>";
    if (falha) {
      table = table + `<ul style="list-style-type: disc;" class="rola_desc">
        <li class="mediaeval"><b>Falha:</b> Ataque desastroso causa 50 % de dano em si mesmo.</li>
      </ul>`;
    } else {
      table = table + `<ul style="list-style-type: disc;" class="rola_desc">`;
      if (tipo != "") {
        table = table + `<li class="mediaeval"><b>Combate Desarmado:</b> 75%. A dor ou falta de ar deixam o oponente grogue. Ajuste de - 5 por 4 rodadas.</li>
                        <li class="mediaeval"><b>Garras/Mordida:</b> 75%. A ferocidade do golpe derruba o adversário impedindo de atacar nas próximas 3 rodadas.</li>
                        <li class="mediaeval"><b>Corte:</b> 75%. Corte na cabeça põe adversário em coma por 1 dia se ele não tiver usando elmo.</li>
                        <li class="mediaeval"><b>Esmagamento:</b> 75%. Escudo do inimigo se quebra (caso não seja mágico). Na ausência deste o braço quebra (cura em um mês).</li>
                        <li class="mediaeval"><b>Penetração:</b> 75%. Golpe no tronco derruba o adversário se estiver usando escudo. Caso contrário incapacita-o por 2 dias.</li>`;
      } else {
        table = table + `<li class="mediaeval"><b>Magia:</b> 75%. O potente impacto paralisa o adversário, impedindo de atacar nas próximas 3 rodadas.</li>`;
      }
      table = table + `<li class="mediaeval"><b>10 a 50 vezes o peso do atacante:</b> 75%. Ferimento desnorteia o oponente impedindo-o de atacar por duas rodadas.</li>
        <li class="mediaeval"><b>Peso acima de 50 vezes:</b> 75%. Golpe reduz a velocidade base à metade e impõe ao adversário um ajuste de – 3 por 5 rodadas.</li>
        </ul>`;
    }
  } else if (resultado == "amarelo") {
    conteudo = conteudo + "<h1 class='mediaeval rola' style='color: black; text-align:center;background-color:#ffff00;'>Amarelo</h1>";
    if (falha) {
      table = table + `<ul style="list-style-type: disc;" class="rola_desc">
        <li class="mediaeval"><b>Falha:</b> Sua arma escapa da sua mão, caindo a 3 metros de distância.</li>
      </ul>`;
    } else {
      table = table + `<ul style="list-style-type: disc;" class="rola_desc">`;
      if (tipo != "") {
        table = table + `<li class="mediaeval"><b>Combate Desarmado:</b> 50%. Inchaço e sangramento facial atrapalham a visão. Ajuste de - 3 por 6 rodadas.</li>
                        <li class="mediaeval"><b>Garras/Mordida:</b> 50%. Feroz ataque na mão desarma o inimigo.</li>
                        <li class="mediaeval"><b>Corte:</b> 50%. Com um belo golpe, não só atinge como desarma o inimigo.</li>
                        <li class="mediaeval"><b>Esmagamento:</b> 50%. Golpe no tórax derruba o adversário, que deixa cair o que tiver segurando.</li>
                        <li class="mediaeval"><b>Penetração:</b> 50% Estocada no peito paralisa o adversário nas próximas 2 rodadas.</li>`;
      } else {
        table = table + `<li class="mediaeval"><b>Magia:</b> 50%. A força da magia arremessa o adversário a 2 metros de distância, e ele deixa cair sua arma.</li>`;
      }
      table = table + `<li class="mediaeval"><b>10 a 50 vezes o peso do atacante:</b> 50%. Golpe faz com que o adversário se atrapalhe, impedindo-o de realizar sua próxima ação.</li>
        <li class="mediaeval"><b>Peso acima de 50 vezes:</b> 50%. Golpe impõe ao adversário um ajuste de – 3 por 5 rodadas.</li>
        </ul>`;
    }
  } else if (resultado == "branco") {
    conteudo = conteudo + "<h1 class='mediaeval rola' style='color: black; text-align:center;background-color:white;'>Branco</h1>";
    if (falha) {
      table = table + `<ul style="list-style-type: disc;" class="rola_desc">
        <li class="mediaeval"><b>Falha:</b> Tropeção o impede de realizar seu próximo ataque.</li>
      </ul>`;
    } else {
      table = table + `<ul style="list-style-type: disc;" class="rola_desc">`;
      if (tipo != "") {
        table = table + `<li class="mediaeval"><b>Combate Desarmado:</b> 50%. Golpe desarma o oponente, e a arma cai a 2 m dele.</li>
                        <li class="mediaeval"><b>Garras/Mordida:</b> 50%. Rasgo na mão impede o adversário de realizar seu próximo ataque.</li>
                        <li class="mediaeval"><b>Corte:</b> 50%. Corte no ombro, impõe um ajuste de – 4 por 1 dia.</li>
                        <li class="mediaeval"><b>Esmagamento:</b> 50%. Golpe duro no ombro, paralisa o oponente na próxima rodada.</li>
                        <li class="mediaeval"><b>Penetração:</b> 50%. Penetração causa ajuste de – 4 por 2 dias. Se for flecha o ajuste é de - 6 até que a mesma seja retirada.</li>`;
      } else {
        table = table + `<li class="mediaeval"><b>Magia:</b> 50%. O poder da magia atordoa o inimigo, impedindo de realizar seu próximo ataque.</li>`;
      }
      table = table + `<li class="mediaeval"><b>10 a 50 vezes o peso do atacante:</b> 50%. Golpe reduz a velocidade base à metade e impõe ao adversário um ajuste de – 3 por 5 rodadas.</li>
        <li class="mediaeval"><b>Peso acima de 50 vezes:</b> 50%. Golpe impõe ao adversário um ajuste de – 3 por 3 rodadas.</li>
        </ul>`;
    }
  } else if (resultado == "verde") {
    conteudo = conteudo + "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#91cf50;'>Verde</h1>";
    if (falha) {
      table = table + `<ul style="list-style-type: disc;" class="rola_desc">
        <li class="mediaeval"><b>Falha:</b> Faça um ataque no seu companheiro mais próximo.</li>
      </ul>`;
    } else {
      table = table + `<ul style="list-style-type: disc;" class="rola_desc">`;
      if (tipo != "") {
        table = table + `<li class="mediaeval"><b>Combate Desarmado:</b> 25%. Golpe no ouvido causa desorientação. Ajuste de -3 por 3 rodadas.</li>
                        <li class="mediaeval"><b>Garras/Mordida:</b> 25%. Ataque desequilibra o inimigo, levando-o a cair e perder uma rodada.</li>
                        <li class="mediaeval"><b>Corte:</b> 25%. Corte leve no músculo do braço dá um ajuste de – 4 na próxima rodada.</li>
                        <li class="mediaeval"><b>Esmagamento:</b> 25%. Golpe no ombro desequilibra o adversário na próxima rodada, dando um ajuste de – 4.</li>
                        <li class="mediaeval"><b>Penetração:</b> 25% Estocada na perna reduz o movimento à metade e causa um ajuste de – 2 por 1 hora.</li>`;
      } else {
        table = table + `<li class="mediaeval"><b>Magia:</b> 25%. A magia foi evocada com maestria. Economizando 1 de karma OU causando +2 na FA.</li>`;
      }
      table = table + `<li class="mediaeval"><b>10 a 50 vezes o peso do atacante:</b> 25%. Golpe impõe ao adversário um ajuste de - 3 por 5 rodadas.</li>
        <li class="mediaeval"><b>Peso acima de 50 vezes:</b> 25%. Ataque preciso causa um ajuste de –5 no próximo ataque.</li>
        </ul>`;
    }
  }
  conteudo = conteudo + table + "</p>";
  if (game.settings.get('tagmar_rpg', 'dadosColoridos')) {
    dadosColoridos(resultado, roll);
  }
  roll.toMessage({
    user: user,
    speaker: ChatMessage.getSpeaker({ actor: actor }),
    flavor: conteudo
  });
}

document.addEventListener('mousedown', function (event) {
  if ((event.button == 1 || event.button == 4) && game.user.isGM) {
    const hoveredToken = canvas.tokens.hover;
    if (hoveredToken !== null) {
      event.preventDefault();
      if (!hoveredToken.isTargeted) hoveredToken.setTarget(true, game.user, true, false);
      else hoveredToken.setTarget(false);
    }
  }
});

Hooks.on('targetToken', function (user, token, targeted) {
  if (!(token.actor.type === "Personagem" || token.actor.type === "NPC")) return;
  const setting_target = game.settings.get("tagmar_rpg", "autoTarget");
  if (targeted && setting_target == "yes") setInf_ataque(token, user);
});

function setInf_ataque(target_token, user) {
  if (user == game.user) {
    const speaker = ChatMessage.getSpeaker();
    let actor = game.actors.get(speaker.actor);
    if (!actor) return ui.notifications.warn("Selecione um Token para setar Def. Oponente!");
    if (actor.type == "Inventario") return ui.notifications.error("Não é possível atacar com um Inventário.");
    actor.update({
      'system.inf_ataque.cat_def': target_token.actor.system.d_ativa.categoria,
      'system.inf_ataque.valor_def': target_token.actor.system.d_ativa.valor
    });
    let chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({
          actor: actor
        })
    };
    let target_def = target_token.actor.system.d_ativa;
    chatData.content = "<p><img src='"+ actor.img +"' style='float: left; margin-left: auto; margin-right: auto; width: 40%;border: 0px;' /><img src='systems/tagmar_rpg/assets/TAGMAR FOUNDRY.png' style='float: left;margin-top:25px; margin-left: auto; margin-right: auto; width: 20%;border: 0px;'/><img src='"+ target_token.actor.img +"' style='float: left; width: 40%; margin-left: auto; margin-right: auto;border: 0px;' /></p><p class='rola_desc mediaeval' style='display: block;margin-left:auto;margin-right:auto;margin-top:60%;'>"+ "<b>Agressor: </b>" + actor.name + "<br><b>Bônus de Ataque: </b>"+ String(actor.system.inf_ataque.bonus) +"<br><b>Oponente: </b>" + target_token.actor.name  +"<br><b>Def. Oponente: </b>"+ target_def.categoria + String(target_def.valor) +"</p>";
    ChatMessage.create(chatData);
  }
}

Hooks.on('renderUserConfig', function (UserConfig, html , User) {
  let actors = User.actors;
  let lista = html.find('.actor');
  lista.each(function (index, li) {
    let actor_id = $(li).data('actorId');
    let actor = actors.find(a => a.id == actor_id);
    if (actor.type != "Personagem") $(li).addClass('esconde');
  });
});

Hooks.on('renderActorDirectory', function (actordirectory, html, user) {
  if (user.user.isGM) return;
  let list = html.find('.actor');
  list.each(function (index, li) {
    let actor = actordirectory.documents.find(a => a._id == $(li).data('documentId'));
    if (actor.type == "Inventario") $(li).addClass('esconde');
  });
});

Hooks.on("getSceneControlButtons", (controls) => {
  const bar = controls.find(c => c.name === "token");
  if (!game.user.isGM && typeof(game.user.character) != 'undefined') {
    bar.tools.push({
      name: "Centralizar Canvas no Token",
      icon: "fas fa-anchor",
      title: "Centralizar Canvas no Token",
      onClick: async () => centralizaToken(),
      button: true
    });
  } 
  bar.tools.push({
    name: "Rolar direto na tabela ou Teste de Resistência",
    icon: "fas fa-dice-d20",
    title: "Rolagem na Tabela",
    onClick: async () => rollDialog(),
    button: true
  });
  bar.tools.push({
    name: "Tabela de Resolução de Ações",
    icon: "fas fa-border-all",
    title: "Tabela de Resolução de Ações",
    onClick: () => tabelaAcoes(),
    button: true
  });
  bar.tools.push({
    name: "Tabela de Teste de Resistência Física / Resistência à Magia",
    icon: "fas fa-table",
    title: "Tabela de Teste de Resistência Física / Resistência à Magia",
    onClick: () => tabelaResistencia(),
    button: true
  });
});

function tabelaResistencia () {
  let dialogContent = `<table class="mediaeval" style="text-align:center;">
    <tr>
      <td></td>
      <th>FORÇA DE ATAQUE</th>
    </tr>
    <tr>
      <th>
      <p style="writing-mode: vertical-rl;text-orientation: upright;">FORÇA DE DEFESA</p>
      </th>
      <td>
        <table class="tableResist"></table>
      </td>
    </tr>
  </table>`;
  let dialog = new Dialog({
    title: "Tabela de Teste de Resistência Física / Resistência à Magia",
    content: dialogContent,
    buttons: {},
    render: (html) => {
      let table_res = html.find('.tableResist');
      let table_lines = "<tr>";
      for (let l = 0; l <= 20; l++) {
        if (l == 0) table_lines += `<th></th>`;
        else table_lines += `<th style='background-color:black;color:white;'>${l}</th>`;
      }
      table_lines += "</tr>";
      let lines = 0;
      for(let linha of table_resFisMag) {
        table_lines += "<tr>";
        linha.forEach(function (l, index) {
          let style = "border: 1px solid black;";
          if (table_resFisMag.indexOf(linha) % 2 == 0) style += "background-color:white;"
          if ((l == 2 || l == 20) && index != 0) style += "background-color:white; border-width:0;";
          if (index == 0) table_lines += `<th style='${style}'>${l}</th>`;
          else table_lines += `<td class="colu-${index} line-${lines}" style='${style}'>${l}</td>`;
        });
        lines++;
        table_lines += "</tr>";
      }
      table_res.append(table_lines);
      table_res.find('td').mouseenter(function (event) {
        let classes = $(event.currentTarget).attr('class').split(/\s+/);
        $('.'+classes[0]).css('color', 'RebeccaPurple');
        $('.'+classes[1]).css('color', 'RebeccaPurple');
        $('.'+classes[0]).css('font-weight', 'bold');
        $('.'+classes[1]).css('font-weight', 'bold');
      });

      table_res.find('td').mouseleave(function (event) {
        let classes = $(event.currentTarget).attr('class').split(/\s+/);
        $('.'+classes[0]).css('color', 'black');
        $('.'+classes[1]).css('color', 'black');
        $('.'+classes[0]).css('font-weight', 'normal');
        $('.'+classes[1]).css('font-weight', 'normal');
      });
    }
  },{width:800, height:700});
  dialog.render(true);
}

function tabelaAcoes () {
  let dialogContent = `<table class="tabelaAcoes mediaeval"></table>`;
  let dialog = new Dialog({
    title: "Tabela de Resolução de Acões",
    content: dialogContent,
    buttons: {},
    render: (html) => {
      let tabela = html.find(".tabelaAcoes");
      let table_head = "<tr>";
      let table_body = "";
      for(let tab of tabela_resol) {
        table_head += `<th style="text-align:center;border: 1px solid black;background-color:black;color:white;">${tab[0]}</th>`;
      }
      table_head += "</tr>";
      for(let linha = 1; linha <= 20; linha++) {
        table_body += "<tr>";
        for(let x=0; x < tabela_resol.length; x++) {
          let style = "";
          if (tabela_resol[x][linha] == "verde") style = "style='background-color:#91cf50;text-align:center;border: 1px solid black;'";
          if (tabela_resol[x][linha] == "branco") style = "style='background-color:white;text-align:center;border: 1px solid black;'";
          if (tabela_resol[x][linha] == "amarelo") style = "style='background-color:#ffff00;text-align:center;border: 1px solid black;'";
          if (tabela_resol[x][linha] == "laranja") style = "style='background-color:#ff9900;text-align:center;border: 1px solid black;'";
          if (tabela_resol[x][linha] == "vermelho") style = "style='background-color:#ff0000;text-align:center;color:white;border: 1px solid black;'";
          if (tabela_resol[x][linha] == "azul") style = "style='background-color:#00a1e8;text-align:center;color:white;border: 1px solid black;'";
          if (tabela_resol[x][linha] == "roxo") style = "style='background-color:#0000ff;text-align:center;color:white;border: 1px solid black;'";
          if (tabela_resol[x][linha] == "cinza") style = "style='background-color:#bfbfbf;text-align:center;border: 1px solid black;'";
          table_body += `<td class="colu-${x}" ${style}>${linha}</td>`;
        }
        table_body += "</tr>";
      }
      
      tabela.append(table_head+table_body);

      tabela.find("td").mouseenter( function (event) {
        $('.'+$(event.currentTarget).attr('class')).css('font-weight', 'bold');
        $('.'+$(event.currentTarget).attr('class')).css('border-color', 'RebeccaPurple');
      });
      tabela.find("td").mouseleave(function (event) {
        $('.'+$(event.currentTarget).attr('class')).css('font-weight', 'normal');
        $('.'+$(event.currentTarget).attr('class')).css('border-color', 'black');
      });
    }
  },{width:800, height:580});
  dialog.render(true);
}

async function centralizaToken () {
  if (canvas.tokens.controlled.length) {
    await canvas.animatePan({x: canvas.tokens.controlled[0].position.x, y: canvas.tokens.controlled[0].position.y});
  } else if (canvas.tokens.ownedTokens.length) {
    await canvas.animatePan({x: canvas.tokens.ownedTokens[0].position.x, y: canvas.tokens.ownedTokens[0].position.y});
    canvas.tokens.controlAll();
  } else {
    ui.notifications.warn("Você não possui nenhum token na cena!");
  }
}

async function rollDialog() {
  $.get("systems/tagmar_rpg/templates/roll_dialog.hbs", function (data) {
    let dialog = new Dialog({
      title: "Rolagem na Tabela",
      content: data,
      buttons: {},
      render: (html) => {
        html.find(".rollResist").click(async function (event) {
          let resist = html.find('.ip_resist').val();
          let f_ataque = html.find(".ip_fAtaque").val();
          if (resist >= -2 && f_ataque > 0) await rollResistencia(resist, f_ataque);
          html.find('.ip_resist').val("");
          html.find(".ip_fAtaque").val("");
        });
        html.find(".rollTabela").click(async function (event) {
          let coluna = html.find(".ip_coluna").val();
          if (coluna >= -7 && coluna <= 20) await rollTabela(coluna);
          else if (coluna > 20) {
            while (coluna > 20) {
              await rollTabela(20);
              coluna -= 20;
            }
            if (coluna > 0) await rollTabela(coluna);
          }
          html.find(".ip_coluna").val("");
        });
      }
    });
    dialog.render(true);
  }).fail(function (error) {
    return ui.notifications.error(`Ocorreu um erro! Verifique sua conexão com o servidor.  ${error.status} - ${error.statusText}`);
  });
}

async function rollTabela(colunaR) {
  let r = new Roll("1d20");
  let resultado = "";
  let PrintResult = "";
  await r.evaluate();
  var Dresult = r.total;
  let coluna_table = tabela_resol.find(h => h[0] == colunaR);
  resultado = coluna_table[Dresult];
  if (resultado == "verde") PrintResult = "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#91cf50;'>Verde - Falha</h1>";
  else if (resultado == "branco") PrintResult = "<h1 class='mediaeval rola' style='color: black; text-align:center;background-color:white;'>Branco - Rotineiro</h1>";
  else if (resultado == "amarelo") PrintResult = "<h1 class='mediaeval rola' style='color: black; text-align:center;background-color:#ffff00;'>Amarelo - Fácil</h1>";
  else if (resultado == "laranja") PrintResult = "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#ff9900;'>Laranja - Médio</h1>";
  else if (resultado == "vermelho") PrintResult = "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#ff0000;'>Vermelho - Difícil</h1>";
  else if (resultado == "azul" ) PrintResult = "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#00a1e8;'>Azul - Muito Difícil</h1>";
  else if (resultado == "roxo") PrintResult = "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#0000ff;'>Azul Escuro - Absurdo</h1>";
  else if (resultado == "cinza") PrintResult = "<h1 class='mediaeval rola' style='color: black; text-align:center;background-color:#bfbfbf;'>Cinza - Impossível</h1>";
  let coluna = "<h4 class='mediaeval rola'>Coluna:" + coluna_table[0] + "</h4>";
  if (game.settings.get('tagmar_rpg', 'dadosColoridos')) {
    dadosColoridos(resultado, r);
  }
  r.toMessage({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ alias: game.user.name, actor: null }),
      flavor: `<h2 class='mediaeval rola' style='text-align:center;'>Rolagem Resolução de Ações</h2>${coluna}${PrintResult}`
  });
}

async function rollResistencia(resist, f_ataque) {
  let forcAtaque = f_ataque;
  let valorDef = resist;
  let def_ataq = valorDef - forcAtaque;
  let stringSucesso = "";
  let valorSucess = 0;
  if ((valorDef >= -2 && valorDef <= 20) && (forcAtaque >= 1 && forcAtaque <= 20)) {
    let coluna = table_resFisMag.find(col => col[0] == valorDef);
    valorSucess = coluna[forcAtaque];
  } else {
    if (def_ataq == 0) valorSucess = 11;
    else if (def_ataq == 1) valorSucess = 10;
    else if (def_ataq == 2) valorSucess = 9;
    else if (def_ataq == 3) valorSucess = 8;
    else if (def_ataq == 4 || def_ataq == 5) valorSucess = 7;
    else if (def_ataq == 6 || def_ataq == 7) valorSucess = 6;
    else if (def_ataq == 8 || def_ataq == 9) valorSucess = 5;
    else if (def_ataq == 10 || def_ataq == 11) valorSucess = 4;
    else if (def_ataq == 12 || def_ataq == 13) valorSucess = 3;
    else if (def_ataq == 14 || def_ataq == 15) valorSucess = 2;
    else if (def_ataq >= 16) valorSucess = 1;
    else if (def_ataq == -1) valorSucess = 11;
    else if (def_ataq == -2) valorSucess = 12;
    else if (def_ataq == -3) valorSucess = 13;
    else if (def_ataq == -4 || def_ataq == -5) valorSucess = 14;
    else if (def_ataq == -6 || def_ataq == -7) valorSucess = 15;
    else if (def_ataq == -8 || def_ataq == -9) valorSucess = 16;
    else if (def_ataq == -10 || def_ataq == -11) valorSucess = 17;
    else if (def_ataq == -12 || def_ataq == -13) valorSucess = 18;
    else if (def_ataq == -14 || def_ataq == -15) valorSucess = 19;
    else if (def_ataq <= -16) valorSucess = 20;
  }
  const r = new Roll("1d20");
  await r.evaluate();
  const Dresult = r.total;
  if ((Dresult >= valorSucess || Dresult == 20) && Dresult > 1) { // Sucesso
      stringSucesso = "<h1 class='mediaeval rola' style='text-align:center; color: white;background-color:#00a1e8;'>SUCESSO</h1>";
      if (game.settings.get('tagmar_rpg', 'dadosColoridos')) {
        dadosColoridos("azul", r);
      }
  } else {    // Insucesso
      stringSucesso = "<h1 class='mediaeval rola' style='text-align:center; color: white;background-color:#ff0000;'>FRACASSO</h1>";
      if (game.settings.get('tagmar_rpg', 'dadosColoridos')) {
        dadosColoridos("vermelho", r);
      }
  }  
  r.toMessage({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ alias: game.user.name, actor: null }),
      flavor: `<h2 class="mediaeval rola" style="text-align:center;">Teste de Resistência</h2><h3 class="mediaeval rola"> Força Ataque: ${forcAtaque}</h3><h3 class="mediaeval rola">Resistência: ${valorDef}</h3>${stringSucesso}`
  });
}

Hooks.on("renderSidebarTab", async (object, html) => {
  if (object instanceof Settings) {
    const details = html.find("#game-details");
    const tgDetails = document.createElement("li");
    tgDetails.classList.add("donation-sistema");
    tgDetails.innerHTML = "Tagmar RPG no Foundry Vtt <span><a title='Acesse nosso Youtube.' href='https://www.youtube.com/channel/UCDyR_0eg3TjV5r5cOUqQaSQ'><i class='fab fa-youtube-square'></i></a></span>";
    details.append(tgDetails);
  }
});

Hooks.on("renderCombatTracker",async function (combatTracker, html) {
  if (combatTracker.combats.length > 0) {
    if (!combatTracker.options.popOut && game.settings.get('tagmar_rpg', 'popOutCombat')) combatTracker.renderPopout();
  }
  if (!game.user.isGM) return;
  const combats = combatTracker.combats;
  if (combats.length > 0) {
    let header = html.find("div[class='encounter-controls flexrow combat']");
    header.append(`<a class="combat-button setarIniciativa" title="Somar Iniciativa para vários combatentes.">
      <i class="fas fa-exchange-alt"></i>
      </a>`);
    let currentCombat = combatTracker.viewed;
    let combatants = currentCombat.combatants;
    $('.setarIniciativa').on('click', function (event) {
      let dialogContent = `<div class="mediaeval">
        <ul class="combatates" style="list-style-type:none;"></ul>
        <label for="valor">Somar na Iniciativa:</label>
        <input type="number" name="valor" id="valor" value="0" style="width:50px;margin-left:10px;text-align:center;margin-bottom:10px;" class="valorIniciativa"/>
      </div>`;
      let dialog = new Dialog({
        title: "Somar Iniciativa",
        content: dialogContent,
        buttons: {
          vai: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Somar Iniciativa',
            callback: html => {
              let valor = html.find('.valorIniciativa').val();
              $(".mudar:checked").each(async function (index, c) {
                let combatId = $(c).val();
                let combatante = currentCombat.combatants.find(c => c.id == combatId);
                let iniciativaAtual = combatante.initiative;
                valor = parseInt(valor);
                await currentCombat.setInitiative(combatId, parseInt(iniciativaAtual + valor));
              });
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancelar'
          }
        },
        default: "cancel",
        render: html => {
          combatants.forEach(function (combatant) {
            html.find('.combatates').append(`<li style="margin-bottom:5px;"><input type="checkbox" class="mudar" value="${combatant.id}"/> ${combatant.name}</li>`);
          });
        }
      });
      dialog.render(true);
    });
  }
});

async function createTagmarMacro(data, slot) {
  if (data.type !== "Item") return;
  let data_a = data.uuid.split('.');
  if (data_a.length != 4) {
    return ui.notifications.error("Verifique se o token está linkado com a ficha.");
  }
  let item_id = data_a[data_a.length-1];
  let actor_id = data_a[1];
  const item = game.actors.get(actor_id).items.get(item_id);
  if (typeof item == "undefined") {
    return ui.notifications.error("Não foi possível encontrar o item.");
  }
  const command = 'game.tagmar.rollItemMacro("'+item.name+'");';
  let macro = game.macros.find(m => (m.name == item.name) && (m.command == command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: {
        "tagmar.itemMacro": true
      }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemName
 * @return {Promise}
 */
function rollItemMacro(itemName, extra) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  const item = actor ? actor.items.find(i => i.name === itemName && i.type != "Pertence" && i.type != "Transporte" && i.type != "Defesa") : null;
  if (!item) return ui.notifications.warn(`O personagem selecionado não possui um Item chamado ${itemName}`);
  // Trigger the item roll
  return item.rollTagmarItem();
}
