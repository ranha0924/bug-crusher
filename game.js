/**
 * [전체 구조 설명]
 * 이 게임은 '데이터(숫자)'를 '화면(그림)'으로 바꾸는 과정을 반복합니다.
 * 1. 지도를 숫자로 그린다 (0은 길, 1은 벽)
 * 2. 캐릭터의 위치를 숫자로 기억한다 (x: 1, y: 1)
 * 3. 키보드를 누르면 숫자를 바꾼다 (x를 1에서 2로)
 * 4. 바뀐 숫자에 맞춰 화면을 다시 그린다.
 */

// ---------- 1. 게임의 규칙 (상수: 변하지 않는 값) ----------
const MAZE_SIZE = 15; // 미로의 가로세로 칸 수 (15x15 격자)
const CELL_SIZE = 32; // 화면에 보여질 한 칸의 크기 (32픽셀)

// ---------- 2. 게임의 현재 상황 (변수: 계속 변하는 값) ----------
let player, monsters, keyPosition, hasKey; // 플레이어 위치, 몬스터들, 열쇠 위치, 열쇠 소지 여부
let questions = [];        // questions.json 파일에서 가져온 '전체 문제' 보관함
let activeQuestions = [];  // 현재 선택한 난이도에 맞는 '필터링된 문제' 보관함
let qOrder = [];           // 문제를 무작위로 섞어서 순서를 저장할 리스트
let qIndex = 0;            // 현재 몇 번째 문제를 내야 하는지 가리키는 번호표

let currentMonsterIndex = null; // 지금 마주친 몬스터가 몇 번째 몬스터인지 저장
let currentMonsterPos = null;   // 지금 마주친 몬스터의 좌표 (나중에 펑! 터지는 효과 줄 때 사용)
let currentQuestion = null;     // 현재 화면에 떠 있는 문제 정보
let isPlaying = false;          // 게임이 시작되었는지, 아니면 멈춰있는지 확인하는 스위치

// ✅ 사용자가 선택한 난이도 (기본값 1: 하)
let selectedDifficulty = 1;

// ---------- 3. 고정된 위치 정보 ----------
const exitPosition = { x: 13, y: 13 }; // 탈출구는 항상 (13, 13) 좌표에 있음

