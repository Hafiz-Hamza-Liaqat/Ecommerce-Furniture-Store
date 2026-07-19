# RC8.5 — Media Architecture Report

## Asset-driven model

```text
Product
  └─ ProductMediaCollection (resolveProductMedia)
       ├─ gallery[]          → ProductGallery
       ├─ spin: SpinSequence → ProductSpinViewer
       └─ models { glb, gltf, usdz } → capability flags only
```

## Expected production folder layout

```text
/product-media
  /meridian-sofa
    gallery/
      image01.jpg
      image02.jpg
    360/
      row01/
        frame001.jpg
        frame002.jpg
        …
      row02/          # future elevation
        frame001.jpg
        …
      row03/
        …
    models/
      product.glb
      product.usdz
```

## Types

- `GalleryMediaItem` — `url` + optional `zoomUrl` (hi-res)
- `SpinSequence` — `frameCount`, `rows[]`, timing / pixels-per-frame
- `ProductModelAssets` — future GLB/GLTF/USDZ
- Catalogue remains backward compatible via legacy `spinFrames`

## Extension points

| Capability | Today | Later |
|---|---|---|
| Gallery + Amazon magnifier | Rendered | Same |
| 360 sequence (1…N rows) | Rendered | Drop-in frames |
| GLB / GLTF / USDZ | `data-future-*` + note | Swap in model viewer |

No CQRS / API / Policy changes required to onboard production photography.
