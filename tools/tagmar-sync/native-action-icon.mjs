const key = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, " ").trim().toLocaleLowerCase("pt-BR");

export function nativeTechniqueIcon(name, currentImage = "") {
  if (currentImage && !currentImage.startsWith("icons/svg/")) return currentImage;
  const value = key(name);
  const has = (pattern) => pattern.test(value);
  if (has(/arco|disparo|flecha|mira|atirar|ricochet|direcionamento|arremesso/)) {
    if (has(/multip|rapido/)) return "icons/skills/ranged/arrows-flying-triple-gray.webp";
    if (has(/mira|certeiro|ajustar|direcionamento/)) return "icons/skills/ranged/target-bullseye-arrow-yellow.webp";
    return "icons/skills/ranged/archery-bow-attack-yellow.webp";
  }
  if (has(/pugilato|forca interior/)) return "icons/skills/melee/unarmed-punch-fist.webp";
  if (has(/aparar|defletir|resguardar|escudo|postura defensiva|inibir ataque/)) return "icons/skills/melee/swords-parry-block-blue.webp";
  if (has(/esquiva|desviar|imprevisibilidade|desequilibrar/)) return "icons/skills/movement/figure-running-gray.webp";
  if (has(/montad|centaurizar/)) return "icons/environment/creatures/horse-brown.webp";
  if (has(/carga|atravessar|pressionar|conduzir|posicionamento|escolta/)) return "icons/skills/movement/arrow-upward-yellow.webp";
  if (has(/ambidestria|golpe duplo/)) return "icons/skills/melee/weapons-crossed-swords-yellow.webp";
  if (has(/giratorio/)) return "icons/skills/melee/sword-twirl-orange.webp";
  if (has(/letal|agravado|retalhar|sangramento|brutalizar|estilhacar/)) return "icons/skills/melee/strike-sword-slashing-red.webp";
  if (has(/contra ataque|ataque oportuno|postura ofensiva|golpe/)) return "icons/skills/melee/strike-sword-steel-yellow.webp";
  if (has(/luta as cegas|leitura da batalha|explorar fraqueza|expectativa/)) return "icons/skills/targeting/crosshair-ringed-gray.webp";
  if (has(/resistencia|dor|debilit|segundo folego/)) return "icons/skills/wounds/injury-body-pain-gray.webp";
  if (has(/intimidar|provocar|animosidade|voz de comando/)) return "icons/skills/social/intimidation-impressing.webp";
  if (has(/concentracao|heroismo|furia/)) return "icons/magic/control/buff-strength-muscle-damage-red.webp";
  if (has(/nao letal/)) return "icons/skills/social/wave-halt-stop.webp";
  return "icons/skills/melee/weapons-crossed-swords-white-blue.webp";
}

export function nativeSkillIcon(name, currentImage = "") {
  if (currentImage && !currentImage.startsWith("icons/svg/")) return currentImage;
  const value = key(name);
  const has = (pattern) => pattern.test(value);
  if (has(/acrobacia|malabarismo|escapar/)) return "icons/skills/movement/ball-spinning-blue.webp";
  if (has(/corrida|aplicar esforco/)) return "icons/skills/movement/figure-running-gray.webp";
  if (has(/escalar/)) return "icons/sundries/survival/climbing-anchor-steel-grey.webp";
  if (has(/natacao/)) return "icons/magic/water/wave-water-blue.webp";
  if (has(/montar animais|lidar com animais/)) return "icons/environment/creatures/horses.webp";
  if (has(/furtiv|seguir trilhas|sobrevivencia/)) return "icons/skills/trades/farming-plant-seedling-gray.webp";
  if (has(/empatia|persuasao|lideranca|extrair informacao/)) return "icons/skills/social/diplomacy-handshake-blue.webp";
  if (has(/enganacao/)) return "icons/skills/social/trading-injustice-scale-gray.webp";
  if (has(/furtar objetos/)) return "icons/skills/social/theft-pickpocket-bribery-brown.webp";
  if (has(/sensitividade|usar os sentidos/)) return "icons/magic/perception/eye-ringed-green.webp";
  if (has(/manusear armadilhas/)) return "icons/environment/traps/trap-jaw-steel.webp";
  return "icons/skills/trades/academics-book-study-purple.webp";
}
