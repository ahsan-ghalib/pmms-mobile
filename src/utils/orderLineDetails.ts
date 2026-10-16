type OrderLine = Record<string, any>;

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function collectVariantValues(variant: OrderLine | null | undefined): string[] {
  if (!variant) {
    return [];
  }

  const options = parseJson(variant.options);
  if (Array.isArray(options)) {
    const fromArray = options
      .map((entry) => {
        if (entry == null) return '';
        if (typeof entry === 'string' || typeof entry === 'number') return String(entry);
        const obj = entry as Record<string, unknown>;
        return String(obj.attribute_value ?? obj.value ?? obj.name ?? obj.attribute_value_ar ?? '');
      })
      .map((v) => v.trim())
      .filter(Boolean);
    if (fromArray.length > 0) {
      return fromArray;
    }
  } else if (options && typeof options === 'object') {
    const fromMap = Object.values(options as Record<string, unknown>)
      .map((v) => (v == null ? '' : String(v).trim()))
      .filter(Boolean);
    if (fromMap.length > 0) {
      return fromMap;
    }
  }

  const attributes = variant.attributes ?? variant.variant_attributes ?? variant.variantAttributes;
  if (Array.isArray(attributes)) {
    const fromAttrs = attributes
      .map((attr) => String(attr?.attribute_value ?? attr?.value ?? '').trim())
      .filter(Boolean);
    if (fromAttrs.length > 0) {
      return fromAttrs;
    }
  }

  const code = String(variant.variant_code ?? '').trim();
  if (code && !code.startsWith('variant_')) {
    return [code];
  }

  const sku = String(variant.sku ?? '').trim();
  if (sku && sku !== '[]') {
    return [sku];
  }

  return [];
}

function flattenModifiers(value: unknown): any[] {
  const parsed = parseJson(value);
  const rows = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { data?: unknown }).data)
      ? (parsed as { data: unknown[] }).data
      : [];

  return rows.flatMap((mod) => {
    if (!mod || typeof mod !== 'object') {
      return [];
    }
    const groupedItems = (mod as { items?: unknown }).items;
    if (
      Array.isArray(groupedItems) &&
      groupedItems.length > 0 &&
      !(mod as { modifier_item_name?: string }).modifier_item_name &&
      !(mod as { name?: string }).name
    ) {
      const groupTitle =
        (mod as { modifier_group_title?: string; title?: string; group_title?: string })
          .modifier_group_title ||
        (mod as { title?: string }).title ||
        (mod as { group_title?: string }).group_title ||
        '';
      const groupTitleAr =
        (mod as { modifier_group_title_ar?: string; title_ar?: string }).modifier_group_title_ar ||
        (mod as { title_ar?: string }).title_ar ||
        '';
      return groupedItems.flatMap((item) => {
        if (!item || typeof item !== 'object') {
          return [];
        }
        return [
          {
            ...item,
            modifier_group_title: groupTitle,
            modifier_group_title_ar: groupTitleAr,
            modifier_item_name:
              (item as { modifier_item_name?: string; name?: string; item_name?: string })
                .modifier_item_name ||
              (item as { name?: string }).name ||
              (item as { item_name?: string }).item_name ||
              '',
            modifier_item_name_ar:
              (item as { modifier_item_name_ar?: string; name_ar?: string })
                .modifier_item_name_ar ||
              (item as { name_ar?: string }).name_ar ||
              '',
            unit_price:
              (item as { unit_price?: number; extra_price?: number; price?: number }).unit_price ??
              (item as { extra_price?: number }).extra_price ??
              (item as { price?: number }).price ??
              0,
          },
        ];
      });
    }
    return [mod];
  });
}

function collectModifiers(line: OrderLine): any[] {
  const candidates = [
    line.order_modifiers,
    line.orderModifiers,
    line.order_product_modifiers,
    line.orderProductModifiers,
    line.selected_modifiers,
    line.selectedModifiers,
    line.modifiers,
    line.addon_items,
    line.addons,
  ];

  for (const raw of candidates) {
    const flattened = flattenModifiers(raw);
    if (flattened.length > 0) {
      return flattened;
    }
  }

  return [];
}

export function formatOrderLineVariant(line: OrderLine): string {
  const variant = line.product_variant ?? line.productVariant ?? null;
  return collectVariantValues(variant).join(' · ');
}

export type OrderLineExtra = {
  label: string;
  price: number;
};

function extraLabel(mod: any, isArabic = false): string {
  const name = isArabic
    ? mod.modifier_item_name_ar ||
      mod.modifier_item_name_arabic ||
      mod.name_ar ||
      mod.name_arabic ||
      mod.modifier_item_name ||
      mod.name ||
      mod.item_name ||
      ''
    : mod.modifier_item_name || mod.name || mod.item_name || mod.modifier_item_name_ar || '';
  const qty = Number(mod.quantity ?? 1);
  if (!String(name).trim()) {
    return '';
  }
  return `${name}${qty > 1 ? ` ×${qty}` : ''}`;
}

function extraPrice(mod: any): number {
  const qty = Number(mod.quantity ?? 1);
  const total = Number(mod.total_price ?? mod.price ?? NaN);
  if (Number.isFinite(total)) {
    return total;
  }
  const unit = Number(mod.unit_price ?? 0);
  return Number.isFinite(unit) ? unit * (Number.isFinite(qty) ? qty : 1) : 0;
}

export function mapOrderLineExtras(line: OrderLine, isArabic = false): OrderLineExtra[] {
  return collectModifiers(line)
    .map((mod) => {
      const label = extraLabel(mod, isArabic);
      if (!label) {
        return null;
      }
      return { label, price: extraPrice(mod) };
    })
    .filter((extra): extra is OrderLineExtra => extra != null);
}

export function formatOrderLineExtras(line: OrderLine, isArabic = false): string[] {
  return mapOrderLineExtras(line, isArabic).map((extra) => extra.label);
}

export function formatOrderLineOption(line: OrderLine, isArabic = false): string {
  return [formatOrderLineVariant(line), ...formatOrderLineExtras(line, isArabic)]
    .filter(Boolean)
    .join('\n');
}

export function resolveOrderLines(order: Record<string, any> | null | undefined): OrderLine[] {
  const lines = order?.order_products ?? order?.orderProducts ?? [];
  return Array.isArray(lines) ? lines : [];
}
