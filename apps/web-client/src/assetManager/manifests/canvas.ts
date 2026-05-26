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

  // Common
  "common.speech_bubble": "/sprites/speech_bubble.png",

  // Tutorial
  "tutorial.bag": "/sprites/tutorial/bag.png",
  "tutorial.banner": "/sprites/tutorial/banner.png",
  "tutorial.schoolboard": "/sprites/tutorial/schoolboard.png",
  "tutorial.crates": "/sprites/tutorial/crates.png",
  "tutorial.flag": "/sprites/tutorial/flag.png",
  "tutorial.ken1": "/sprites/tutorial/master_ken_1.png",
  "tutorial.ken2": "/sprites/tutorial/master_ken_2.png",
  "tutorial.signboard": "/sprites/tutorial/signboard.png",
  "tutorial.tower": "/sprites/tutorial/tower.png",

  "enemy.dummy": "/sprites/enemies/dummy.png",
  "enemy.dummy_dead": "/sprites/enemies/dummy-dead.png",

  // Environment
  "environment.sky": "/sprites/environments/sky.png",
  "environment.clouds": "/sprites/environments/clouds.png",
  "environment.mountains": "/sprites/environments/mountains.png",
  "environment.fog": "/sprites/environments/fog.png",
  "environment.forest": "/sprites/environments/forest.png",
  "environment.forest_front": "/sprites/environments/forest_front.png",
  "environment.ground": "/sprites/environments/ground.png",

  // Foreground
  "environment.fg_fence1": "/sprites/environments/fg_fence1.png",

  "environment.fg_pumpkin1": "/sprites/environments/fg_pumpkin1.png",
  "environment.fg_pumpkin2": "/sprites/environments/fg_pumpkin2.png",

  "environment.fg_stump1": "/sprites/environments/fg_stump1.png",
  "environment.fg_stump2": "/sprites/environments/fg_stump2.png",
  "environment.fg_stump3": "/sprites/environments/fg_stump3.png",
  "environment.fg_stump4": "/sprites/environments/fg_stump4.png",
  "environment.fg_stump5": "/sprites/environments/fg_stump5.png",

  "environment.fg_tree1": "/sprites/environments/fg_tree1.png",
  "environment.fg_tree2": "/sprites/environments/fg_tree2.png",
  "environment.fg_tree3": "/sprites/environments/fg_tree3.png",

  // Leaves
  "environment.leaf1": "/sprites/environments/leaf1.png",
  "environment.leaf2": "/sprites/environments/leaf2.png",
  "environment.leaf3": "/sprites/environments/leaf3.png",
  "environment.leaf4": "/sprites/environments/leaf4.png",
  "environment.leaf5": "/sprites/environments/leaf5.png",
  "environment.leaf6": "/sprites/environments/leaf6.png",

  // Players
  "player.batcat": "/sprites/players/batcat.png",
  "player.carrambacat": "/sprites/players/carrambacat.png",
  "player.commandocat": "/sprites/players/commandocat.png",
  "player.cybercat": "/sprites/players/cybercat.png",
  "player.darkcat": "/sprites/players/darkcat.png",
  "player.ghostcat": "/sprites/players/ghostcat.png",
  "player.ironcat": "/sprites/players/ironcat.png",
  "player.punishcat": "/sprites/players/punishcat.png",
  "player.robocat": "/sprites/players/robocat.png",
  "player.samurcat": "/sprites/players/samurcat.png",
  "player.termicator": "/sprites/players/termicator.png",
  "player.zombocat": "/sprites/players/zombocat.png",
  "player.kotan": "/sprites/players/kotan.png",

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
  "enemy.crow": "/sprites/enemies/crow.png",
  "enemy.crow_dead": "/sprites/enemies/crow-dead.png",

  "enemy.boar": "/sprites/enemies/boar.png",
  "enemy.boar_dead": "/sprites/enemies/boar-dead.png",

  "enemy.rat": "/sprites/enemies/rat.png",
  "enemy.rat_dead": "/sprites/enemies/rat-dead.png",

  "enemy.orc": "/sprites/enemies/orc.png",
  "enemy.orc_dead": "/sprites/enemies/orc-dead.png",

  // Civilians
  "civilian.baba": "/sprites/civilians/baba.png",
  "civilian.baba_dead": "/sprites/civilians/baba-dead.png",

  "civilian.dido": "/sprites/civilians/dido.png",
  "civilian.dido_dead": "/sprites/civilians/dido-dead.png",

  // Obstacles
  "obstacle.cactus": "/sprites/obstacles/cactus.png",
  "obstacle.rock": "/sprites/obstacles/rock.png",
  "obstacle.stump": "/sprites/obstacles/stump.png",
  "obstacle.bush": "/sprites/obstacles/bush.png",

  // Effects
  "effect.screen_crack": "/sprites/effects/screen-crack.png",
  "effect.smash": "/sprites/effects/smash.png",
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
  "sound.dummy_enemy_die": "/sfx/enemy_die_dummy.wav",
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

export const FONTS = {
  GameFont: "/fonts/Caveat-Bold.ttf",
  UIFont: "/fonts/Comfortaa-Bold.ttf",
} as const;
