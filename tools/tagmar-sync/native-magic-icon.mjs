const normalize = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/gi, " ")
  .trim()
  .toLocaleLowerCase("pt-BR");

const icons = {
  fire: "icons/magic/fire/projectile-fireball-orange.webp",
  lightning: "icons/magic/lightning/bolt-forked-blue-yellow.webp",
  water: "icons/magic/water/water-drop-swirl-blue.webp",
  ice: "icons/magic/water/snowflake-ice-blue-white.webp",
  air: "icons/magic/air/air-burst-spiral-blue-gray.webp",
  earth: "icons/magic/earth/barrier-stone-brown-green.webp",
  nature: "icons/magic/nature/leaf-glow-green.webp",
  animal: "icons/magic/nature/wolf-paw-glow-small-teal-blue.webp",
  healing: "icons/magic/life/heart-cross-green.webp",
  holy: "icons/magic/holy/prayer-hands-glowing-yellow.webp",
  unholy: "icons/magic/unholy/orb-hands-pink.webp",
  death: "icons/magic/death/skull-energy-light-white.webp",
  protection: "icons/magic/defensive/shield-barrier-blue.webp",
  illusion: "icons/magic/defensive/illusion-evasion-echo-purple.webp",
  perception: "icons/magic/perception/eye-ringed-green.webp",
  mind: "icons/magic/control/hypnosis-mesmerism-eye.webp",
  movement: "icons/magic/movement/portal-vortex-orange.webp",
  flight: "icons/magic/control/buff-flight-wings-blue.webp",
  sonic: "icons/magic/sonic/projectile-sound-rings-wave.webp",
  time: "icons/magic/time/hourglass-tilted-glowing-gold.webp",
  light: "icons/magic/light/beam-rays-blue.webp",
  transform: "icons/magic/control/silhouette-grow-shrink-tan.webp",
  generic: "icons/magic/symbols/runes-carved-stone-purple.webp"
};

export function nativeMagicIcon(name, currentImage = "") {
  const monochromeLegacy = ["/assets/67710.png", "/assets/alao.png"];
  const normalizedImage = currentImage.replaceAll("\\", "/").toLocaleLowerCase("pt-BR");
  if (currentImage && !currentImage.startsWith("icons/svg/") && !monochromeLegacy.some((suffix) => normalizedImage.endsWith(suffix))) return currentImage;
  const value = normalize(name);
  const has = (pattern) => pattern.test(value);
  if (has(/fogo|flame|chama|igne|incend|inferno|imol|calor|solar|sol\b/)) return icons.fire;
  if (has(/raio|eletri|relamp|trovao|tempestade eletr/)) return icons.lightning;
  if (has(/gelo|granizo|frio|congel|neve/)) return icons.ice;
  if (has(/agua|mar\b|aquatic|chuva|onda|liquid|lagrima/)) return icons.water;
  if (has(/vento|ar\b|aero|brisa|furacao|voo|levita|plumas/)) return has(/voo|levita|plumas/) ? icons.flight : icons.air;
  if (has(/terra|pedra|rocha|argila|geo|tremor|petrific|mineral|metal|cristal/)) return icons.earth;
  if (has(/animal|fera|besta|selvagem|zoof|adestr|rastrea|cacador|teriantrop|hibernar/)) return icons.animal;
  if (has(/planta|vegetal|flor|raiz|bosque|nature|musgo|arvore|fertil|semente|colheita|biosfera/)) return icons.nature;
  if (has(/cura|curas|regenera|recupera|restaura|saude|vigor|vital|ressurrei|juventude/)) return icons.healing;
  if (has(/morte|morto|cadaver|alma|espirito|necrom|sangue|martir|genocidio|dreno|carcere de almas/)) return icons.death;
  if (has(/bencao|abenco|sagra|divin|celest|oracao|apelo|fe\b|julgamento|honra|karma|ajuda|auxilio|dadiva|carinho|piedade|purifica|redenc|liberta|batismo|milagre|paz/)) return icons.holy;
  if (has(/maldic|infernal|demon|possess|horror|terror|medo|pesadelo|covardia|esconjur/)) return icons.unholy;
  if (has(/prote|barreira|armadura|escudo|resist|redoma|bloqueio|abrigo|inviolavel|interdicao|muralha/)) return icons.protection;
  if (has(/ilus|imagem|invis|camufla|mascara|bruma|alucin|fantasia|engodo|esvaecimento|intang/)) return icons.illusion;
  if (has(/detec|visao|clarivid|premoni|antecip|analise|localiz|percepc|sensor|sentido|verdade|conhecimento|adivinha|identifica|perspic|previs|faro|leitura|vigilia/)) return icons.perception;
  if (has(/mente|mental|memori|sugest|domina|controle|empatia|amizade|seduc|fanat|ordens|comando|contatos|consciencia|intui|duvida|emocional|fascinio|sono|paralis|desatencao|ato falho|boato|confidenc|diplomacia|inimizade|motivacao|obstinacao|intimidad|escarnio/)) return icons.mind;
  if (has(/teleport|telecinese|transporte|dimensional|portal|ponte eterea|projecao|troca|passagem|deslocamento|velocidade|magnetismo|corrente/)) return icons.movement;
  if (has(/som|sonor|cancao|cantico|melodia|acorde|musica|silencio|ventrilo|instrumento|dueto|ruido|grito|rugido/)) return icons.sonic;
  if (has(/tempo|prolong|permanencia|retorno|passado|futuro/)) return icons.time;
  if (has(/luz|escuridao|sombra|dourad|luminos|radiar/)) return icons.light;
  if (has(/transform|mutacao|metamorf|forma |fusao|membros|corpo|corporea|tamanho|elastic|contorcion|animacao|conjuracao|convocacao|criacao|encarnacao|encolhimento|gaseificacao|licantrop|mimetismo|replica|sosia|criatura disforme/)) return icons.transform;
  if (has(/aura|centro de poder|energia|poder ancestral|marca arcana|runas|retencao magica|anulacao|quebra de encantos|negacao mistica|desfazer|conversao/)) return icons.light;
  if (has(/armadilha|teia|prisao|cobertura|campo|santuario|guardiao|instinto defensivo|refletir|rejeicao/)) return icons.protection;
  if (has(/natural|herb|frutos|verao|inverno|provedor|fito|nutricao|comunhao|familiaridade|terreno hostil/)) return icons.nature;
  if (has(/bravura|heroismo|guerra|batalha|furia|matan|aniquila|cataclisma|meteoro|projetil|garras|lamina|acerto|tempestade vitoriosa|forca/)) return icons.fire;
  if (has(/desintegr|explos|ataque|dardo|lanca|arma |impacto/)) return icons.fire;
  return icons.generic;
}

export const nativeMagicIcons = Object.freeze(icons);
