# 다국어 정책

지원 언어는 한국어 `ko`와 영어 `en`이다.

## 문자열 관리

`src/i18n/messages.ts`의 `ko` 키가 기준이며 `en`은 `Record<MessageKey, string>`이다. 빠지거나 잘못 쓴 키는 TypeScript 빌드에서 오류가 난다. 화면 이름, 필드, 툴팁, 접근성 이름, 오류, 알림, 대화상자, 기본 이름을 사전에서 가져온다. 기능 코드에 문장을 직접 추가하지 않는다.

`{name}`, `{count}` 등의 매개변수를 사용한다. 동적 값을 포함한 문장을 조각으로 이어 붙이지 않는다. 숫자 표시에는 `useI18n().number`와 `Intl.NumberFormat`을 사용한다. 시간코드 `mm:ss.xx`와 JSON 숫자는 언어에 영향을 받지 않는 형식이다. `Star Studio`, 버전 식별자, 단위 `u`, 시드는 번역하지 않는다.

## 언어 결정과 저장

1. 브라우저에 저장한 `fireworks-studio:locale`이 ko/en이면 사용한다.
2. 없으면 브라우저 언어가 ko로 시작할 때 한국어, 그 외에는 영어다.
3. 헤더의 언어 선택을 즉시 적용하고 `document.documentElement.lang`과 문서 제목을 함께 바꾼다.
4. 저장소 접근이 불가능해도 현재 세션의 언어 전환은 동작한다.

언어는 ShowDocument나 내보내는 JSON에 넣지 않는다. 사용자가 지은 이름과 이전 파일에서 가져온 이름은 내용이므로 번역하지 않는다. 프리셋 이름/초기 이름은 생성 시점의 언어를 사용하며 나중에 언어를 바꿔도 작성된 이름은 유지한다.

## 상태 경계

localeStore는 문서/재생 상태와 별도다. React 편집 필드와 도움말은 localeStore의 locale만 구독한다. 알림은 번역된 문자열 대신 키와 매개변수를 보관하여 열려 있는 알림도 언어를 바꾸면 갱신한다. 입력 오류의 필드명은 발생 시점의 레이블을 매개변수로 사용한다.

CanvasHost는 언어를 구독하지 않는다. StudioSession이 언어 변경 시 캔버스의 접근성 설명만 바꾼다. 엔진은 번역/localeStore를 참조하지 않으며 언어 변경으로 재계산하거나 카메라를 초기화하지 않는다.

## 도움말과 대화상자

Radix Tooltip으로 hover/focus, Escape, 화면 가장자리 충돌 처리와 portal을 제공한다. 도움말 아이콘은 클릭으로도 열어 터치에서도 내용을 읽을 수 있다. 설명은 해당 설정의 범위, 값을 늘리거나 줄였을 때의 변화, 다른 설정과의 관계를 포함한다. 프리셋/보관함/큐의 복사 범위를 반복해서 명시한다.

큐 추가와 순차 배치는 Radix Dialog의 제목/설명/포커스 제한/Escape를 사용한다. 드래그를 사용할 수 없는 환경에서는 대화상자와 큐 상세의 숫자/발사대 입력이 같은 작업을 제공한다.

## 확장 시 확인

새 언어를 추가하려면 Locale 타입, 초기 선택 정책, 언어 선택 옵션과 전체 사전을 함께 추가한다. 새 필드를 만들 때 레이블·도움말·접근성 이름·오류까지 번역 키를 정의한다. 긴 영어 레이블과 모바일 패널에서 줄바꿈을 확인한다. 새 레이블 때문에 문서/엔진의 타입이나 결과를 바꾸지 않는다.

참고: [React 외부 저장소 구독](https://react.dev/reference/react/useSyncExternalStore), [Radix Tooltip](https://www.radix-ui.com/primitives/docs/components/tooltip), [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog).