// ---------- 4. 미로 설계도 (숫자로 그린 지도) ----------
// 1은 벽이라서 못 지나가고, 0은 길이라서 마음껏 다닐 수 있습니다.
const mazeMap = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
  [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,1,0,0,0,1,0,1],
  [1,0,1,1,1,1,1,0,1,1,1,0,1,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,1,0,1],
  [1,1,1,0,1,0,1,1,1,1,1,1,1,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,1,1,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,1,0,1,0,0,0,1],
  [1,1,1,1,1,1,1,0,1,0,1,0,1,1,1],
  [1,0,0,0,0,0,0,0,1,0,1,0,0,0,1],
  [1,0,1,1,1,1,1,1,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// ---------- 5. 난이도별 몬스터가 처음 나타날 장소들 (각 7마리) ----------
const monsterPositionsByDifficulty = {
  1: [ // 하: 시작점에서 가까운 곳 위주
    { x: 3, y: 1 }, { x: 7, y: 3 }, { x: 11, y: 1 },
    { x: 5, y: 5 }, { x: 3, y: 7 }, { x: 7, y: 7 }, { x: 5, y: 9 }
  ],
  2: [ // 중: 중간 지역 배치
    { x: 3, y: 1 }, { x: 11, y: 1 }, { x: 7, y: 3 },
    { x: 5, y: 5 }, { x: 9, y: 7 }, { x: 3, y: 9 }, { x: 7, y: 11 }
  ],
  3: [ // 상: 출구 근처까지 분산 배치
    { x: 7, y: 1 }, { x: 11, y: 3 }, { x: 3, y: 5 },
    { x: 9, y: 7 }, { x: 5, y: 9 }, { x: 11, y: 9 }, { x: 7, y: 13 }
  ]
};

// ---------- 6. HTML 태그들을 자바스크립트로 가져오기 ----------
// index.html에 적힌 ID들을 가져와서 조작할 준비를 합니다.
const maze = document.getElementById('maze'); // 미로가 그려질 박스
const monstersEl = document.getElementById('monsters-left'); // 남은 몬스터 숫자 표시
const keyStatusEl = document.getElementById('key-status'); // 열쇠 상태 표시 글자

// 각종 팝업창(모달)들
const introModal = document.getElementById('intro-modal');
const questionModal = document.getElementById('question-modal');
const clearModal = document.getElementById('clear-modal');
const keyModal = document.getElementById('key-modal');
const deathModal = document.getElementById('death-modal');
const keyAppearModal = document.getElementById('key-appear-modal');

// 문제 창 내부 요소들
const questionText = document.getElementById('question-text'); // 문제 내용
const optionsBox = document.getElementById('options-container'); // 객관식 버튼들
const textBox = document.getElementById('text-answer-container'); // 주관식 입력창
const textInput = document.getElementById('text-answer'); // 실제 글자 치는 곳
const resultMsg = document.getElementById('result-message'); // "맞았다/틀렸다" 알려주는 글
const monsterFaceEl = document.getElementById('monster-face'); // 몬스터 얼굴 아이콘

// 난이도 설정 관련
const difficultyHint = document.getElementById('difficulty-hint');
const diffBtns = document.querySelectorAll('.diff-btn');

// ---------- 7. 유틸리티 함수 (도우미 함수들) ----------

// 창을 보여주는 함수
function showModal(modal) { modal.classList.add('active'); }
// 창을 숨기는 함수
function hideModal(modal) { modal.classList.remove('active'); }

// 지금 화면에 뭐라도 팝업창이 떠 있는지 확인하는 함수 (떠 있으면 캐릭터가 움직이면 안 되니까요!)
function isModalOpen() {
  return (
    introModal.classList.contains('active') ||
    questionModal.classList.contains('active') ||
    clearModal.classList.contains('active') ||
    keyModal.classList.contains('active') ||
    deathModal.classList.contains('active') ||
    keyAppearModal.classList.contains('active')
  );
}

// 리스트의 순서를 무작위로 섞어주는 함수 (피셔-예이츠 알고리즘)
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]; // 두 요소의 위치를 맞바꿈
  }
  return arr;
}

// ---------- 8. 게임 로직 함수들 ----------

// 난이도를 설정하는 함수
function setDifficulty(diff) {
  selectedDifficulty = diff;
  // 클릭한 버튼만 노란색으로 빛나게 하고 나머지는 끄기
  diffBtns.forEach(b => b.classList.toggle('active', Number(b.dataset.diff) === diff));

  // 아래쪽 설명 문구 바꾸기
  if (difficultyHint) {
    if (diff === 1) difficultyHint.textContent = '하: 개발 입문자용 (기초 개념)';
    if (diff === 2) difficultyHint.textContent = '중: 어느 정도 코딩한 사람용 (기본문법/응용)';
    if (diff === 3) difficultyHint.textContent = '상: 개발자용 (CS/JS 심화/설계)';
  }
}

// 전체 문제 중에서 내가 고른 난이도 문제만 골라내는 작업
function buildActiveQuestions() {
  activeQuestions = questions.filter(q => Number(q.difficulty) === selectedDifficulty);

  // 만약 실수로 해당 난이도 문제를 하나도 안 만들었다면, 전체 문제라도 나오게 방어막 침
  if (activeQuestions.length === 0) activeQuestions = [...questions];

  qOrder = shuffle([...activeQuestions]); // 골라낸 문제들을 무작위로 섞음
  qIndex = 0; // 첫 번째 문제부터 시작하도록 번호 초기화
}

