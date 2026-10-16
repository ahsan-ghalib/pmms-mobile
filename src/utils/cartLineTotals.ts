type CartLine = Record<string, any>;

function asNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function parseSelectedModifiers(value: unknown): CartLine[] {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return Array.isArray(value) ? value : [];
}

export function selectedModifiersTotal(modifiers: unknown, preferExcl = false): number {
  return parseSelectedModifiers(modifiers).reduce((sum, mod) => {
    const qty = Math.max(1, asNumber(mod.quantity || 1));

    if (preferExcl) {
      const exclLine = Number(mod.total_price_excl_tax);
      if (Number.isFinite(exclLine) && exclLine >= 0) {
        return sum + exclLine;
      }

      const exclUnit = Number(mod.unit_price_excl_tax);
      if (Number.isFinite(exclUnit) && exclUnit >= 0) {
        return sum + exclUnit * qty;
      }
    }

    const line = Number(mod.total_price);
    if (Number.isFinite(line) && line >= 0) {
      return sum + line;
    }

    return sum + asNumber(mod.unit_price) * qty;
  }, 0);
}

export function cartItemDisplayUnitPrice(item: CartLine): number {
  const qty = Math.max(1, asNumber(item._backendQuantity || item.quantity || 1));
  const addonsInc = selectedModifiersTotal(item.selected_modifiers, false);
  const lineWithTax = Number(item.line_total_with_tax);
  const fromLine = Number.isFinite(lineWithTax) && lineWithTax > 0 ? lineWithTax / qty : 0;
  const baseWithTax = Number(item.base_line_total_with_tax);
  const baseEx = Number(item.base_line_total);
  const hasBase =
    (Number.isFinite(baseWithTax) && baseWithTax > 0) || (Number.isFinite(baseEx) && baseEx >= 0);
  const baseUnit =
    Number.isFinite(baseWithTax) && baseWithTax > 0
      ? baseWithTax / qty
      : Number.isFinite(baseEx) && baseEx >= 0
        ? baseEx / qty
        : asNumber(item.effective_unit_price);
  const fromParts = hasBase ? baseUnit + addonsInc / qty : asNumber(item.effective_unit_price);

  return Number(Math.max(fromLine, fromParts, asNumber(item.effective_unit_price)).toFixed(2));
}

export function cartItemMerchandiseExclTax(
  item: CartLine,
  scaleLineAmount: (item: CartLine, amount: number) => number,
): number {
  const addonsEx = selectedModifiersTotal(item.selected_modifiers, true);
  const addonsInc = selectedModifiersTotal(item.selected_modifiers, false);
  const addons = addonsEx > 0 ? addonsEx : addonsInc;
  const baseEx = Number(item.base_line_total);
  const lineEx = Number(item.line_total);
  const fromBase = (Number.isFinite(baseEx) && baseEx >= 0 ? baseEx : 0) + addons;
  const fromLine = Number.isFinite(lineEx) && lineEx >= 0 ? lineEx : 0;
  const lineWithTax = Number(item.line_total_with_tax);
  const lineTax = Number(item.tax_amount);
  const fromTaxed =
    Number.isFinite(lineWithTax) && Number.isFinite(lineTax) && lineWithTax >= lineTax
      ? lineWithTax - lineTax
      : 0;

  return scaleLineAmount(item, Math.max(fromLine, fromBase, fromTaxed));
}
