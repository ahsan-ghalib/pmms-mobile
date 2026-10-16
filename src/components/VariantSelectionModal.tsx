import React, { useState, useEffect, useRef } from 'react';
import { View, Modal, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProductListItem, ProductVariant } from '../api/services/product.service';
import { Text } from './Text';
import MoneyAmount from './ui/MoneyAmount';
import { useIsRTL } from '../hooks/useIsRTL';
import {
  extractVariantAttributes,
  resolveDefaultVariant,
  sameVariantId,
} from '../utils/productVariants';

const EMPTY_ATTRIBUTES: Record<string, string> = {};

function buildInitialAttributes(
  product: ProductListItem,
  seed: Record<string, string>,
): Record<string, string> {
  const initialAttributes: Record<string, string> = { ...seed };

  if (Object.keys(initialAttributes).length > 0) {
    return initialAttributes;
  }

  const cheapest = resolveDefaultVariant(product);
  const fromCheapest = extractVariantAttributes(cheapest);
  if (Object.keys(fromCheapest).length > 0) {
    return fromCheapest;
  }

  if (product.attributes) {
    product.attributes.forEach((attr) => {
      if (attr.key && attr.values && attr.values.length > 0 && attr.values[0].value) {
        initialAttributes[attr.key] = attr.values[0].value;
      }
    });
  }

  return initialAttributes;
}

interface VariantSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  product: ProductListItem | null;
  onAddToCart: (variantId: number | null | undefined, quantity: number, modifiers: any[]) => void;
  initialSelectedAttributes?: Record<string, string>;
  initialQuantity?: number;
}