// 다음 낼 문제를 하나 꺼내오는 함수
function nextQuestion() {
  if (activeQuestions.length === 0) return null;

  // 준비한 문제를 다 썼다면 다시 섞어서 처음부터 냄 (문제가 부족할 때를 대비)
  if (qIndex >= qOrder.length) {
    qOrder = shuffle([...activeQuestions]);
    qIndex = 0;
  }
  return qOrder[qIndex++]; // 현재 번호의 문제를 주고, 다음을 위해 번호를 1 올림
}

// 게임을 완전히 처음 상태로 되돌리는 함수 (시작/재시작)
function initGame() {
  player = { x: 1, y: 1 }; // 플레이어는 (1, 1)에서 시작
  const positions = monsterPositionsByDifficulty[selectedDifficulty] || monsterPositionsByDifficulty[1];
  monsters = positions.map(m => ({ ...m })); // 난이도에 맞는 위치로 몬스터 배치

  keyPosition = null; // 열쇠는 아직 맵에 없음
  hasKey = false;     // 열쇠도 안 가지고 있음

  buildActiveQuestions(); // 문제 리스트 새로 뽑기
  updateUI();             // 화면 글자들 갱신
  drawMaze();             // 미로 새로 그리기
}

// 상단바 정보(남은 버그 수, 열쇠 상태)를 최신화하는 함수
function updateUI() {
  monstersEl.textContent = monsters.length; // 화면에 남은 몬스터 수 적기

  const keyStat = document.querySelector('.key-stat');

  if (hasKey) {
    keyStatusEl.textContent = 'GET!'; // 열쇠 먹었을 때
    keyStat?.classList.add('has-key');
  } else if (monsters.length === 0) {
    keyStatusEl.textContent = 'READY'; // 버그 다 잡아서 열쇠가 맵에 나타났을 때
    keyStat?.classList.remove('has-key');
  } else {
    keyStatusEl.textContent = 'LOCKED'; // 아직 버그가 남아있을 때
    keyStat?.classList.remove('has-key');
  }
}

// ★★★ 가장 중요한 함수: 숫자로 된 지도를 실제 눈에 보이는 HTML로 바꾸기 ★★★
function drawMaze() {
  maze.innerHTML = ''; // 이전에 그렸던 미로를 싹 지웁니다 (안 지우면 계속 쌓여요!)
  maze.style.gridTemplateColumns = `repeat(${MAZE_SIZE}, ${CELL_SIZE}px)`; // 격자 가로 칸수 설정

  // 이중 반복문: 세로(y)로 15번, 가로(x)로 15번, 총 225번을 검사합니다.
  for (let y = 0; y < MAZE_SIZE; y++) {
    for (let x = 0; x < MAZE_SIZE; x++) {
      const cell = document.createElement('div'); // 한 칸을 만듭니다.
      // 지도 데이터(mazeMap)가 1이면 벽 클래스, 0이면 길 클래스를 부여합니다.
      cell.className = mazeMap[y][x] === 1 ? 'cell wall' : 'cell path';
      // 나중에 이 칸이 어디인지 알기 위해 좌표 정보를 숨겨둡니다.
      cell.dataset.x = x;
      cell.dataset.y = y;

      // 만약 이 칸이 출구 위치라면? 출구 문 그림을 넣습니다.
      if (x === exitPosition.x && y === exitPosition.y) {
        const door = document.createElement('div');
        door.className = 'exit-door';
        cell.appendChild(door);
      }

      // 만약 이 칸에 열쇠가 놓여 있다면? 열쇠 그림을 넣습니다.
      if (keyPosition && x === keyPosition.x && y === keyPosition.y) {
        const key = document.createElement('div');
        key.className = 'key-item';
        cell.appendChild(key);
      }

      // 만약 이 칸에 몬스터가 살고 있다면? 몬스터 그림을 넣습니다.
      if (monsters.some(m => m.x === x && m.y === y)) {
        const mon = document.createElement('div');
        mon.className = 'monster';
        cell.appendChild(mon);
      }

      // 만약 이 칸에 플레이어가 서 있다면? 플레이어 그림을 넣습니다.
      if (player.x === x && player.y === y) {
        const p = document.createElement('div');
        p.className = 'player';
        cell.appendChild(p);
      }

      maze.appendChild(cell); // 완성된 한 칸을 전체 미로 박스에 집어넣습니다.
    }
  }
}

