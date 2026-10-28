// Widget validation constants from APIEase; see provenance.json.
export const PUBLIC_HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SAMPLE_REQUESTS = [{ id: 'sampleRequest1' }, { id: 'sampleRequest2' }];
export const EMBEDDED_REQUEST_PARAMETER_NAMES = Object.freeze([
  'headersEmbedded', 'queryParamsEmbedded', 'liquidParamsEmbedded', 'flowParamsEmbedded',
  'pathParamsEmbedded', 'bodyEmbedded', 'systemParamsEmbedded',
]);
export const ADMIN_WIDGET_UI_LIMITS = Object.freeze({
  maximumSourceCharacters: 65536, maximumComponents: 50, maximumTextCharacters: 10000,
  maximumInputCharacters: 4000, maximumNameCharacters: 64, maximumLabelCharacters: 1024,
});
export const ADMIN_WIDGET_TARGETS = Object.freeze([
  "",
  "admin.order-details.block.render",
  "admin.product-details.block.render",
  "admin.product-variant-details.block.render",
  "admin.customer-details.block.render",
  "admin.collection-details.block.render",
  "admin.draft-order-details.block.render",
  "admin.abandoned-checkout-details.block.render",
  "admin.gift-card-details.block.render",
  "admin.catalog-details.block.render",
  "admin.company-details.block.render",
  "admin.company-location-details.block.render",
  "admin.order-details.action.render",
  "admin.product-details.action.render",
  "admin.product-variant-details.action.render",
  "admin.customer-details.action.render",
  "admin.collection-details.action.render",
  "admin.draft-order-details.action.render",
  "admin.abandoned-checkout-details.action.render",
  "admin.gift-card-details.action.render",
  "admin.catalog-details.action.render",
  "admin.company-details.action.render",
  "admin.discount-details.action.render",
  "admin.order-index.selection-action.render",
  "admin.product-index.selection-action.render",
  "admin.customer-index.selection-action.render",
  "admin.draft-order-index.selection-action.render",
  "admin.discount-index.selection-action.render"
]);
