export function resolveMenuEntries(entries, configuredMenus, menuId, rights, allEntries = entries) {
  const config = (configuredMenus || []).find((menu) => menu.id === menuId);
  const positions = new Map((config?.submenus || []).map((entry) => [entry.id, entry]));
  const seen = new Set();
  const candidates = config ? [...allEntries, ...entries] : entries;
  return candidates.reduce((result, entry) => {
    if (!entry.id || seen.has(entry.id) || (entry.filter && !entry.filter(rights))) return result;
    seen.add(entry.id);
    const children = entry.children?.filter((child) => !child.filter || child.filter(rights));
    if (children && !children.length) return result;
    const childConfig = (children || []).map((child) => positions.get(child.id)).find(Boolean);
    const configured = positions.get(entry.id) || childConfig;
    // New parent contributions remain available when an instance's menu config
    // predates grouping. Existing flat entries still respect configured visibility.
    if (config && !configured && !children) return result;
    result.push({ ...entry, children, menuIcon: configured?.icon, position: configured?.position ?? result.length + 1000 });
    return result;
  }, []).sort((left, right) => left.position - right.position);
}
