export const presentAtLocation = (object, locationId) => Boolean(object && !object.is_deleted &&
  !object.absent_at_location_ids?.includes(locationId) &&
  (object.present_at_all_locations !== false || object.present_at_location_ids?.includes(locationId)));

export function variationAtLocation(item, locationId) {
  return item?.item_data?.variations?.find(variation => presentAtLocation(variation, locationId) &&
    variationPrice(variation, locationId)?.amount != null);
}

export function variationPrice(variation, locationId) {
  const data = variation?.item_variation_data;
  return data?.location_overrides?.find(override => override.location_id === locationId)?.price_money ?? data?.price_money;
}

export function availableAtLocation(item, variation, locationId, now = Date.now()) {
  if (!presentAtLocation(item, locationId) || item.item_data?.is_archived || !presentAtLocation(variation, locationId)) return false;
  const override = variation.item_variation_data?.location_overrides?.find(entry => entry.location_id === locationId);
  return !override?.sold_out || Boolean(override.sold_out_valid_until && Date.parse(override.sold_out_valid_until) <= now);
}
