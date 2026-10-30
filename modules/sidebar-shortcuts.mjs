// Atalhos de ferramentas existentes; não troca camada, seleção ou ferramenta ativa.
export const SHORTCUTS = Object.freeze([
  'tagmarRolagem', 'tagmarTabelaAcoes', 'tagmarTabelaResistencia',
  'tagmar-calendario', 'tagmarVotacao', 'tesourosTagmar', 'tagmar-viagens'
]);
const SETTING = 'mapSidebarShortcuts';

export function renderSidebarShortcuts(app, element, {enabled = true, localize = s => s,
  ready = () => true, notify = () => {}, log = console.error} = {}) {
  const root = element?.querySelector ? element : element?.[0] ?? app.element;
  if (!root?.querySelector) return;
  root.querySelectorAll('[data-tagmar-shortcut-row]').forEach(node => node.remove());
  root.querySelectorAll('.tagmar-shortcut-original').forEach(node => node.classList.remove('tagmar-shortcut-original'));
  const menu = root.querySelector('[data-application-part=layers], #scene-controls-layers, #scene-controls-controls');
  menu?.classList.remove('tagmar-shortcuts-fixed');
  if (!enabled || !menu) return;
  const document = root.ownerDocument;
  if (!document.getElementById('tagmar-sidebar-shortcuts-style')) {
    const style = document.createElement('style');
    style.id = 'tagmar-sidebar-shortcuts-style';
    style.textContent = `
      #scene-controls > .tagmar-shortcuts-fixed {width:var(--control-size,32px); overflow-y:auto; overflow-x:hidden; scrollbar-width:none; flex-wrap:nowrap; pointer-events:auto;}
      #scene-controls > .tagmar-shortcuts-fixed > li {flex-shrink:0;}
      #scene-controls > .tagmar-shortcuts-fixed .tagmar-shortcut-first {border-top:1px solid var(--color-border,#645345); padding-top:8px;}
      #scene-controls .tagmar-shortcut-original {display:none !important;}
    `;
    document.head.append(style);
  }
  const getTool = id => {
    const control = id === 'tagmar-viagens' ? app.controls?.['tagmar-viagens']
      : app.controls?.tokens ?? app.controls?.token;
    if (!control || control.visible === false) return null;
    const tool = control.tools?.[id === 'tagmar-viagens' ? 'planner' : id];
    return tool && tool.visible !== false && tool.button && !tool.toggle
      && typeof tool.onChange === 'function' ? tool : null;
  };
  let count = 0;
  for (const id of SHORTCUTS) {
    const tool = getTool(id);
    if (!tool) continue;
    const row = document.createElement('li');
    row.dataset.tagmarShortcutRow = id;
    if (!count++) row.classList.add('tagmar-shortcut-first');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `control ui-control icon button ${tool.icon ?? ''}`;
    button.dataset.tagmarShortcut = id;
    button.dataset.tooltip = '';
    button.dataset.tooltipDirection = 'RIGHT';
    button.setAttribute('aria-label', localize(tool.title ?? id));
    button.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const current = getTool(id); // Revalida disponibilidade no momento do clique.
      if (!ready() || !current || button.disabled) return;
      button.disabled = true;
      try {
        const callback = current.onChange;
        await callback(event, true);
      } catch (error) {
        log('Tagmar | Atalho da barra lateral', error);
        notify('Não foi possível abrir esta ferramenta. Consulte o Console.');
      } finally { button.disabled = false; }
    });
    row.append(button);
    menu.append(row);
    if (id === 'tagmar-viagens') {
      menu.querySelector('[data-control="tagmar-viagens"]')?.closest('li')?.classList.add('tagmar-shortcut-original');
    }
    // Mantém a definição nativa; só evita duplicar o ícone na segunda coluna.
    root.querySelectorAll('#scene-controls-tools [data-tool]').forEach(original => {
      if (original.dataset.tool === id) original.closest('li')?.classList.add('tagmar-shortcut-original');
    });
  }
  menu.classList.toggle('tagmar-shortcuts-fixed', count > 0);
}

if (globalThis.Hooks) {
  Hooks.once('init', () => game.settings.register(game.system.id, SETTING, {
    name: 'Mapa — atalhos fixos na barra esquerda',
    hint: 'Mostra rolagem, tabelas, calendário, votação e tesouros na coluna principal, quando disponíveis. Desmarque para voltar às ferramentas de Token.',
    scope: 'client', config: true, type: Boolean, default: true,
    onChange: () => ui.controls?.render({force: true})
  }));
  Hooks.on('renderSceneControls', (app, element) => renderSidebarShortcuts(app, element, {
    enabled: game.settings.get(game.system.id, SETTING),
    localize: title => game.i18n.localize(title),
    ready: () => !!canvas.ready,
    notify: message => ui.notifications.error(message)
  }));
}
