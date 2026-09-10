# 여의도 야경 스카이라인

`yeouido-city.blend`는 수정 가능한 Blender 원본이고, `public/models/yeouido-night-skyline.glb`는 앱에서 읽는 경량 glTF 바이너리입니다. 사진을 지적 측량한 결과가 아니라, 첨부된 여의도 사진의 실루엣과 건물 간 앞뒤 관계를 바탕으로 만든 건축적 근사 모델입니다.

Blender 4.5 이상에서 다음처럼 다시 생성할 수 있습니다.

```sh
/Users/yangmyeongsu/.cache/codex-blender/4.5.13/Blender.app/Contents/MacOS/Blender -b --python scripts/build-yeouido.py
```

원본은 `IFC`, `Parc1`, `East secondary cluster`, `Yeouido riverside park` 컬렉션과 편집용 랜드마크 그룹으로 구성됩니다. 열면 대각 강변 시점 카메라와 스튜디오 조명이 보이지만, GLB에는 카메라와 조명이 포함되지 않습니다.

Blender에서는 Z가 위이고 -Y가 강변 전면입니다. GLB/Three.js에서는 지면이 local Y=0, 전면이 local +Z가 됩니다. 사진의 정확한 측량값이 아닌 참고 사진 기반 근사이며, 앱에서는 전체 모델을 `z=-925` 부근에 두면 전면 공원(local +Z 약 250)은 약 -675, 도심부(local Z 0~-200)는 약 -925~-1125에 놓입니다. 모델 폭은 약 1,025, 깊이는 약 490, 최고 높이는 약 351입니다.
