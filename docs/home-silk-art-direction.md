# 首页主视觉：银紫流光丝带

2026-09-24。使用内置 image_gen 工具生成；未调用 CLI/API fallback。

## 交付

- 主视觉素材：`dist/assets/home-silk-v1.png`（1254 × 1254，约 1.3 MB）
- 动效实现：`dist/home-scene.js`
- 主视觉是生成的静态素材，网页通过 Canvas 添加轻微浮动、摆动、呼吸和鼠标视差；不是实时三维模型旋转。
- 保留暂停、减少动态效果偏好、离开视口和后台页面停止绘制。
- 移除网格环和中央重复品牌文字。素材在独立区域完整展示，与标题、AI 输入框分开。

## 最终生成提示词

Use case: stylized-concept. Asset type: premium generative-art hero sculpture for a refined dark personal AI workspace website named 源流. Generate a single exquisite sculptural Möbius ribbon, an uninterrupted broad band with one graceful half twist. This must look like a crafted high-end 3D art direction piece, not a diagram, CAD wireframe, doughnut, plastic torus, or a glowing sci-fi HUD. The silhouette is elongated and asymmetrical, sweeping diagonally from lower left to upper right, with a dramatic elegant fold where the ribbon turns from a broad visible face into a thin edge. Clear sense of front and back, negative space through the center. Material: incredibly delicate translucent frosted optical glass blended with satin, pearlescent silver-lilac, very pale lavender surfaces, gentle ice-blue refracted edges, thin fine white specular highlights. Realistic soft large studio area-light reflections, subtle inner reflection and ambient occlusion, sophisticated restrained luminance, sharp beautifully shaped edges, rounded organic continuity. A few extremely fine longitudinal striations in the material, NOT a network or grid. Spacious art-gallery minimalism and surreal editorial digital sculpture. Three-quarter view, subject completely visible centered in the image, occupies 75 percent of width and 65 percent of height, generous 12 percent empty padding on every side. Pure near-black navy background RGB 7,10,18 perfectly uniform at all edges to match the website. NO stars, NO ground, NO pedestal, NO ground shadow, NO sphere, NO particles, NO separate orbit rings, NO text, NO letters, NO logo, NO border, NO UI. Square 1536x1536 composition. Strong shape and beautiful material even at small website sizes.
