# Daytlas transparent artwork v1.1

1 October 2026. User explicitly superseded the white background requirement for UI logo use. Original v1.0 remains intact.

`logo.svg`: original outlined Onest wordmark + original master symbol pixels inside a native SVG silhouette clip. `symbol.svg`: same symbol alone. True transparent exterior; no white SVG rect or CSS plate. It is a hybrid SVG, not a fully vector sphere reconstruction. No font dependency. The dark wordmark is intended for light surfaces.

The clip defines the 19 sphere silhouettes in the 1254px master coordinate space. This keeps the original sphere artwork rather than publishing generated approximations. Two automated alpha extraction attempts had visible fringe and were rejected. Original PNG remains embedded without alteration. Generated results are not production assets.

Shared asset source: src/lib/brand-config.ts → public/brand/v1.1. Brand, BrandLogo and BrandMark use these paths. Launcher icons/social compositions retain their intentionally opaque original canvas.