export const VariantSelectionModal: React.FC<VariantSelectionModalProps> = ({
  visible,
  onClose,
  product,
  onAddToCart,
  initialSelectedAttributes = EMPTY_ATTRIBUTES,
  initialQuantity = 1,
}) => {
  const isRTL = useIsRTL();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [selectedModifiers, setSelectedModifiers] = useState<
    Record<number, Record<number, number>>
  >({});
  const [quantity, setQuantity] = useState(1);
  const [activeVariant, setActiveVariant] = useState<ProductVariant | null>(null);
  const lastInitKeyRef = useRef<string | null>(null);

  // Reset only when the sheet opens or the product changes. A default `{}` prop
  // was a new object each render and retriggered setState in a loop after tap.
  useEffect(() => {
    if (!visible || !product) {
      if (!visible) {
        lastInitKeyRef.current = null;
      }
      return;
    }

    const initKey = `${product.id}:${initialQuantity}:${JSON.stringify(initialSelectedAttributes)}`;
    if (lastInitKeyRef.current === initKey) {
      return;
    }
    lastInitKeyRef.current = initKey;

    setSelectedAttributes(buildInitialAttributes(product, initialSelectedAttributes));
    setSelectedModifiers({});
    setQuantity(initialQuantity);
  }, [visible, product, initialSelectedAttributes, initialQuantity]);

  useEffect(() => {
    if (!product?.variants) return;

    // Find the first variant that matches all CURRENTLY selected attributes
    const matched = product.variants.find((v) => {
      let variantAttrs =
        v.attributes && Object.keys(v.attributes).length > 0 ? v.attributes : v.options;

      // Parse stringified JSON if needed
      if (typeof variantAttrs === 'string') {
        try {
          variantAttrs = JSON.parse(variantAttrs);
        } catch (e) {}
      }

      return Object.entries(selectedAttributes).every(([selectedKey, selectedVal]) => {
        // First try to match by explicit attributes/options
        if (variantAttrs) {
          // If variantAttrs is an array (legacy/old format)
          if (Array.isArray(variantAttrs) && variantAttrs.length > 0) {
            return variantAttrs.some((attr: any) => {
              const key = attr.attribute_key || attr.key;
              const val = attr.attribute_value || attr.value;
              return (
                key &&
                val &&
                key.toString().toLowerCase() === selectedKey.toLowerCase() &&
                val.toString().toLowerCase() === selectedVal.toString().toLowerCase()
              );
            });
          }
          // If variantAttrs is a direct object map (new format, e.g. { ivan_eaton: "Autem totam veniam" })
          else if (
            typeof variantAttrs === 'object' &&
            !Array.isArray(variantAttrs) &&
            Object.keys(variantAttrs).length > 0
          ) {
            // Check if the key exists and value matches (case insensitive)
            const matchingKey = Object.keys(variantAttrs).find(
              (k) => k.toLowerCase() === selectedKey.toLowerCase(),
            );
            if (
              matchingKey &&
              variantAttrs[matchingKey] &&
              variantAttrs[matchingKey].toString().toLowerCase() ===
                selectedVal.toString().toLowerCase()
            ) {
              return true;
            }
            return false; // If explicit object exists but doesn't match, return false immediately to prevent fallback
          }
        }

        // Fallback: If no attributes are mapped in the DB, try to match by SKU string
        if (v.sku && selectedVal) {
          // e.g. SKU "VAR-RED-L" contains "RED" and "L"
          const normalizedSku = v.sku.toUpperCase().replace(/\s+/g, '');
          const normalizedVal = selectedVal.toUpperCase().replace(/\s+/g, '');

          // Split SKU by hyphens and see if any part matches exactly
          const skuParts = normalizedSku.split('-');
          if (skuParts.includes(normalizedVal)) {
            return true;
          }

          // Or if it's just a substring match as a last resort
          return normalizedSku.includes(normalizedVal);
        }

        return false;
      });
    });

    const nextVariant = matched || resolveDefaultVariant(product);
    setActiveVariant((current) =>
      sameVariantId(current?.id, nextVariant?.id)
        ? current
        : (nextVariant as ProductVariant | null),
    );
  }, [selectedAttributes, product]);

  if (!product) return null;

  const handleAttributeSelect = (key: string, value: string) => {
    setSelectedAttributes((prev) => ({ ...prev, [key]: value }));
  };

  const handleModifierToggle = (
    groupId: number,
    itemId: number,
    isIncrementable: boolean = false,
  ) => {
    setSelectedModifiers((prev) => {
      const groupData = prev[groupId] || {};
      const currentQty = groupData[itemId] || 0;

      if (isIncrementable) {
        // If incrementable, we just increment it. Decrement is handled by a separate function
        return {
          ...prev,
          [groupId]: { ...groupData, [itemId]: currentQty + 1 },
        };
      } else {
        // Toggle behavior for non-incrementable
        const nextData = { ...groupData };
        if (currentQty > 0) {
          delete nextData[itemId];
        } else {
          nextData[itemId] = 1;
        }
        return { ...prev, [groupId]: nextData };
      }
    });
  };

  const handleModifierDecrement = (groupId: number, itemId: number) => {
    setSelectedModifiers((prev) => {
      const groupData = prev[groupId] || {};
      const currentQty = groupData[itemId] || 0;
      if (currentQty <= 0) return prev;

      const nextData = { ...groupData };
      if (currentQty === 1) {
        delete nextData[itemId];
      } else {
        nextData[itemId] = currentQty - 1;
      }

      return { ...prev, [groupId]: nextData };
    });
  };

  const getVariantPrice = () => {
    if (activeVariant) {
      return Number(activeVariant.price || 0);
    }
    const cheapest = resolveDefaultVariant(product);
    return Number(cheapest?.price ?? product.price ?? 0);
  };

  const getModifiersPrice = () => {
    let total = 0;
    if (product.modifier_groups) {
      product.modifier_groups.forEach((group) => {
        if (!group.items) return;
        const groupSelections = selectedModifiers[group.id] || {};
        group.items.forEach((item) => {
          const qty = groupSelections[item.id] || 0;
          if (qty > 0 && item.extra_price) {
            total += Number(item.extra_price) * qty;
          }
        });
      });
    }
    return total;
  };

  const totalPrice = (getVariantPrice() + getModifiersPrice()) * quantity;

  const productImage =
    activeVariant?.images?.[0] ||
    product.featured_image ||
    (product.images?.[0] && typeof product.images[0] === 'object'
      ? product.images[0].url
      : product.images?.[0]) ||
    null;

  const handleAddToCart = () => {
    // Format modifiers for CartContext
    const formattedModifiers: any[] = [];
    Object.keys(selectedModifiers).forEach((groupIdStr) => {
      const groupId = Number(groupIdStr);
      const items = selectedModifiers[groupId];
      const itemsArr: any[] = [];

      Object.keys(items).forEach((itemIdStr) => {
        const itemId = Number(itemIdStr);
        const qty = items[itemId];
        if (qty > 0) {
          itemsArr.push({ item_id: itemId, quantity: qty });
        }
      });

      if (itemsArr.length > 0) {
        formattedModifiers.push({ group_id: groupId, items: itemsArr });
      }
    });

    const fallbackVariant = resolveDefaultVariant(product);
    onAddToCart(
      activeVariant
        ? Number(activeVariant.id)
        : fallbackVariant?.id
          ? Number(fallbackVariant.id)
          : null,
      quantity,
      formattedModifiers,
    );
    onClose();
  };

  const rowDir = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';
  const writingDirection = isRTL ? 'rtl' : 'ltr';
  const productName = isRTL ? product.name_ar || product.name : product.name || product.name_ar;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.handle} />

          <View style={[styles.header, { flexDirection: rowDir }]}>
            <View style={styles.thumb}>
              {productImage ? (
                <Image
                  source={{ uri: typeof productImage === 'string' ? productImage : undefined }}
                  style={styles.thumbImage}
                />
              ) : (
                <View style={styles.thumbEmpty}>
                  <Ionicons name="image-outline" size={22} color="#D1D5DB" />
                </View>
              )}
            </View>

            <View style={[styles.headerMeta, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text
                className="font-bold text-gray-900"
                numberOfLines={2}
                style={{ fontSize: 16, lineHeight: 22, textAlign, writingDirection }}
              >
                {productName}
              </Text>
              <MoneyAmount
                amount={getVariantPrice()}
                size={14}
                color="#8E54E9"
                textStyle={{ fontSize: 18, fontWeight: '700', color: '#8E54E9' }}
              />
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={18} color="#8E54E9" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {product.attributes && product.attributes.length > 0 && (
              <View>
                {product.attributes.map((attr) => {
                  if (!attr.values || attr.values.length === 0) return null;
                  const isColorAttr =
                    String(attr.key || '')
                      .trim()
                      .toLowerCase() === 'color';
                  const attrName = isRTL ? attr.name_ar || attr.name : attr.name || attr.name_ar;

                  return (
                    <View key={attr.id} style={styles.attrBlock}>
                      <Text
                        className="font-semibold text-gray-900"
                        style={{ fontSize: 13, marginBottom: 8, textAlign, writingDirection }}
                      >
                        {attrName}
                      </Text>
                      <View style={[styles.chipWrap, { flexDirection: rowDir }]}>
                        {attr.values.map((val) => {
                          const valStr = val.value || '';
                          const isSelected = Boolean(
                            attr.key && selectedAttributes[attr.key] === valStr,
                          );
                          const valLabel = isRTL
                            ? val.value_ar || val.value
                            : val.value || val.value_ar;

                          if (isColorAttr && val.color_code) {
                            return (
                              <TouchableOpacity
                                key={val.id}
                                activeOpacity={0.8}
                                onPress={() =>
                                  attr.key && valStr && handleAttributeSelect(attr.key, valStr)
                                }
                                style={[styles.colorChip, isSelected && styles.colorChipSelected]}
                              >
                                <View
                                  style={[styles.colorDot, { backgroundColor: val.color_code }]}
                                />
                                {isSelected && (
                                  <View
                                    style={[
                                      styles.colorCheck,
                                      isRTL ? { left: -2 } : { right: -2 },
                                    ]}
                                  >
                                    <Ionicons name="checkmark" size={9} color="white" />
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          }

                          return (
                            <TouchableOpacity
                              key={val.id}
                              onPress={() =>
                                attr.key && valStr && handleAttributeSelect(attr.key, valStr)
                              }
                              style={[styles.chip, isSelected && styles.chipSelected]}
                            >
                              <Text
                                className={isSelected ? 'font-semibold' : 'font-medium'}
                                style={{
                                  fontSize: 13,
                                  color: isSelected ? '#8E54E9' : '#111827',
                                  textAlign: 'center',
                                }}
                              >
                                {valLabel}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {product.modifier_groups && product.modifier_groups.length > 0 && (
              <View>
                {product.modifier_groups.map((group) => {
                  if (!group.items || group.items.length === 0) return null;

                  return (
                    <View key={group.id} style={styles.modifierGroup}>
                      <Text
                        className="font-semibold text-gray-900"
                        style={{ fontSize: 13, marginBottom: 6, textAlign, writingDirection }}
                      >
                        {isRTL ? group.title_ar || group.title : group.title || group.title_ar}
                      </Text>

                      {group.items.map((item, index) => {
                        const qty = (selectedModifiers[group.id] || {})[item.id] || 0;
                        const isSelected = qty > 0;
                        const isIncrementable = group.is_incrementable || item.is_incrementable;
                        const itemName = isRTL
                          ? item.name_ar || item.name
                          : item.name || item.name_ar;

                        return (
                          <View
                            key={item.id}
                            style={[
                              styles.modifierRow,
                              { flexDirection: rowDir },
                              index < group.items.length - 1 && styles.modifierRowBorder,
                            ]}
                          >
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() =>
                                handleModifierToggle(group.id, item.id, isIncrementable)
                              }
                              style={[styles.modifierLabel, { flexDirection: rowDir }]}
                            >
                              <View style={[styles.check, isSelected && styles.checkOn]}>
                                {isSelected && (
                                  <Ionicons name="checkmark" size={12} color="white" />
                                )}
                              </View>
                              <View
                                style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}
                              >
                                <Text
                                  className={
                                    isSelected
                                      ? 'font-bold text-gray-900'
                                      : 'font-medium text-gray-800'
                                  }
                                  style={{ fontSize: 14, textAlign, writingDirection }}
                                >
                                  {itemName}
                                </Text>
                                {!!item.extra_price && (
                                  <MoneyAmount
                                    amount={Number(item.extra_price)}
                                    size={11}
                                    color="#8E54E9"
                                    textStyle={{
                                      fontSize: 12,
                                      fontWeight: '700',
                                      color: '#8E54E9',
                                    }}
                                    style={{ marginTop: 2 }}
                                  />
                                )}
                              </View>
                            </TouchableOpacity>

                            {isIncrementable && (
                              <View style={[styles.stepper, { flexDirection: 'row' }]}>
                                <TouchableOpacity
                                  onPress={() => handleModifierDecrement(group.id, item.id)}
                                  style={styles.stepBtn}
                                >
                                  <Ionicons
                                    name="remove"
                                    size={16}
                                    color={qty > 0 ? '#8E54E9' : '#C4B5FD'}
                                  />
                                </TouchableOpacity>
                                <Text
                                  className="font-semibold text-gray-900"
                                  style={styles.stepCount}
                                >
                                  {qty}
                                </Text>
                                <TouchableOpacity
                                  onPress={() => handleModifierToggle(group.id, item.id, true)}
                                  style={styles.stepBtn}
                                >
                                  <Ionicons name="add" size={16} color="#8E54E9" />
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <View style={[styles.qtyRow, { flexDirection: rowDir }]}>
              <Text
                className="font-medium text-gray-600"
                style={{ fontSize: 14, textAlign, writingDirection }}
              >
                {t('quantity', { defaultValue: 'Quantity' })}
              </Text>
              <View style={[styles.stepper, styles.qtyStepper, { flexDirection: 'row' }]}>
                <TouchableOpacity
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  style={styles.stepBtn}
                >
                  <Ionicons name="remove" size={18} color={quantity > 1 ? '#8E54E9' : '#D1D5DB'} />
                </TouchableOpacity>
                <Text className="font-bold text-gray-900" style={styles.stepCount}>
                  {quantity}
                </Text>
                <TouchableOpacity onPress={() => setQuantity(quantity + 1)} style={styles.stepBtn}>
                  <Ionicons name="add" size={18} color="#8E54E9" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleAddToCart}
              style={[styles.cta, { flexDirection: rowDir }]}
              activeOpacity={0.9}
            >
              <Ionicons name="bag-outline" size={18} color="white" />
              <Text
                className="font-bold"
                style={{ color: '#fff', fontSize: 15, textAlign: 'center' }}
              >
                {t('add_to_cart', { defaultValue: 'Add to Cart' })}
              </Text>
              <View style={styles.ctaDot} />
              <MoneyAmount
                amount={totalPrice}
                size={13}
                color="#FFFFFF"
                textStyle={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '85%',
    direction: 'ltr',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E9D5FF',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMeta: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(142,84,233,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  attrBlock: {
    marginBottom: 12,
  },
  chipWrap: {
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  chipSelected: {
    borderColor: '#8E54E9',
    backgroundColor: 'rgba(142,84,233,0.06)',
  },
  colorChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  colorChipSelected: {
    borderColor: '#8E54E9',
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  colorCheck: {
    position: 'absolute',
    top: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#8E54E9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  modifierGroup: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modifierRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 8,
  },
  modifierRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  modifierLabel: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkOn: {
    borderColor: '#8E54E9',
    backgroundColor: '#8E54E9',
  },
  stepper: {
    alignItems: 'center',
    gap: 6,
  },
  qtyStepper: {
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCount: {
    fontSize: 14,
    minWidth: 18,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F4F6',
    gap: 10,
  },
  qtyRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cta: {
    height: 48,
    borderRadius: 16,
    backgroundColor: '#8E54E9',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
});
