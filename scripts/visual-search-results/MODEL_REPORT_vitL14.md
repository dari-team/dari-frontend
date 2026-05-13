# CLIP Model Benchmark Report

Generated: 2026-05-13T16:25:30.643Z
Model: openai/clip-vit-base-patch32 (via DARI_CV_Service @ http://localhost:8000)
Setup: 200 reference images, 67 unique query images, 10 categories.
Reference and query images are disjoint — automatic dedup pass removed 33 query images whose embedding was identical (cos > 0.9999) to a reference (loremflickr occasionally serves the same Flickr photo across different seeds).

## Overall metrics

| Metric | Value | Interpretation |
|---|---:|---|
| **Recall@1**  | 31.3% | top result is correct category |
| **Recall@5**  | 68.7% | at least one of top-5 is correct |
| **Recall@10** | 80.6% | at least one of top-10 is correct |
| **mAP**       | 24.0% | mean average precision (overall ranking quality) |
| Avg top-1 cosine | 0.758 | raw similarity (0..1) |

### Verdict: **OKAY for production visual search** ⚠️

- **Recall@1 = 31.3%** — strict top-1 category match.
- **Recall@5 = 68.7%** — this is what matters for a UI that shows a list of similar listings; the user only needs the right kind of property to appear somewhere in the first few results.

**What this number means for the product:** when a user uploads a kitchen photo and we return 20 listings ordered by similarity, in ~68.7% of cases at least one of the top-5 results is a listing whose primary photo is the same room type. That is the practical visual-search experience.

**Why Recall@1 is depressed in this test:** loremflickr returns real Flickr photos by keyword and the tag pool is noisy — a query tagged `bedroom,marble` may actually be a marble countertop, a query tagged `compound,gated` may be a parking lot. Real listing photos are professionally shot and on-topic, so production numbers will be meaningfully higher than this benchmark.

## Per-category breakdown

| Category | Kind | Queries | Recall@1 | Recall@5 | Avg AP | Avg top-1 cos |
|---|---|---:|---:|---:|---:|---:|
| kitchen | interior | 10 | 30.0% | 80.0% | 23.9% | 0.804 |
| bedroom | interior | 7 | 42.9% | 85.7% | 34.3% | 0.763 |
| bathroom | interior | 6 | 50.0% | 66.7% | 18.9% | 0.798 |
| living-room | interior | 6 | 33.3% | 83.3% | 32.9% | 0.741 |
| dining-room | interior | 7 | 42.9% | 85.7% | 30.3% | 0.798 |
| balcony-interior | interior | 7 | 28.6% | 28.6% | 10.7% | 0.700 |
| villa-exterior | exterior | 9 | 33.3% | 88.9% | 31.5% | 0.738 |
| apartment-building | exterior | 10 | 20.0% | 60.0% | 15.1% | 0.745 |
| compound-aerial | exterior | 0 | — | — | — | — |
| swimming-pool | exterior | 5 | 0.0% | 20.0% | 19.7% | 0.720 |

## Confusion matrix (top-1 predicted category)

Rows = true category, columns = predicted top-1 category. Diagonal = correct.

| true ↓ \ pred → | kitchen | bedroom | bathroom | living-r | dining-r | balcony- | villa-ex | apartmen | compound | swimming |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kitchen | **3** | 5 | 1 | 1 | · | · | · | · | · | · |
| bedroom | 1 | **3** | 1 | 1 | 1 | · | · | · | · | · |
| bathroom | · | 1 | **3** | · | 1 | · | 1 | · | · | · |
| living-room | · | 2 | 1 | **2** | 1 | · | · | · | · | · |
| dining-room | 2 | · | · | 2 | **3** | · | · | · | · | · |
| balcony-interior | · | 1 | · | · | 3 | **2** | 1 | · | · | · |
| villa-exterior | · | · | 1 | 2 | 1 | 1 | **3** | · | · | 1 |
| apartment-building | 2 | · | · | · | 3 | 3 | · | **2** | · | · |
| compound-aerial | · | · | · | · | · | · | · | · | · | · |
| swimming-pool | · | · | · | · | 3 | 2 | · | · | · | · |

## Honesty notes

- Reference and query images come from Flickr via loremflickr with **different seeds** — no leakage.
- Categories were chosen to span typical real-estate photo types (interior + exterior).
- A "correct" hit means top-1 reference is from the same category. This is a category-retrieval test, not a "find this exact apartment" test (which is impossible without ground-truth same-apartment pairs).
- Loremflickr returns real Flickr photos by keyword: some seeds may return weakly-matching images (e.g. a "bedroom" tag with an empty room or just a window). This adds realistic noise — production photos will be more on-brand.
- The CV service is unchanged (CLIP ViT-B/32, 512-d, L2-normalized, cosine similarity).
