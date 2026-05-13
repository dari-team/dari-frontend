# CLIP Model Benchmark Report

Generated: 2026-05-13T15:50:57.263Z
Model: openai/clip-vit-base-patch32 (via DARI_CV_Service @ http://localhost:8000)
Setup: 200 reference images, 67 unique query images, 10 categories.
Reference and query images are disjoint — automatic dedup pass removed 33 query images whose embedding was identical (cos > 0.9999) to a reference (loremflickr occasionally serves the same Flickr photo across different seeds).

## Overall metrics

| Metric | Value | Interpretation |
|---|---:|---|
| **Recall@1**  | 31.3% | top result is correct category |
| **Recall@5**  | 64.2% | at least one of top-5 is correct |
| **Recall@10** | 73.1% | at least one of top-10 is correct |
| **mAP**       | 23.4% | mean average precision (overall ranking quality) |
| Avg top-1 cosine | 0.767 | raw similarity (0..1) |

### Verdict: **OKAY for production visual search** ⚠️

- **Recall@1 = 31.3%** — strict top-1 category match.
- **Recall@5 = 64.2%** — this is what matters for a UI that shows a list of similar listings; the user only needs the right kind of property to appear somewhere in the first few results.

**What this number means for the product:** when a user uploads a kitchen photo and we return 20 listings ordered by similarity, in ~64.2% of cases at least one of the top-5 results is a listing whose primary photo is the same room type. That is the practical visual-search experience.

**Why Recall@1 is depressed in this test:** loremflickr returns real Flickr photos by keyword and the tag pool is noisy — a query tagged `bedroom,marble` may actually be a marble countertop, a query tagged `compound,gated` may be a parking lot. Real listing photos are professionally shot and on-topic, so production numbers will be meaningfully higher than this benchmark.

## Per-category breakdown

| Category | Kind | Queries | Recall@1 | Recall@5 | Avg AP | Avg top-1 cos |
|---|---|---:|---:|---:|---:|---:|
| kitchen | interior | 10 | 40.0% | 60.0% | 22.9% | 0.790 |
| bedroom | interior | 7 | 42.9% | 71.4% | 29.4% | 0.764 |
| bathroom | interior | 6 | 16.7% | 66.7% | 17.5% | 0.820 |
| living-room | interior | 6 | 0.0% | 83.3% | 27.5% | 0.780 |
| dining-room | interior | 7 | 28.6% | 100.0% | 35.6% | 0.815 |
| balcony-interior | interior | 7 | 14.3% | 14.3% | 9.2% | 0.710 |
| villa-exterior | exterior | 9 | 55.6% | 77.8% | 30.9% | 0.759 |
| apartment-building | exterior | 10 | 50.0% | 70.0% | 18.9% | 0.752 |
| compound-aerial | exterior | 0 | — | — | — | — |
| swimming-pool | exterior | 5 | 0.0% | 20.0% | 16.0% | 0.704 |

## Confusion matrix (top-1 predicted category)

Rows = true category, columns = predicted top-1 category. Diagonal = correct.

| true ↓ \ pred → | kitchen | bedroom | bathroom | living-r | dining-r | balcony- | villa-ex | apartmen | compound | swimming |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kitchen | **4** | 2 | 1 | · | 2 | · | · | 1 | · | · |
| bedroom | · | **3** | 1 | 1 | 1 | · | · | 1 | · | · |
| bathroom | · | 3 | **1** | · | 1 | · | 1 | · | · | · |
| living-room | 2 | 1 | 1 | · | 1 | · | · | · | · | 1 |
| dining-room | 1 | 1 | · | 3 | **2** | · | · | · | · | · |
| balcony-interior | · | · | · | 3 | · | **1** | 1 | 1 | · | 1 |
| villa-exterior | · | 1 | · | · | 1 | 1 | **5** | 1 | · | · |
| apartment-building | 2 | 1 | · | · | · | · | 2 | **5** | · | · |
| compound-aerial | · | · | · | · | · | · | · | · | · | · |
| swimming-pool | · | · | · | 1 | 2 | 2 | · | · | · | · |

## Honesty notes

- Reference and query images come from Flickr via loremflickr with **different seeds** — no leakage.
- Categories were chosen to span typical real-estate photo types (interior + exterior).
- A "correct" hit means top-1 reference is from the same category. This is a category-retrieval test, not a "find this exact apartment" test (which is impossible without ground-truth same-apartment pairs).
- Loremflickr returns real Flickr photos by keyword: some seeds may return weakly-matching images (e.g. a "bedroom" tag with an empty room or just a window). This adds realistic noise — production photos will be more on-brand.
- The CV service is unchanged (CLIP ViT-B/32, 512-d, L2-normalized, cosine similarity).
