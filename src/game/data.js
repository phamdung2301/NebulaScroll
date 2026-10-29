// Nebula Voyage — world + mission data (single source of truth).
// The ship flies on the XZ plane (y = 0); forward = (sin(heading), 0, cos(heading)).

export const SECTOR_RADIUS = 120;

export const SPAWN = { pos: [0, 0, 46], heading: Math.PI }; // faces -Z, toward the sector center

// Seeded RNG so the world is identical on every load.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const POIS = {
  star: {
    id: 'star',
    label: 'Ngôi sao non',
    pos: [0, 0, 18],
    scanRadius: 10,
    color: '#ffd9a0',
  },
  station: {
    id: 'station',
    label: 'Trạm tàn tích',
    pos: [-60, 0, -30],
    scanRadius: 10,
    color: '#7ee7ff',
  },
  moon: {
    id: 'moon',
    label: 'Mặt trăng',
    pos: null, // follows the planet orbit, computed at runtime
    scanRadius: 9,
    color: '#cfd2e0',
  },
  planet: {
    id: 'planet',
    label: 'Hành tinh',
    pos: [55, 0, -70],
    scanRadius: 13,
    color: '#b39bff',
  },
  gate: {
    id: 'gate',
    label: 'Cổng bình minh',
    pos: [-75, 0, 45],
    scanRadius: 11,
    color: '#ff9d5c',
  },
};

export const PLANET_POS = POIS.planet.pos;
export const MOON_ORBIT_RADIUS = 11;

export const SHARDS = [
  { id: 'shard-1', label: 'Mảnh sao 1', pos: [-30, 0, -10] },
  { id: 'shard-2', label: 'Mảnh sao 2', pos: [25, 0, -25] },
  { id: 'shard-3', label: 'Mảnh sao 3', pos: [-5, 0, -48] },
];

// Asteroid belt: annulus around the sector center, station sits inside it.
export function buildAsteroids() {
  const rng = mulberry32(20261029);
  const rocks = [];
  let guard = 0;
  while (rocks.length < 42 && guard < 500) {
    guard += 1;
    const angle = rng() * Math.PI * 2;
    const radius = 52 + rng() * 28;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    // Keep the station scan zone and shard spots clear.
    const nearStation = Math.hypot(x - POIS.station.pos[0], z - POIS.station.pos[2]) < 11;
    const nearShard = SHARDS.some((s) => Math.hypot(x - s.pos[0], z - s.pos[2]) < 8);
    const nearSpawnPath = Math.abs(x) < 6 && z > 8 && z < 46;
    if (nearStation || nearShard || nearSpawnPath) continue;
    rocks.push({
      id: `rock-${rocks.length}`,
      pos: [x, -2 + rng() * 4, z],
      radius: 0.9 + rng() * 1.6,
      rot: [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI],
      spin: 0.05 + rng() * 0.15,
    });
  }
  return rocks;
}

export const MISSIONS = [
  {
    id: 'nv1',
    title: 'Chuyến bay đầu tiên',
    goal: 'Bay tới Ngôi sao non và quét nó.',
    storyTitle: 'Ngôi sao non',
    story:
      'Bạn rời trạm xuất phát, động cơ còn lạnh. Phía trước, một ngôi sao non vừa chớm sáng, ánh sáng của nó ' +
      'chưa đủ ấm nhưng đủ để soi rõ con đường. Bạn quét nó, và máy ghi nhận dòng đầu tiên của hành trình: ' +
      'ánh sáng không bắt đầu từ một vụ nổ. Nó bắt đầu từ một lần dám sáng lên.',
  },
  {
    id: 'nv2',
    title: 'Nhặt mảnh sao',
    goal: 'Thu thập cả 3 mảnh sao rải quanh tinh vân.',
    storyTitle: 'Ba mảnh sao',
    story:
      'Ba mảnh sao trôi lặng giữa tinh vân, mỗi mảnh giữ một nhịp sáng khác nhau. Bạn nhặt đủ cả ba, ' +
      'chúng ghép lại thành một tín hiệu: có thứ gì đó ở phía xa đang gọi. Không phải tiếng gọi lớn, ' +
      'chỉ là một nhịp sáng đều đặn, kiên nhẫn chờ người tới.',
  },
  {
    id: 'nv3',
    title: 'Vượt vành đai đá',
    goal: 'Bay xuyên vành đai thiên thạch tới Trạm tàn tích và quét trạm.',
    storyTitle: 'Trạm tàn tích',
    story:
      'Trạm cũ trôi giữa vành đai đá, vỏ trạm xước đầy vết va. Nhật ký còn lại một dòng duy nhất: ' +
      '"Người trước đã đi qua đây và vẫn đi tiếp." Bạn hiểu ra hành trình này không bắt đầu từ bạn, ' +
      'và cũng sẽ không kết thúc ở bạn. Bạn chỉ là người giữ nhịp sáng tiếp theo.',
  },
  {
    id: 'nv4',
    title: 'Thế giới đầu tiên',
    goal: 'Quét Mặt trăng, rồi quét Hành tinh.',
    storyTitle: 'Thế giới đầu tiên',
    story:
      'Mặt trăng nhỏ bay quanh hành tinh như một lời nhắc lặng lẽ, rồi hành tinh hiện ra: đại dương, ' +
      'lục địa, mây, và một đường phân ngày đêm rõ rệt. Đây là nơi ánh sáng dừng lại và ở lại. ' +
      'Bạn quét xong, máy ghi nhận: hành trình không phải để đi xa nhất, mà để tìm ra nơi đáng tới.',
  },
  {
    id: 'nv5',
    title: 'Bay tới bình minh',
    goal: 'Bay tới Cổng bình minh để hoàn thành hành trình.',
    storyTitle: 'Bình minh',
    story:
      'Cổng bình minh không phải là đích đến. Nó là nơi ánh sáng đổi màu, từ tím lạnh sang cam ấm, ' +
      'và bạn nhận ra mình đã bay qua cả một câu chuyện. Từ đây, ánh sáng không còn đi một mình nữa, ' +
      'vì đã có người từng bay qua nó, và kể lại.',
  },
];

export const SHARD_LINES = [
  'Mảnh sao 1: một nhịp sáng ngắn, như hơi thở đầu tiên.',
  'Mảnh sao 2: một nhịp sáng dài, như người chờ đợi.',
  'Mảnh sao 3: một nhịp sáng đôi, như câu trả lời.',
];

export const SCAN_RADIUS_DEFAULT = 10;
