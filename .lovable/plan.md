# Broaden Fairvital supplement suggestions

## Build
- Expand the Fairvital catalog mapping beyond Omega-3 to common measurable nutrient markers such as vitamin D, iron/ferritin, vitamin B12, folate, magnesium, zinc, selenium, calcium, copper, and vitamins A, C, E, and K.
- Match both the app’s known marker IDs and marker names imported from blood-test PDFs.
- Continue recommending only when the latest measured value is below its reference range; never recommend for normal or high values.
- Link each suggestion to the corresponding Fairvital search result so the shop remains responsible for products, availability, prices, and checkout.

## Verification
- Add focused tests for multiple low markers, imported marker names, and the existing no-suggestion rules.
- Run the relevant tests and verify the Plan page in the preview.

## Technical details
- Keep catalog data in the existing product placeholder, ready for the Shopware Store API later.
- Deduplicate suggestions so one blood marker yields one relevant Fairvital category.
