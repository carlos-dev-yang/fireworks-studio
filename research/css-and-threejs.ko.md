CSS로 가능한 불꽃 표현과 Three.js 선택 근거
==========================================

조사일: 2026-09-06. 공식 문서와 브라우저 기술 자료를 확인했다. 라이브러리의 기능과 이 프로젝트에 대한 설계 판단을 구분한다. [프로젝트 구조안](/Users/carlos-yang/dev/fireworks-simulator/docs/architecture/project-structure.ko.md)과 함께 읽는다.

**CSS로 3D 표현을 할 수 있다.** `perspective`, `translate3d`, 회전 변환, `transform-style: preserve-3d`로 DOM 요소를 깊이 있는 공간에 배치할 수 있다. 따라서 ‘CSS는 2D만 가능하다’는 설명은 틀리다. 다만 불티·잔광·연기·카메라·선택 도구가 함께 필요한 주 시뮬레이션 화면에는 Three.js를 권한다. 이 권고는 기능과 구조에 근거한 판단이며 같은 장면의 성능 비교 실험 결과는 아니다. [MDN perspective](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/perspective), [MDN transform-style](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transform-style)

**1. 비교 기준은 ‘3D처럼 보이는가’보다 ‘무엇을 독립적으로 제어하는가’다.**

| 방법 | 표현할 수 있는 것 | 추가 부담·제약 | 이 프로젝트에서의 후보 용도 |
|---|---|---|---|
| CSS 배경·그림자 묶음 | 점·광채·방사형 펼침의 대략적인 인상 | 묶음 확대만으로는 각 점의 다른 궤적·수명·분기를 표현하기 어려움 | 형태 아이콘, UI 장식 |
| CSS 3D + DOM 발광점 | 깊이 배치, 회전, 상대적 확대, 개별 점 애니메이션 | 요소·스타일·애니메이션 관리와 복합 효과 구현이 늘어남 | 소규모 표현 실험, 단순 미리보기 |
| Canvas 2D | 한 화면에 많은 점과 선을 직접 그림 | 3D 카메라·투영·깊이 순서를 직접 다뤄야 함 | 고정 시점의 별도 단순 모드가 필요할 때 |
| Three.js | 3D 장면·카메라·점·메시·재질을 일관되게 구성 | 불꽃의 계산·꼬리·발광 표현은 별도 구현 필요 | 주 시뮬레이션 뷰포트 |

표의 적합성은 설계 평가다. CSS의 보편적인 최대 입자 수나 Three.js의 보장 프레임률을 뜻하지 않는다.

**2. CSS의 대략적 효과를 만드는 방법**

**발광점:** 작은 요소에 `radial-gradient()`로 중심에서 가장자리로 흐려지는 색을 준다. 이동은 `transform`, 밝기 변화는 말단 요소의 `opacity`로 제어할 수 있다. 큰 블러 하나로 전체 장면을 흐리는 것과 개별 발광점의 외관은 다르다. [MDN radial-gradient](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/gradient/radial-gradient)

**빠르게 퍼지는 인상:** 여러 점을 배경이나 그림자로 미리 배치하고 전체를 확대·감쇠시키면 하나의 짧은 시각 효과를 만들 수 있다. 이는 모든 점에 같은 변환을 적용하는 조형 방법이다. 개별 개체 편집이 필요하면 점별 요소나 별도 렌더 데이터로 전환해야 한다.

**입체 분포:** 효과의 점을 가상 좌표에 놓고 상위 요소에 시점 변환을 적용한다. 점을 화면에 향한 작은 평면으로 표현하려면 위치 변환과 카메라 반대 회전을 서로 다른 요소에 나눠 줄 수 있다. 아래는 필요한 CSS 역할을 보여 주는 설명용 조각이며, 변수는 호출하는 미리보기에서 설정한다.

~~~css
.preview {
  perspective: var(--preview-perspective);
}

.world,
.particles,
.particle {
  transform-style: preserve-3d;
}

.world {
  transform: rotateX(var(--view-pitch)) rotateY(var(--view-yaw));
}

.particle {
  transform: translate3d(var(--point-x), var(--point-y), var(--point-z));
}

.glow {
  width: var(--point-size);
  height: var(--point-size);
  background: radial-gradient(circle, var(--core-color), var(--glow-color), transparent);
  opacity: var(--point-opacity);
}
~~~

여기서 CSS 길이는 미리보기의 화면 좌표다. 실제 재료의 크기나 배치 단위를 정의하지 않는다. `perspective` 값의 변경, 공간 전체의 확대, 실제 카메라 거리 변경도 서로 다른 조작이므로 운영 편집기에서 모두 ‘줌’이라는 같은 데이터로 섞지 않는다.