// 플레이어를 실제로 움직이게 하는 함수 (dx, dy는 이동 방향: -1, 0, 1 중 하나)
function movePlayer(dx, dy) {
  // 게임 중이 아니거나 팝업창이 떠 있으면 움직이지 못하게 막습니다.
  if (!isPlaying || isModalOpen()) return;

  const nx = player.x + dx; // 가려고 하는 미래의 X 좌표
  const ny = player.y + dy; // 가려고 하는 미래의 Y 좌표

  // 1. 맵 밖으로 나가려고 하면 취소!
  if (nx < 0 || nx >= MAZE_SIZE || ny < 0 || ny >= MAZE_SIZE) return;
  // 2. 가려는 곳이 벽(1)이면 취소!
  if (mazeMap[ny][nx] === 1) return;

  // 위 검사를 통과하면 실제로 플레이어 좌표를 업데이트합니다.
  player.x = nx;
  player.y = ny;

  // 만약 열쇠가 있는 칸에 도착했다면 열쇠를 획득합니다.
  if (keyPosition && nx === keyPosition.x && ny === keyPosition.y) {
    hasKey = true;
    keyPosition = null; // 맵에서 열쇠를 지웁니다.
  }

  // 만약 탈출구(출구)에 도착했다면?
  if (nx === exitPosition.x && ny === exitPosition.y) {
    if (hasKey) showModal(clearModal); // 열쇠 있으면 탈출 성공!
    else showModal(keyModal);           // 열쇠 없으면 "열쇠 가져와" 창 띄우기
  }

  // 만약 몬스터를 마주쳤다면?
  const idx = monsters.findIndex(m => m.x === nx && m.y === ny);
  if (idx !== -1) {
    currentMonsterIndex = idx; // 몇 번째 몬스터인지 기억
    currentMonsterPos = { x: nx, y: ny }; // 어디서 만났는지 기억
    showQuestion(); // 퀴즈 창을 켭니다.
  }

  updateUI(); // 숫자들 다시 적고
  drawMaze(); // 바뀐 위치대로 미로 다시 그리기
}

// -----------------------------------------------------------
// 아래부터는 퀴즈 시스템과 게임 관리 코드입니다. (위와 로직이 비슷함)
// -----------------------------------------------------------

// 퀴즈 창을 보여주는 함수
function showQuestion() {
  currentQuestion = nextQuestion(); // 문제 주머니에서 하나 꺼내기
  if (!currentQuestion) return;

  // 퀴즈 창 내용 초기화
  questionText.textContent = currentQuestion.question;
  resultMsg.textContent = '';
  resultMsg.className = 'result-message';
  monsterFaceEl.classList.remove('explode'); // 몬스터 터지는 애니메이션 끄기
  textInput.disabled = false;

  // 문제 종류가 객관식(multiple)일 때
  if (currentQuestion.type === 'multiple') {
    optionsBox.style.display = 'flex';
    textBox.style.display = 'none';
    optionsBox.innerHTML = ''; // 버튼들 새로 만들기 위해 비우기

    currentQuestion.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = `${i + 1}. ${opt}`;
      // 버튼 클릭하면 정답인지 체크하는 함수 실행
      btn.onclick = () => checkChoice(i);
      optionsBox.appendChild(btn);
    });
  } 
  // 문제 종류가 주관식(text)일 때
  else {
    optionsBox.style.display = 'none';
    textBox.style.display = 'flex';
    textInput.value = ''; // 입력창 비우기
    setTimeout(() => textInput.focus(), 0); // 바로 타이핑할 수 있게 커서 둠
  }

  showModal(questionModal); // 퀴즈 창 띄우기
}

