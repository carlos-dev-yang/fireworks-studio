# 불꽃 시뮬레이터 자료 목록

조사일: 2026-09-05. 총 24건. 논문 6건, 인터뷰 3건, 화학 교육·해설 3건, 전문 도구·카탈로그 6건, 기술 문서·예제 6건.

각 항목의 ‘확인 범위’는 이번 조사에서 실제로 읽은 범위를 뜻한다. 원문 전체를 정독하거나 데모를 실행했다고 해석하면 안 된다. 요약에서 이어지는 ‘적용 제안’은 이 프로젝트에 대한 해석이다.

**C01 · [Fireworks: What Do We Know About Fireworks? — Further Exploration Activities](https://www.acs.org/education/chemmatters/resources/fireworks-what-do-we-know-about-fireworks/further-exploration-activities.html)**

화학 교육 · American Chemical Society · 발행일 미표기



- 확인 범위: 공식 교육자료 본문 중 색·발광 원리와 구성 요소 부분 확인
- 핵심 내용: 별(star)이라는 발광체, 원소와 색의 관계, 열복사와 분광 발광의 차이를 설명한다.
- 적용 제안: 색 계열과 발광 재질의 설명에 사용한다.
- 한계: 교육용 단순화가 있다. 역사적 조성 예시는 채택하지 않으며, 색 표는 실측 RGB 데이터가 아니다.
- 우선순위: 핵심

**C02 · [What’s in fireworks, and what produces those colorful explosions?](https://cen.acs.org/articles/95/i27/s-fireworks-produces-those-colorful.html)**

화학 해설·취재 · Elizabeth K. Wilson / Chemical & Engineering News · 2017-06-27



- 확인 범위: 원 매체 본문·전문가 취재 부분 확인
- 핵심 내용: 고온 입자의 연속적인 빛과 기체 상태 발광종의 색을 구별하고, 불꽃 색 연구를 소개한다.
- 적용 제안: 색을 원소 하나의 고정 RGB 값으로 치환하지 않는 근거.
- 한계: 2017년 취재다. 당시 연구 동향을 현재 상용 제품 성능으로 일반화하지 않는다.
- 우선순위: 핵심

**C03 · [Rebecca Lai and the chemistry of fireworks](https://chem.unl.edu/news/rebecca-lai-and-chemistry-fireworks/)**

화학 교육 · University of Nebraska–Lincoln, Department of Chemistry · 2024-06-28



- 확인 범위: 대학 공식 페이지의 검색 추출 본문 확인
- 핵심 내용: 발색·에너지 공급·산소 공급·결합 등 서로 다른 구성 요소의 역할을 설명한다.
- 적용 제안: 시뮬레이터의 설명용 화학 참고 카드에 사용한다.
- 한계: 제조·배합 설명을 게임의 계산식으로 옮기지 않는다.
- 우선순위: 보조

**P01 · [Particle Systems—a Technique for Modeling a Class of Fuzzy Objects](https://dl.acm.org/doi/10.1145/357318.357320)**

논문 · 컴퓨터그래픽스 · William T. Reeves · 1983-04

ACM Transactions on Graphics 2(2), 91–108. DOI: 10.1145/357318.357320. [별도 열람 경로](https://users.cs.northwestern.edu/~jet/Teach/2003_1winAdvGraphics/Papers/p359-reeves.pdf).

- 확인 범위: ACM 직접 접근은 403. 대학 호스팅 재인쇄 PDF의 초록·기본 입자 모델 부분 확인
- 핵심 내용: 입자의 생성·속성 변화·이동·소멸과 확률적 변화를 이용해 불·연기 같은 형태를 표현한다.
- 적용 제안: 입자 생명주기와 확률적 변이를 설계하는 기초.
- 한계: 불꽃축제 전용 모델도, 현대 웹 성능 검증도 아니다. PDF는 재인쇄본이라 페이지 번호가 다르다.
- 우선순위: 핵심

**P02 · [Fireworks controller](https://onlinelibrary.wiley.com/doi/10.1002/cav.287)**

논문 · 불꽃 애니메이션 · Hanli Zhao, Ran Fan, Charlie C. L. Wang, Xiaogang Jin, Yuwei Meng · 2009-05-05

Computer Animation and Virtual Worlds 20(2–3), 185–194. DOI: 10.1002/cav.287.

- 확인 범위: 출판사 서지·초록 확인; 방법 본문과 성능표 미확인
- 핵심 내용: 3D 형태의 점 표본, 역동역학, 계층적 분할로 모양을 제어하는 불꽃 애니메이션을 제안한다.
- 적용 제안: 링·하트·다단 개화처럼 형태가 중요한 효과의 후속 조사.
- 한계: 시각적으로 그럴듯한 형태 제어 연구다. 실제 제품으로 같은 모양을 만들 수 있다는 증거가 아니다.
- 우선순위: 핵심

**P03 · [Fireworks Simulator Based on an Improved Particle System](https://www.scientific.net/AMR.505.287)**

논문 · 불꽃 애니메이션 · Bin Tang, Bao Sheng Kang, Guo Dong Wang, Jian Chao Kang, Jian Dong Zhao · 2012-04

Advanced Materials Research 505, 287–292. DOI: 10.4028/www.scientific.net/AMR.505.287.

- 확인 범위: 출판사 서지·초록 확인; 전문 미확인
- 핵심 내용: 외부 XML 설정과 GPU 입자 처리를 결합하는 구성을 제안한다.
- 적용 제안: 효과 데이터와 실행 엔진을 분리하는 선행 사례.
- 한계: XNA 시대의 연구다. 현재 Rust·WebGPU의 성능이나 우월성을 입증하지 않는다.
- 우선순위: 보조

**P04 · [Customizing the Appearance of Sparks with Binary Metal Alloys](https://pmc.ncbi.nlm.nih.gov/articles/PMC9386707/)**

논문 · 불티의 색과 분기 · Philipp Memmel et al. · 2022-08-01

ACS Omega 7(32), 28408–28420. DOI: 10.1021/acsomega.2c03081.

- 확인 범위: 공개 원문의 검색 색인에 포함된 관측·결론·서지 확인. 직접 열기는 자동 접속 확인 화면; 원문 전체와 보충 영상 미검토
- 핵심 내용: 관측된 불티에서 시간에 따른 색 전환과 반복적인 분기 현상을 다룬다.
- 적용 제안: 시간별 색 곡선과 불티의 자식 입자 이벤트를 서로 분리해 표현할 근거.
- 한계: 실험실 불티 결과를 축제용 공중 불꽃에 그대로 적용할 수 없다. 배합·공정·실험 조건은 추출하지 않았다.
- 우선순위: 핵심

**P05 · [線香花火研究の最前線](https://www.jstage.jst.go.jp/article/jcombsj/60/193/60_156/_article/-char/ja/)**

논문 · 연소 현상 해설 · 井上 智博 / Chihiro Inoue · 2018

日本燃焼学会誌 60(193), 156–162. DOI: 10.20619/jcombsj.60.193_156.

- 확인 범위: J-STAGE 서지·영문 초록 확인; 일본어 전문 미검토
- 핵심 내용: 선향불꽃의 가느다란 가지가 연속적인 작은 액적의 분열과 연결됨을 설명한다.
- 적용 제안: 나뭇가지 같은 불티를 분기 이벤트로 모델링하는 참고.
- 한계: 선향불꽃을 다루므로 공중의 대형 별에 같은 메커니즘을 일괄 적용하지 않는다.
- 우선순위: 보조

**P06 · [航空力学に基づくパラシュートを用いた昼花火のシミュレーション](https://www.jstage.jst.go.jp/article/iieej/51/4/51_327/_article/-char/ja)**

논문 · 연기와 낮 불꽃 · 矢花 明莉, 藤澤 誠, 三河 正彦 · 2022

画像電子学会誌 51(4), 327–331. DOI: 10.11371/iieej.51.327.

- 확인 범위: J-STAGE 서지·초록 확인; 전문 미검토. J-STAGE 공개일은 2023-12-25
- 핵심 내용: 낙하산의 운동과 격자 기반 연기 유체 시뮬레이션을 별개로 결합한다.
- 적용 제안: 빛나는 입자와 연기 시스템을 분리하는 확장 연구.
- 한계: 낮 불꽃이 대상이다. 야간 축제의 초기 구현에 유체 해석이 필수라는 뜻은 아니다.
- 우선순위: 후속

**I01 · [[INTERVIEW] Fireworks designer to light up Seoul skies Oct. 6](https://www.koreatimes.co.kr/southkorea/society/20180928/interview-fireworks-designer-to-light-up-seoul-skies-oct-6)**

인터뷰 · Kim Hyun-bin / The Korea Times; interviewee Yoon Du-yeon · 2018-09-28



- 확인 범위: 원 인터뷰 본문의 콘셉트·선곡·연출 관련 대목 확인
- 핵심 내용: 한화 불꽃 디자이너가 콘셉트, 음악 선택, 공연 구조를 함께 맡는다고 설명한다.
- 적용 제안: 불꽃 선택·공간 배치·타임라인을 하나의 작업 흐름으로 연결한다.
- 한계: 인터뷰 당시의 작업 경험이며 현재 한화의 내부 도구 규격을 설명하지 않는다.
- 우선순위: 핵심

**I02 · [Phil and Lauren Grucci](https://www.arts.gov/stories/podcast/phil-and-lauren-grucci)**

인터뷰 · Jo Reed / National Endowment for the Arts · 2019-07-03



- 확인 범위: 공식 팟캐스트 전사 중 공연 설계·음악·관객 시점 관련 부분 확인; 오디오 미청취
- 핵심 내용: 주제와 공연 공간에 맞춰 효과와 음악을 구성하며, 같은 연출도 관객 위치에 따라 달라 보인다고 설명한다.
- 적용 제안: 공연장과 관객 카메라를 독립 데이터로 저장하고 함께 미리 본다.
- 한계: 제품 수·인력·기록 등 인터뷰 속 수치는 2019년 당시의 진술이다.
- 우선순위: 핵심

**I03 · [Fireworks Show Designer Phil Grucci](https://profoundlypointless.com/episodes/2021/6/29/fireworks-show-designer-phil-grucci)**

인터뷰 · Profoundly Pointless; interviewee Phil Grucci · 2021-06-29



- 확인 범위: 원 인터뷰 전사의 공간·음악·효과 성격 대목 확인; 오디오 미청취
- 핵심 내용: 공연 공간을 정하고 음악의 강약·정서에 어울리는 효과를 배치하는 과정을 설명한다.
- 적용 제안: 일괄 발사 외에 좌우 흐름·대칭·밀도·잔광의 길이를 편집할 필요.
- 한계: 개별 회사의 창작 방식으로, 모든 제작사의 표준 절차는 아니다.
- 우선순위: 보조

**D01 · [Glossary of VDL Effect Terms](https://finale3d.com/documentation/vdl-effect-glossary/)**

전문 도구 · 효과 사전 · Finale 3D · 발행일 미표기 · 문서 수정일 2026-06-10



- 확인 범위: 공식 용어집의 형태·꼬리·분기·시간 변화 정의 확인; 데모 영상 미재생
- 핵심 내용: 여러 불꽃 효과의 용어, 설명, 예시 영상 링크를 제공한다.
- 적용 제안: 효과 분류의 출발점과 시각 참고 자료의 발견 경로.
- 한계: VDL 고유 정의와 미완성 시뮬레이션 항목이 있다. 공개 열람이 데이터·영상 재배포 허락은 아니다.
- 우선순위: 핵심

**D02 · [Prefire](https://finale3d.com/documentation/prefire/)**

전문 도구 · 타이밍 · Finale 3D · 발행일 미표기



- 확인 범위: 공식 문서의 prefire 개념과 시각 효과 시점 구분 확인
- 핵심 내용: 발사 신호 시점과 음악에 맞추는 시각 효과 시점 사이의 간격을 별개로 다룬다.
- 적용 제안: 큐의 기준 시점과 효과 내부 마커를 분리하는 설계에 반영.
- 한계: 본문의 실제 장치 지연·보정·수치 예제는 시뮬레이터 데이터로 수집하지 않았다.
- 우선순위: 핵심

**D03 · [The Firework Editor](https://www.fwsim.com/doc/en/effecteditor.html)**

전문 도구 · 효과 편집 · FWsim · 발행일 미표기



- 확인 범위: 공식 설명의 컴포넌트 트리·별·꼬리·색 변화 부분 확인
- 핵심 내용: 효과를 구성 요소의 트리로 편집하고 별과 꼬리의 속성을 별도로 다룬다.
- 적용 제안: 초기에는 폼 기반 설정, 이후에는 고급 효과 트리 편집으로 확장.
- 한계: 앱을 설치해 조작하거나 내부 파일 포맷·알고리즘을 검사한 것은 아니다.
- 우선순위: 핵심

**D04 · [The show editor](https://www.fwsim.com/doc/en/show_editor.html)**

전문 도구 · 공연 편집 · FWsim · 발행일 미표기



- 확인 범위: 공식 설명의 3D 공간·큐·stepper·카메라 부분 확인
- 핵심 내용: 발사 위치, 시간 순서, 연속 발사, 음악과 카메라를 한 공연에 배치한다.
- 적용 제안: 다중 발사대·시간차 시퀀스·카메라 트랙 요구사항의 비교 사례.
- 한계: 제품 기능은 에디션별로 다르다. 사용성·성능을 실측하지 않았다.
- 우선순위: 핵심

**D05 · [FWsim Online Firework Library](https://effects.fwsim.com/)**

공개 카탈로그 · FWsim and contributing creators · 발행일 미표기



- 확인 범위: 공개 라이브러리 페이지·검색 결과 확인; 파일 다운로드·포맷 검사 미실시
- 핵심 내용: 불꽃 효과를 찾아볼 수 있는 공개 라이브러리 진입점이다.
- 적용 제안: 관찰용 효과와 명칭을 찾는 경로.
- 한계: 이번 조사에서 명시적인 일괄 재사용 허락이나 안정적인 공개 API를 확인하지 못했다.
- 우선순위: 보조

**D06 · [FWsim Fireworks Simulator — FAQ](https://www.fwsim.com/faq.html)**

전문 도구 · 시뮬레이션 설명 · FWsim · 발행일 미표기



- 확인 범위: 공식 FAQ의 실제 효과·불규칙성 관련 검색 추출 확인
- 핵심 내용: 실제 제품 효과와 자연스러운 불규칙성을 표현한다고 설명한다.
- 적용 제안: 실제 관찰값과 이상적인 도형 사이에 변이 조절을 두는 비교 사례.
- 한계: 제작사의 설명이다. 물리적 정확도에 대한 독립 검증으로 취급하지 않는다.
- 우선순위: 보조

**T01 · [wgpu — Running on the Web (WebGPU and WebGL)](https://wgpu.rs/doc/wgpu/documentation/platforms/web/index.html)**

공식 기술 문서 · wgpu contributors · 발행일 미표기



- 확인 범위: 공식 웹 실행 문서 본문 확인
- 핵심 내용: Rust를 WebAssembly로 컴파일하고 WebGPU 또는 WebGL2 백엔드를 사용할 수 있다.
- 적용 제안: Rust 코어와 wgpu 렌더러 조합의 실행 가능성 검토.
- 한계: API 및 브라우저와의 버전 차이를 확인해야 한다. 이 프로젝트를 빌드한 결과는 아니다.
- 우선순위: 핵심

**T02 · [wgpu::DownlevelFlags — COMPUTE_SHADERS](https://wgpu.rs/doc/wgpu/struct.DownlevelFlags.html#associatedconstant.COMPUTE_SHADERS)**

공식 기술 문서 · wgpu contributors · 발행일 미표기



- 확인 범위: 공식 기능 제약 문서 확인
- 핵심 내용: WebGL2는 compute shader를 지원하지 않는다.
- 적용 제안: WebGPU GPU 계산과 WebGL2의 별도 계산 경로를 구분.
- 한계: 백엔드가 있다는 사실만으로 동일 코드·효과·성능의 자동 호환이 보장되지 않는다.
- 우선순위: 핵심

**T03 · [WebGPU API](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)**

공식 웹 플랫폼 문서 · MDN Web Docs · 발행일 미표기 · 문서 수정일 2026-09-02



- 확인 범위: API 개요·보안 컨텍스트·지원 상태 설명 확인
- 핵심 내용: GPU 렌더링과 범용 계산을 제공하며 보안 컨텍스트와 기기 기능 확인이 필요하다.
- 적용 제안: 브라우저 이름보다 실제 adapter·features·limits를 확인하는 시작 절차.
- 한계: 지원 여부는 브라우저·OS·GPU 조합에 따라 달라진다. 실제 기기별 실행은 미확인.
- 우선순위: 핵심

**T04 · [JS / wasm-bindgen comparison](https://wasm-bindgen.github.io/wasm-bindgen/benchmarks/)**

공식 성능 참고 · wasm-bindgen contributors · 발행일 미표기



- 확인 범위: 벤치마크 목적·제약 설명 확인; 벤치마크 실행 미실시
- 핵심 내용: JS와 Wasm 사이의 경계 호출 비용을 비교하는 미시 벤치마크를 소개한다.
- 적용 제안: 입자별 JS 호출을 피하고 데이터 전달을 묶는 설계의 참고.
- 한계: 페이지 자체가 실제 앱 성능을 대표하지 않는다고 설명한다. Rust의 일반적 속도 우위를 주장할 근거가 아니다.
- 우선순위: 보조

**T05 · [BaseAudioContext: currentTime property](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/currentTime)**

공식 웹 플랫폼 문서 · MDN Web Docs · 발행일 미표기 · 문서 수정일 2026-09-01



- 확인 범위: 시간·정밀도 관련 API 설명 확인
- 핵심 내용: 오디오 시간축을 제공하되 브라우저의 시간 정밀도 제한이 있을 수 있다.
- 적용 제안: 음악 재생 시 화면과 큐를 오디오 시간에 맞추는 설계의 출발점.
- 한계: 음악 장치 지연·출력 시각 동기화를 별도로 검증해야 한다.
- 우선순위: 보조

**T06 · [WebGPU Samples — Particles](https://github.com/webgpu/webgpu-samples/tree/main/sample/particles)**

공식 코드 예제 · webgpu/webgpu-samples contributors · 발행일 미표기

[별도 열람 경로](https://webgpu.github.io/webgpu-samples/?sample=particles).

- 확인 범위: 공식 예제 저장소·샘플 진입 페이지 확인; 코드 실행·성능 측정 미실시
- 핵심 내용: WebGPU 입자 예제의 공개 소스가 제공된다.
- 적용 제안: GPU 입자 렌더링의 작은 검증 작업을 시작할 참고.
- 한계: 불꽃 효과 엔진이나 전체 편집기 구현은 아니다. 도입 전 해당 버전 라이선스와 코드를 확인한다.
- 우선순위: 보조
