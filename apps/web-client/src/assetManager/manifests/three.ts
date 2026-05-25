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
  "tutorial.banner": "/sprites/tutorial/banner.png",
  "tutorial.flag": "/sprites/tutorial/flag.png",

  // Environment
  "environment.sky": "/sprites/environments/sky.png",
  "environment.clouds": "/sprites/environments/clouds.png",
  "environment.mountains": "/sprites/environments/mountains.png",
  "environment.fog": "/sprites/environments/fog.png",
  "environment.forest": "/sprites/environments/forest.png",
  "environment.forest_front": "/sprites/environments/forest_front.png",

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

  // Effects
  "effect.screen_crack": "/sprites/effects/screen-crack.png",
  "effect.smash": "/sprites/effects/smash.png",

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
} as const;

export const MODELS = {
  // Tutorial
  "tutorial.bag": "/models/tutorial/bag.glb",
  "tutorial.schoolboard": "/models/tutorial/schoolboard.glb",
  "tutorial.crates": "/models/tutorial/crates.glb",
  "tutorial.ken": "/models/tutorial/master_ken.glb",
  // "tutorial.ken_idle": "/models/tutorial/master_ken_idle.glb",
  "tutorial.signboard": "/models/tutorial/signboard.glb",
  "tutorial.tower": "/models/tutorial/tower.glb",

  // Civilians
  "civilian.baba": "/models/civilians/baba.glb",
  "civilian.dido": "/models/civilians/dido.glb",

  // Enemies
  "enemy.dummy": "/models/enemies/dummy.glb",
  "enemy.boar": "/models/enemies/boar.glb",
  "enemy.crow": "/models/enemies/crow.glb",
  "enemy.orc": "/models/enemies/orc.glb",
  "enemy.rat": "/models/enemies/rat.glb",

  // Environment
  "environment.fence1": "/models/environments/fence1.glb",
  "environment.ground": "/models/environments/ground.glb",
  "environment.pumpkin1": "/models/environments/pumpkin1.glb",
  "environment.pumpkin2": "/models/environments/pumpkin2.glb",

  // Obstacles
  "obstacle.bush": "/models/obstacles/bush.glb",
  "obstacle.rock": "/models/obstacles/rock.glb",
  "obstacle.stump": "/models/obstacles/stump.glb",

  // Players
  "player.batcat": "/models/players/batcat.glb",
  "player.carrambacat": "/models/players/carrambacat.glb",
  "player.commandocat": "/models/players/commandocat.glb",
  "player.cybercat": "/models/players/cybercat.glb",
  "player.darkcat": "/models/players/darkcat.glb",
  "player.ghostcat": "/models/players/ghostcat.glb",
  "player.ironcat": "/models/players/ironcat.glb",
  "player.punishcat": "/models/players/punishcat.glb",
  "player.robocat": "/models/players/robocat.glb",
  "player.samurcat": "/models/players/samurcat.glb",
  "player.termicator": "/models/players/termicator.glb",
  "player.zombocat": "/models/players/zombocat.glb",
  "player.kotan": "/models/players/kotan.glb",
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
