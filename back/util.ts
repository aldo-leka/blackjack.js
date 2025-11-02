export const MAX_ROOM_ID = 10_000;
export const MAX_PLAYERS_PER_ROOM = 3;
export const DAILY_REFILL_VALUE = 10;
export const CHIPS = [
  1, // WHITE
  5, // RED
  25, // GREEN
  100, // BLACK
  500 // BLUE
];

// XP required to reach each level (cumulative)
// Uses a smooth polynomial curve: base * level^1.5
export const LEVELING = [
  0,    // Level 0 (dummy so index matches level)
  0,    // Level 1 (starting level)
  5,    // Level 2
  12,   // Level 3
  22,   // Level 4
  35,   // Level 5 - "Cadet"
  50,   // Level 6
  68,   // Level 7
  88,   // Level 8
  111,  // Level 9
  136,  // Level 10 - "Ace"
  164,  // Level 11
  194,  // Level 12
  227,  // Level 13
  262,  // Level 14
  300,  // Level 15
  340,  // Level 16
  383,  // Level 17
  428,  // Level 18
  476,  // Level 19
  526,  // Level 20
  579,  // Level 21
  634,  // Level 22
  692,  // Level 23
  752,  // Level 24
  815,  // Level 25 - "Captain"
  880,  // Level 26
  948,  // Level 27
  1018, // Level 28
  1091, // Level 29
  1166, // Level 30
  1244, // Level 31
  1324, // Level 32
  1407, // Level 33
  1492, // Level 34
  1580, // Level 35
  1670, // Level 36
  1763, // Level 37
  1858, // Level 38
  1956, // Level 39
  2056, // Level 40
  2159, // Level 41
  2264, // Level 42
  2372, // Level 43
  2482, // Level 44
  2595, // Level 45
  2710, // Level 46
  2828, // Level 47
  2948, // Level 48
  3071, // Level 49
  3196, // Level 50 - "General"
  3324, // Level 51
  3454, // Level 52
  3587, // Level 53
  3722, // Level 54
  3860, // Level 55
  4000, // Level 56
  4143, // Level 57
  4288, // Level 58
  4436, // Level 59
  4586, // Level 60
  4739, // Level 61
  4894, // Level 62
  5052, // Level 63
  5212, // Level 64
  5375, // Level 65
  5540, // Level 66
  5708, // Level 67
  5878, // Level 68
  6051, // Level 69
  6226, // Level 70
  6404, // Level 71
  6584, // Level 72
  6767, // Level 73
  6952, // Level 74
  7140, // Level 75
  7330, // Level 76
  7523, // Level 77
  7718, // Level 78
  7916, // Level 79
  8116, // Level 80
  8319, // Level 81
  8524, // Level 82
  8732, // Level 83
  8942, // Level 84
  9155, // Level 85
  9370, // Level 86
  9588, // Level 87
  9808, // Level 88
  10031, // Level 89
  10256, // Level 90
  10484, // Level 91
  10714, // Level 92
  10947, // Level 93
  11182, // Level 94
  11420, // Level 95
  11660, // Level 96
  11903, // Level 97
  12148, // Level 98
  12396, // Level 99
  12646, // Level 100 - "Grandmaster"
] as const;

/* 
PROGRESSION ANALYSIS:
- Level 10 (Ace): ~136 hands minimum (1-2 hours of play)
- Level 25 (Captain): ~408 hands (5-7 hours)
- Level 50 (General): ~1,598 hands (20-25 hours)
- Level 100 (Grandmaster): ~6,323 hands (80-100 hours)
*/

// XP rewards for different actions
export const XP_REWARDS = {
  // Base actions
  PLAY_HAND: 2,           // +2 XP per hand played (doubled from original)
  WIN_HAND: 3,            // +3 XP for winning (up from +2)

  // Special plays
  WIN_DOUBLE_DOWN: 5,     // +5 XP
  WIN_SPLIT_BOTH: 8,      // +8 XP for winning both split hands
  BLACKJACK: 4,           // +4 XP bonus for natural blackjack

  // Winning streaks
  WIN_STREAK_3: 5,        // +5 XP bonus
  WIN_STREAK_5: 12,       // +12 XP bonus
  WIN_STREAK_8: 20,       // +20 XP bonus
  WIN_STREAK_10: 30,      // +30 XP bonus

  // Daily engagement
  FIRST_HAND_OF_DAY: 10,  // +10 XP for first hand each day
} as const;

export function getXPForNextLevel(currentLevel: number): number {
  if (currentLevel >= LEVELING.length - 1) return 0; // Max level reached
  return LEVELING[currentLevel + 1] - LEVELING[currentLevel];
}

export function getLevelFromXP(xp: number): number {
  for (let i = LEVELING.length - 1; i >= 0; i--) {
    if (xp >= LEVELING[i]) return i;
  }
  return 1; // Minimum level
}

export function getLevelProgress(currentXP: number): {
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPercent: number;
} {
  const level = getLevelFromXP(currentXP);
  const currentLevelXP = LEVELING[level];
  const nextLevelXP = LEVELING[level + 1] || currentLevelXP;
  const xpIntoLevel = currentXP - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;
  const progressPercent = xpNeededForLevel > 0
    ? (xpIntoLevel / xpNeededForLevel) * 100
    : 100;

  return {
    level,
    currentLevelXP,
    nextLevelXP,
    progressPercent: Math.min(100, Math.round(progressPercent)),
  };
}