// 답을 고른 뒤에는 다른 버튼을 못 누르게 잠그는 함수
function lockInputs() {
  optionsBox.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
  textInput.disabled = true;
}

// 객관식 정답 체크
function checkChoice(selected) {
  lockInputs();
  const correct = currentQuestion.answer;
  const btns = optionsBox.querySelectorAll('.option-btn');

  if (selected === correct) {
    btns[selected].classList.add('correct'); // 초록색 불
    resultMsg.textContent = '버그 수정 완료!';
    resultMsg.className = 'result-message correct';
    defeatMonster(); // 몬스터 물리치기 실행
  } else {
    btns[selected].classList.add('wrong'); // 빨간색 불
    btns[correct]?.classList.add('correct'); // 정답 알려주기
    resultMsg.textContent = '버그에게 패배...';
    resultMsg.className = 'result-message wrong';
    setTimeout(gameOver, 1500); // 1.5초 뒤에 게임오버 창 띄우기
  }
}

// 주관식 정답 체크
function checkTextAnswer() {
  lockInputs();
  const ans = textInput.value.trim().toLowerCase(); // 앞뒤 공백 없애고 소문자로 변환
  const correct = String(currentQuestion.answer).trim().toLowerCase();

  if (ans === correct) {
    resultMsg.textContent = '버그 수정 완료!';
    resultMsg.className = 'result-message correct';
    defeatMonster();
  } else {
    resultMsg.textContent = `버그에게 패배... (정답: ${currentQuestion.answer})`;
    resultMsg.className = 'result-message wrong';
    setTimeout(gameOver, 1500);
  }
}

// 몬스터를 물리쳤을 때 실행되는 함수
function defeatMonster() {
  monsterFaceEl.classList.add('explode'); // 퀴즈 창 안의 몬스터 얼굴 펑!

  setTimeout(() => {
    hideModal(questionModal); // 퀴즈 창 닫기

    // 미로 맵에서도 펑! 하는 효과 만들기
    createEffect(currentMonsterPos.x, currentMonsterPos.y);

    setTimeout(() => {
      // 몬스터 목록(배열)에서 방금 잡은 몬스터를 삭제합니다.
      monsters.splice(currentMonsterIndex, 1);

      currentMonsterIndex = null;
      currentMonsterPos = null;

      updateUI(); // UI 갱신
      drawMaze(); // 몬스터 사라진 모습으로 다시 그리기

      // 만약 몬스터가 한 마리도 안 남았다면? 열쇠를 맵 구석에 소환!
      if (monsters.length === 0 && !hasKey) {
        keyPosition = { x: 13, y: 1 };
        showModal(keyAppearModal);
      }
    }, 450);
  }, 650);
}

// 펑! 터지는 시각 효과를 만드는 함수
function createEffect(x, y) {
  const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
  if (!cell) return;

  const boom = document.createElement('div');
  boom.className = 'explosion';
  cell.appendChild(boom); // 폭발 원 그림 추가

  const text = document.createElement('div');
  text.className = 'bug-text';
  text.textContent = 'FIXED!'; // "고쳐짐!" 글자 추가
  cell.appendChild(text);

  // 0.8초 뒤에 효과들 삭제
  setTimeout(() => {
    boom.remove();
    text.remove();
  }, 800);
}

// 게임 오버 처리
function gameOver() {
  hideModal(questionModal);
  showModal(deathModal);
}

// -----------------------------------------------------------
// 9. 외부 데이터(JSON)와 통신하기
// -----------------------------------------------------------

