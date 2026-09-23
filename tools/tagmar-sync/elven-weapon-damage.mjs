// Correção pontual; sem sincronizar descrições/regras ou alterar atores de mundos.
export function elvenWeaponDamageAttribute(name, fallback) {
  const key = String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().replace(/\s+/g, ' ').toLowerCase();
  if (key === 'sabre elfico') return 'AGI';
  if (key === 'arco longo elfico') return 'FOR';
  return fallback;
}
