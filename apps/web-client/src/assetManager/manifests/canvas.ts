import type { AssetManifest } from "../types.js";

export const IMAGES = {
  default: "/default.png",

  // UI
  "ui.arrow_left": "/ui/arrow_left.png",
  "ui.character_platform": "/ui/character_platform.png",
  "ui.icons": "/ui/icons.png",
  "ui.joy_arrow": "/ui/joy_arrow.png",
  "ui.joy_center": "/ui/joy_center.png",
  "ui.joy_jump": "/ui/joy_jump.png",
  "ui.joy_smash": "/ui/joy_smash.png",

  // Environment
  "environment.sky": "/canvas/environments/sky.png",
  "environment.clouds": "/canvas/environments/clouds.png",
  "environment.mountains": "/canvas/environments/mountains.png",
  "environment.fog": "/canvas/environments/fog.png",
  "environment.forest": "/canvas/environments/forest.png",
  "environment.forest_front": "/canvas/environments/forest_front.png",
  "environment.ground": "/canvas/environments/ground.png",

  // Foreground
  "environment.fg_fence1": "/canvas/environments/fg_fence1.png",

  "environment.fg_pumpkin1": "/canvas/environments/fg_pumpkin1.png",
  "environment.fg_pumpkin2": "/canvas/environments/fg_pumpkin2.png",

  "environment.fg_stump1": "/canvas/environments/fg_stump1.png",
  "environment.fg_stump2": "/canvas/environments/fg_stump2.png",
  "environment.fg_stump3": "/canvas/environments/fg_stump3.png",
  "environment.fg_stump4": "/canvas/environments/fg_stump4.png",
  "environment.fg_stump5": "/canvas/environments/fg_stump5.png",

  "environment.fg_tree1": "/canvas/environments/fg_tree1.png",
  "environment.fg_tree2": "/canvas/environments/fg_tree2.png",
  "environment.fg_tree3": "/canvas/environments/fg_tree3.png",

  // Leaves
  "environment.leaf1": "/canvas/environments/leaf1.png",
  "environment.leaf2": "/canvas/environments/leaf2.png",
  "environment.leaf3": "/canvas/environments/leaf3.png",
  "environment.leaf4": "/canvas/environments/leaf4.png",
  "environment.leaf5": "/canvas/environments/leaf5.png",
  "environment.leaf6": "/canvas/environments/leaf6.png",

  // Players
  "player.batcat": "/canvas/players/batcat.png",
  "player.carrambacat": "/canvas/players/carrambacat.png",
  "player.commandocat": "/canvas/players/commandocat.png",
  "player.cybercat": "/canvas/players/cybercat.png",
  "player.darkcat": "/canvas/players/darkcat.png",
  "player.ghostcat": "/canvas/players/ghostcat.png",
  "player.ironcat": "/canvas/players/ironcat.png",
  "player.punishcat": "/canvas/players/punishcat.png",
  "player.robocat": "/canvas/players/robocat.png",
  "player.samurcat": "/canvas/players/samurcat.png",
  "player.termicator": "/canvas/players/termicator.png",
  "player.zombocat": "/canvas/players/zombocat.png",
  "player.kotan": "/canvas/players/kotan.png",

  // Player's portraits
  "playerPortrait.batcat": "/portraits/batcat.png",
  "playerPortrait.carrambacat": "/portraits/carrambacat.png",
  "playerPortrait.commandocat": "/portraits/commandocat.png",
  "playerPortrait.cybercat": "/portraits/cybercat.png",
  "playerPortrait.darkcat": "/portraits/darkcat.png",
  "playerPortrait.ghostcat": "/portraits/ghostcat.png",
  "playerPortrait.ironcat": "/portraits/ironcat.png",
  "playerPortrait.punishcat": "/portraits/punishcat.png",
  "playerPortrait.robocat": "/portraits/robocat.png",
  "playerPortrait.samurcat": "/portraits/samurcat.png",
  "playerPortrait.termicator": "/portraits/termicator.png",
  "playerPortrait.zombocat": "/portraits/zombocat.png",
  "playerPortrait.kotan": "/portraits/kotan.png",

  // Enemies
  "enemy.crow": "/canvas/enemies/crow.png",
  "enemy.crow_dead": "/canvas/enemies/crow-dead.png",

  "enemy.boar": "/canvas/enemies/boar.png",
  "enemy.boar_dead": "/canvas/enemies/boar-dead.png",

  "enemy.rat": "/canvas/enemies/rat.png",
  "enemy.rat_dead": "/canvas/enemies/rat-dead.png",

  "enemy.orc": "/canvas/enemies/orc.png",
  "enemy.orc_dead": "/canvas/enemies/orc-dead.png",

  // Civilians
  "civilian.baba": "/canvas/civilians/baba.png",
  "civilian.baba_dead": "/canvas/civilians/baba-dead.png",

  "civilian.dido": "/canvas/civilians/dido.png",
  "civilian.dido_dead": "/canvas/civilians/dido-dead.png",

  // Obstacles
  "obstacle.cactus": "/canvas/obstacles/cactus.png",
  "obstacle.rock": "/canvas/obstacles/rock.png",
  "obstacle.stump": "/canvas/obstacles/stump.png",
  "obstacle.bush": "/canvas/obstacles/bush.png",

  // Effects
  "effect.screen_crack": "/canvas/effects/screen-crack.png",
  "effect.smash": "/canvas/effects/smash.png",
} as const;

export const AUDIO = {
  "music.gameplay1": "/bgm/bgm1.mp3",
  "music.gameplay2": "/bgm/bgm2.mp3",

  "sound.player_jump": "/sfx/player_jump.wav",
  "sound.player_land": "/sfx/player_land.wav",
  "sound.player_smash": "/sfx/player_smash.wav",
  "sound.player_hurt": "/sfx/player_hurt.wav",
  "sound.player_die": "/sfx/player_die.wav",

  "sound.enemy_die": "/sfx/enemy_die.wav",
  "sound.boar_enemy_die": "/sfx/enemy_die_boar.wav",
  "sound.crow_enemy_die": "/sfx/enemy_die_crow.wav",
  "sound.orc_enemy_die": "/sfx/enemy_die_orc.wav",
  "sound.rat_enemy_die": "/sfx/enemy_die_rat.wav",

  "sound.civilian_die": "/sfx/civilian_die.wav",

  "sound.pickup": "/sfx/pickup.wav",
  "sound.ui_click": "/sfx/ui_click.wav",
  "sound.game_over": "/sfx/game_over.wav",
} as const;

export const MODELS = {} as const;