// questions.json 파일을 읽어오는 함수 (비동기 처리: async/await)
async function loadQuestions() {
  try {
    const res = await fetch('questions.json'); // 파일을 가져올 때까지 기다립니다.
    const data = await res.json();             // 가져온 파일을 글자로 읽을 때까지 기다립니다.
    questions = data.questions || [];          // 문제 목록 저장
  } catch (e) {
    // 만약 파일 읽기에 실패하면 (예: 오타), 가짜 문제라도 넣어줍니다.
    questions = [
      { id: 1, type: "multiple", difficulty: 1, question: "파일 로딩 실패! 예비 문제입니다. HTML은?", options: ["A", "B"], answer: 0 }
    ];
  }
}

// -----------------------------------------------------------
// 10. 조작키(이벤트) 설정
// -----------------------------------------------------------

document.addEventListener('keydown', (e) => {
  if (!isPlaying) return; // 시작 전엔 키 무시

  switch (e.key) {
    case 'ArrowUp': e.preventDefault(); movePlayer(0, -1); break;
    case 'ArrowDown': e.preventDefault(); movePlayer(0, 1); break;
    case 'ArrowLeft': e.preventDefault(); movePlayer(-1, 0); break;
    case 'ArrowRight': e.preventDefault(); movePlayer(1, 0); break;
    case 'Enter':
      // 주관식 창이 열려있을 때 엔터 누르면 정답 제출
      if (questionModal.classList.contains('active') && textBox.style.display !== 'none') {
        checkTextAnswer();
      }
      break;
  }
});

// -----------------------------------------------------------
// 11. 버튼들 클릭 이벤트 설정
// -----------------------------------------------------------

// 난이도 버튼들에 클릭 기능 부여
diffBtns.forEach(btn => {
  btn.onclick = () => setDifficulty(Number(btn.dataset.diff));
});

// 모바일 방향 버튼 이벤트 설정
const dirMap = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
document.querySelectorAll('.dpad-btn').forEach(btn => {
  btn.addEventListener('touchstart', e => {
    e.preventDefault();
    const dir = btn.dataset.dir;
    if (dirMap[dir]) movePlayer(...dirMap[dir]);
  });
  btn.addEventListener('click', () => {
    const dir = btn.dataset.dir;
    if (dirMap[dir]) movePlayer(...dirMap[dir]);
  });
});

// 시작 버튼
document.getElementById('start-btn').onclick = () => {
  hideModal(introModal);
  isPlaying = true; // 게임 시작 스위치 ON
  initGame();       // 초기화
};

// 재시작 버튼
document.getElementById('restart-btn').onclick = () => {
  if (!isPlaying) return;
  initGame();
};

// 주관식 제출 버튼
document.getElementById('submit-text-btn').onclick = () => checkTextAnswer();

// "열쇠 필요" 창에서 확인 눌렀을 때
document.getElementById('key-ok-btn').onclick = () => {
  hideModal(keyModal);
  // 문에 끼지 않게 살짝 왼쪽으로 밀어줌
  player.x = exitPosition.x - 1;
  player.y = exitPosition.y;
  drawMaze();
};

// "열쇠 등장" 창에서 확인 눌렀을 때
document.getElementById('key-appear-ok-btn').onclick = () => {
  hideModal(keyAppearModal);
  drawMaze();
};

// 죽었을 때 다시 시도 버튼
document.getElementById('retry-btn').onclick = () => {
  hideModal(deathModal);
  isPlaying = true;
  initGame();
};

// 클리어 후 다시 플레이 버튼
document.getElementById('next-stage-btn').onclick = () => {
  hideModal(clearModal);
  isPlaying = false;
  showModal(introModal); // 다시 난이도 고르는 첫 화면으로
  initGame();
};

// -----------------------------------------------------------
// 12. 진짜 진짜 시작! (코드가 로드되자마자 실행되는 부분)
// -----------------------------------------------------------
loadQuestions().then(() => {
  setDifficulty(1); // 기본 난이도 하 로 설정
  drawMaze();       // 인트로 화면 뒤에 미로 미리 그려두기
});