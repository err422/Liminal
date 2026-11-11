export const CFG = {
  CELL: 4, WALL_H: 3, WALL_T: 0.3, MAZE_W: 12, MAZE_H: 12,
  RADIUS: 0.35, EYE: 1.65, WALK: 3.0, SPRINT: 5.2,
  STAMINA_DRAIN: 22, STAMINA_REGEN: 14,
  BATTERY_DRAIN: 1.4, BATTERY_REGEN: 0.8,
  EXPOSURE_MAX: 12,        // how much the eye can amplify a dark scene
  ADAPT_RATE: 0.11,        // dark adaptation speed (per second, exponential)
  MAX_INSANITY: 90,        // insanity can never consume the last 10% of health
  NET_HZ: 15, INTERP_MS: 110, MAX_PLAYERS: 4,
};
