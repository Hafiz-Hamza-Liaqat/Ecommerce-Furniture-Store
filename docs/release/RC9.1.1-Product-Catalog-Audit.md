# RC9.1.1 — Product Catalog Audit

- **Date:** 2026-07-20

## Method

Unit freeze: `catalogue-blog.test.ts` asserts every `taxonomyLeaves()` slug has ≥2 `CATALOGUE` products; sofa vs bed imagery disjoint; demo brand hooks present.

## Leaf coverage

All leaves under Living Room, Bedroom, Dining, Office, Outdoor, Storage, Tables, Chairs, Sofas family — **≥2 products each** (automated).

## Notes

- Parent hubs (e.g. `/furniture/living-room`) continue to list products that include the parent slug where assigned.
- Featured heroes (`meridian-sofa`, etc.) retained and merged with demos by id.

## Verdict

**PASS**