**시간 제어:** Web Animations API(WAAPI)로 만든 애니메이션은 정지한 상태에서도 `currentTime`을 설정할 수 있다. 따라서 시간 슬라이더로 미리보기의 특정 순간을 표시할 수 있다. [MDN Animation.currentTime](https://developer.mozilla.org/en-US/docs/Web/API/Animation/currentTime)

~~~js
// track에는 시각 미리보기의 키프레임과 timing이 들어 있다.
const animation = element.animate(track.keyframes, track.timing);
animation.pause();
animation.currentTime = effectAgeMs;
~~~

운영 앱에 연결한다면 공연 시각과 큐의 시작 시각으로 효과 나이를 구하고, 시작 전·종료 후 표시 규칙을 함께 적용한다. CSS 애니메이션을 여러 개 독립적으로 시작하는 것만으로 JSON 타임라인의 동기화가 해결되는 것은 아니다. WAAPI의 역재생은 미리 정한 키프레임을 거꾸로 평가하는 기능이며, 상태가 누적되는 시뮬레이션의 과거 복원과는 책임이 다르다. [MDN WAAPI 사용 안내](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Using_the_Web_Animations_API)

**3. 3D 공간을 평평하게 만들 수 있는 CSS 속성**

`preserve-3d`는 자동 상속되지 않으므로 공간을 유지할 중간 요소에도 적용해야 한다. 또한 3D 자식을 가진 요소에 `opacity < 1`, `filter`, 특정 `overflow` 값, `mix-blend-mode` 등을 적용하면 자식이 먼저 평면으로 합성될 수 있다. MDN은 `overflow: visible`과 `clip`을 이 평면화 조건의 예외로 명시한다. [MDN의 평면화 조건](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transform-style#description)

이 때문에 ‘불꽃 전체 부모에 블러와 투명도를 주면 된다’는 구현은 깊이 표현을 깨뜨릴 수 있다. 공간을 유지하는 부모와 외관을 담당하는 말단 요소를 분리하고 결과를 확인해야 한다. `mix-blend-mode: screen` 같은 CSS 합성을 물리적인 광량 합산과 동일하다고 설명해서도 안 된다.

**4. Three.js의 CSS3DRenderer는 별도의 경로다.**

Three.js에는 DOM 요소에 3D 변환을 적용하는 `CSS3DRenderer`도 있다. 공식 문서는 이 렌더러에서 Three.js의 재질·geometry를 사용할 수 없고, 브라우저 및 디스플레이 배율은 100%만 지원한다고 명시한다. 마지막 제한은 장면 안의 카메라 확대 자체가 불가능하다는 뜻은 아니다. [CSS3DRenderer 공식 문서](https://threejs.org/docs/pages/CSS3DRenderer.html)

따라서 ‘Three.js를 쓰되 CSS3DRenderer로 모든 불꽃을 그린다’는 선택은 WebGL 기반 뷰포트와 같은 기능을 얻는 선택이 아니다. 3D 위치에 DOM 안내를 놓는 용도와 주 입자 렌더링을 구분하는 편이 적절하다. CSS 3D에도 공간 내 깊이 표현은 있지만, DOM과 WebGL 캔버스가 자동으로 같은 깊이 버퍼를 공유하는 것은 아니다.

**5. 계산과 화면 표현의 경계는 CSS에서도 필요하다.**

~~~text
공연 JSON → 효과의 시간·생성 규칙 → 계산 결과
                                  ├─ Three.js에 전달
                                  └─ 작은 실험에서는 DOM transform에 전달
~~~

CSS는 결과를 표현하는 경로가 될 수 있다. 임의의 효과 입력에서 분기·수명·누적 이력을 계산하는 엔진의 책임은 여전히 남는다. CSS 미리보기를 먼저 만든 뒤 Rust에서 같은 규칙을 다시 만드는 두 개의 독립 엔진을 운영하는 방식은 권하지 않는다.

실제 효과 설정의 정확한 미리보기는 주 렌더러의 동일 결과를 사용해야 한다. CSS로 만든 형태 아이콘이나 장식이 사용자가 편집한 불꽃의 정확한 결과인 것처럼 표시되면 안 된다. 초기에는 CSS 예제를 표현 기법 확인에만 사용하고, 운영 편집기의 효과 미리보기는 Three.js 경로로 연결하는 안이다.

**6. 성능에 관해 확인한 범위**

브라우저 렌더링 지침은 이동 애니메이션에 `top`·`left`보다 `transform`을 사용하는 방법과 레이어 생성의 비용을 설명한다. `will-change`를 모든 점에 미리 붙이는 방식도 일반적인 해결책으로 권하지 않는다. [web.dev 애니메이션 가이드](https://web.dev/articles/animations-guide)

그렇다고 ‘CSS면 항상 GPU에서 처리돼 빠르다’거나 ‘Wasm이면 점 수와 무관하게 빠르다’는 결론은 나오지 않는다. DOM 요소 수, 스타일 변경, 애니메이션 객체, 그리기 영역, 투명한 표면 중첩과 블러 비용이 모두 영향을 준다. Three.js도 그리기 호출·입자 표현·화면 중첩·꼬리 이력 등에 따른 비용이 있다. 플랫폼별 한계값은 구현 후 같은 장면으로 측정해야 한다.

**7. 이번 표현 확인 예제**

대화에 표시할 CSS 예제는 동일한 96개 시각 표본을 평면 또는 구면에 배치한다. 시점 회전·상대 확대·시간 탐색·한 번 재생을 비교한다. JavaScript가 단순한 가상 펼침의 키프레임을 생성하고 CSS 3D와 WAAPI가 화면에 표시한다. Canvas와 Three.js는 사용하지 않았다.

96은 이 작은 예제의 설정이며 권장 최대 개체 수나 실제 발광체 수가 아니다. 키프레임은 표현 기법 확인용 파생 데이터이며 공연 JSON의 저장 형식 제안이 아니다. 시뮬레이션 엔진·발사대·분기·연기·꼬리 모델은 포함하지 않는다. 평면을 옆에서 보면 얇아지고 입체 분포는 깊이가 유지되는지 확인하는 것이 목적이다.

브라우저에서 확인한 내용은 다음과 같다.

- 736px와 360px 폭에서 화면과 조작 요소의 배치를 확인했다. 360px에서 1.20배 확대 상태도 확인했다.
- 평면·입체 전환, 시점 회전, 확대, 시간 탐색이 화면에 반영됐다.
- 2.00초 → 3.60초 → 2.00초로 탐색한 뒤 96개 점의 CSS 변환이 이전 2.00초 값과 모두 같았다. 이는 이 예제의 키프레임 재평가 확인이다.
- 처음부터 한 번 재생하면 4.00초에서 멈추고 재생 버튼으로 돌아왔다. 조작 요소의 접근성 이름을 확인했으며, 수집된 브라우저 오류·경고는 없었다.
- 이번 검사에서는 밝은 테마를 확인했다. 다른 브라우저·기기·어두운 테마의 실기 검사는 수행하지 않았다.

동작 검사는 기법의 가능성을 확인하는 것이며 성능 비교나 물리 정확도 평가가 아니다. Rust 엔진의 되감기·결정성 검증을 대신하지 않는다.

**8. 출처와 열람 범위**

| 출처 | 확인 범위 | 사용한 근거 |
|---|---|---|
| [MDN perspective](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/perspective) | 공식 웹 문서 | DOM의 원근 표현 |
| [MDN transform-style](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transform-style) | 본문, 상속 여부, 평면화 속성 목록 | 중간 요소의 3D 공간 유지와 합성 제약 |
| [MDN radial-gradient](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/gradient/radial-gradient) | 공식 웹 문서 | CSS로 그리는 방사형 색 변화 |
| [MDN currentTime](https://developer.mozilla.org/en-US/docs/Web/API/Animation/currentTime) | 본문·값·예시 | 정지 상태에서도 시각 변경 가능 |
| [MDN WAAPI](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Using_the_Web_Animations_API) | 시간 제어와 재생 관련 본문 | 키프레임 재생·탐색 |
| [web.dev 애니메이션](https://web.dev/articles/animations-guide) | transform, 레이어 생성, 성능 진단 부분 | 합성만으로 모든 비용이 해결되지 않음 |
| [Three.js CSS3DRenderer](https://threejs.org/docs/pages/CSS3DRenderer.html) | 공식 문서의 용도·제약 | DOM 렌더러와 WebGL 경로의 차이 |
| [Three.js 장면 구성](https://threejs.org/manual/en/creating-a-scene.html) | 공식 안내 | 장면·카메라·렌더러 |
| [Three.js Points](https://threejs.org/docs/pages/Points.html) | 공식 API 문서 | 점 집합의 화면 표현 |
| [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) | 공식 API 문서 | 같은 geometry·재질을 공유하는 인스턴스 표현 |
| [Three.js WebGPURenderer](https://threejs.org/manual/en/webgpurenderer.html) | 공식 안내와 이식 제약 | WebGL 2 대체 경로, 셰이더·후처리 전환 고려 |
| [R3F Basic Animations](https://r3f.docs.pmnd.rs/tutorials/basic-animations) | 검색 엔진에 색인된 공식 본문. 직접 문서 열람은 도구 오류 | useFrame과 참조를 통한 연속 갱신 |

외부 라이브러리를 설치하거나 같은 장면을 CSS와 Three.js로 각각 구현해 성능을 비교하지는 않았다. CSS 주 뷰포트를 권하지 않는 이유는 보편적인 수치 한계가 아니라 현재 요구 기능을 구성·유지하는 비용이다.
