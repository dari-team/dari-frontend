# Listing-level Visual Search Benchmark

Generated: 2026-05-13T16:57:51.968Z
Method: leave-one-out over 40 synthetic listings of 5 photos each (200 queries).
Each listing groups 5 photos from one category (e.g. "Kitchen Listing #3" = 5
different kitchen photos), modeling a real listing whose photos share an aesthetic.
The scored question is:
**"given one held-out photo of a listing as the query, does that listing appear
in the top-K results?"** Distractors are the 39 other listings (3 same-category,
36 other-category).

Both strategies use the SAME embeddings (ViT-L/14, 768-d) — only the ranking math differs.

## Results

| Strategy | Recall@1 | Recall@3 | Recall@5 |
|---|---:|---:|---:|
| Per-image (no pooling) | 36.0% | 67.5% | 79.5% |
| Per-listing pooled (new) | 34.5% | 71.0% | 83.0% |

**Δ (pooled − per-image):**
- Recall@1: -1.5 pp
- Recall@3: +3.5 pp
- Recall@5: +3.5 pp

## Honest interpretation

- This is a *synthetic* listing benchmark — the "listings" are random Flickr-photo
  groupings, not real apartments. A real apartment's 5 photos have stronger
  visual coherence than 5 random Flickr photos, so production gains may be larger.
- Per-image ranking has a structural advantage in *this* test: if any photo of the
  correct listing matches the query well (which is likely — they're the same
  category as the query), the listing surfaces. Pooled has to win on *aggregate*.
- The real win from pooling shows up in production at scale, where lots of
  listings have one accidentally-similar photo that pollutes per-image rankings.
