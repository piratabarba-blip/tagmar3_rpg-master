// Random recipes contain filters, never exact objects or exact spell levels.
export const RANDOM_KINDS = ['weapon', 'defense', 'ring', 'staff', 'potion'];
export const RANDOM_PROPERTIES = ['bonus', 'magia', 'focus', 'resistencia', 'absorcao'];
export function randomKinds(options) {
  const values = Array.isArray(options.randomObjectTypes) && options.randomObjectTypes.length
    ? options.randomObjectTypes : [options.itemKind || 'random'];
  return [...new Set(values.flatMap(value => value === 'random' ? RANDOM_KINDS : RANDOM_KINDS.includes(value) ? [value] : []))];
}
export function randomMagicFilters(options) {
  const rows = Array.isArray(options.randomMagicFilters) && options.randomMagicFilters.length
    ? options.randomMagicFilters : [{tradition: options.magicTradition, repertoire: options.magicRepertoire, origin: options.magicOrigin}];
  return rows.map(row => ({tradition: row.tradition || 'all', repertoire: row.repertoire || 'all', origin: row.origin || ''}));
}
export function matchesMagicFilter(magic, row) {
  return (row.tradition === 'all' || magic.traditions?.includes(row.tradition))
    && (row.repertoire === 'all' || magic.repertoires?.includes(row.repertoire))
    && (!row.origin || magic.origins?.includes(row.origin));
}
export function requestedProperties(options) {
  return options.randomPropertyMode === 'chosen'
    ? [...new Set((Array.isArray(options.randomProperties) ? options.randomProperties : []).filter(key => RANDOM_PROPERTIES.includes(key)))] : null;
}
export function supportsProperty(kind, key) {
  return {bonus: ['weapon', 'defense'], magia: RANDOM_KINDS, focus: ['weapon', 'defense', 'ring', 'staff'],
    resistencia: ['weapon', 'defense', 'ring', 'staff'], absorcao: ['defense', 'ring']}[key]?.includes(kind) || false;
}

export function readRandomSelections(root) {
  const read = (row, selector, fallback) => row.querySelector(selector)?.value || fallback;
  return {
    randomObjectTypes: [...root.querySelectorAll('[data-random-object-row] select')].map(select => select.value),
    randomMagicFilters: [...root.querySelectorAll('[data-random-magic-row]')].map(row => ({
      tradition: read(row, '[data-magic-filter="tradition"]', 'all'),
      repertoire: read(row, '[data-magic-filter="repertoire"]', 'all'),
      origin: read(row, '[data-magic-filter="origin"]', '')
    })),
    randomPropertyMode: read(root, '[name="randomPropertyMode"]', 'random'),
    randomProperties: [...root.querySelectorAll('[data-random-property]:checked')].map(input => input.value)
  };
}

export function bindRandomSelections(app, html) {
  const root = html[0] ?? html;
  const objectRows = root.querySelector('[data-random-object-rows]');
  const magicRows = root.querySelector('[data-random-magic-rows]');
  if (!objectRows || !magicRows) return;
  const originalObject = objectRows.firstElementChild;
  const originalMagic = magicRows.firstElementChild;
  const remember = () => { app._formState = app._formValues(html); };
  function addRow(container, original, values) {
    const row = original.cloneNode(true);
    row.querySelectorAll('[name]').forEach(field => field.removeAttribute('name'));
    row.querySelectorAll('select').forEach((select, index) => {
      select.value = values?.[index] ?? original.querySelectorAll('select')[index].value;
    });
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'tesouro-remove-filter';
    remove.textContent = 'Remover'; remove.setAttribute('aria-label', container === objectRows ? 'Remover tipo de objeto' : 'Remover família de magia');
    remove.addEventListener('click', () => { row.remove(); sync(); remember(); });
    row.append(remove); container.append(row);
    return row;
  }
  for (const kind of app._formState?.randomObjectTypes?.slice(1) ?? []) addRow(objectRows, originalObject, [kind]);
  for (const row of app._formState?.randomMagicFilters?.slice(1) ?? []) addRow(magicRows, originalMagic, [row.tradition, row.repertoire, row.origin]);
  root.querySelectorAll('[data-random-property]').forEach(input => {
    input.checked = app._formState?.randomProperties?.includes(input.value) || false;
  });
  const addObject = root.querySelector('[data-action="add-random-object"]');
  const addMagic = root.querySelector('[data-action="add-random-magic"]');
  addObject.addEventListener('click', () => { addRow(objectRows, originalObject); sync(); remember(); });
  addMagic.addEventListener('click', () => { addRow(magicRows, originalMagic); sync(); remember(); });
  function sync() {
    const mundane = root.querySelector('[name="treasureMode"]').value === 'mundane';
    const chosen = root.querySelector('[name="randomPropertyMode"]').value === 'chosen';
    const magicChecked = root.querySelector('[data-random-property][value="magia"]').checked;
    const magicMode = root.querySelector('[name="magicMode"]');
    const magicEnabled = !mundane && (chosen ? magicChecked : magicMode.value !== 'none');
    magicMode.disabled = chosen;
    root.querySelectorAll('[data-magic-option]').forEach(label => label.classList.toggle('is-disabled', !magicEnabled));
    root.querySelector('[data-random-properties]').hidden = !chosen;
    root.querySelector('[data-treasure-section="properties"]').hidden = mundane;
    root.querySelector('[data-magic-recipe-note]').hidden = !chosen;
    addMagic.disabled = !magicEnabled;
    root.querySelector('[name="randomMagicMinimum"]').disabled = !magicEnabled;
    const source = root.querySelector('[name="contentSource"]').value;
    for (const row of magicRows.children) {
      const tradition = row.querySelector('[data-magic-filter="tradition"]');
      const repertoire = row.querySelector('[data-magic-filter="repertoire"]');
      const origin = row.querySelector('[data-magic-filter="origin"]');
      for (const option of origin.options) {
        if (!option.value) continue;
        option.hidden = (['reinos', 'terras'].includes(source) && !option.dataset.realms.split(' ').includes(source))
          || (tradition.value !== 'all' && !option.dataset.traditions.split(' ').includes(tradition.value))
          || (repertoire.value !== 'all' && !option.dataset.repertoires.split(' ').includes(repertoire.value));
      }
      if (origin.selectedOptions[0]?.hidden) origin.value = '';
      row.querySelectorAll('select').forEach(select => { select.disabled = !magicEnabled; });
    }
  }
  root.querySelector('.tesouro-body > [data-tab="gerar"]').addEventListener('change', () => { sync(); remember(); });
  sync();
}
