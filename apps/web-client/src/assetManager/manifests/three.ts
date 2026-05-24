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
  "common.speech_bubble": "/img/speech_bubble.png",

  // Tutorial
  "tutorial.bag": "/tutorial/img/bag.png",
  "tutorial.banner": "/tutorial/img/banner.png",
  "tutorial.schoolboard": "/tutorial/img/schoolboard.png",
  "tutorial.crates": "/tutorial/img/crates.png",
  "tutorial.flag": "/tutorial/img/flag.png",
  "tutorial.ken1": "/tutorial/img/master_ken_1.png",
  "tutorial.ken2": "/tutorial/img/master_ken_2.png",
  "tutorial.signboard": "/tutorial/img/signboard.png",
  "tutorial.tower": "/tutorial/img/tower.png",

  // Environment
  "environment.sky": "/canvas/environments/sky.png",
  "environment.clouds": "/canvas/environments/clouds.png",
  "environment.mountains": "/canvas/environments/mountains.png",
  "environment.fog": "/canvas/environments/fog.png",
  "environment.forest": "/canvas/environments/forest.png",
  "environment.forest_front": "/canvas/environments/forest_front.png",

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

  // Effects
  "effect.screen_crack": "/canvas/effects/screen-crack.png",
  "effect.smash": "/canvas/effects/smash.png",

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
  "tutorial.bag": "/tutorial/glb/bag.glb",
  "tutorial.schoolboard": "/tutorial/glb/schoolboard.glb",
  "tutorial.crates": "/tutorial/glb/crates.glb",
  "tutorial.ken": "/tutorial/glb/master_ken.glb",
  "tutorial.signboard": "/tutorial/glb/signboard.glb",
  "tutorial.tower": "/tutorial/glb/tower.glb",

  // Civilians
  "civilian.baba": "/three/civilians/baba.glb",
  "civilian.dido": "/three/civilians/dido.glb",

  // Enemies
  "enemy.dummy": "/three/enemies/dummy.glb",
  "enemy.boar": "/three/enemies/boar.glb",
  "enemy.crow": "/three/enemies/crow.glb",
  "enemy.orc": "/three/enemies/orc.glb",
  "enemy.rat": "/three/enemies/rat.glb",

  // Environment
  "environment.fence1": "/three/environments/fence1.glb",
  "environment.ground": "/three/environments/ground.glb",
  "environment.pumpkin1": "/three/environments/pumpkin1.glb",
  "environment.pumpkin2": "/three/environments/pumpkin2.glb",

  // Obstacles
  "obstacle.bush": "/three/obstacles/bush.glb",
  "obstacle.rock": "/three/obstacles/rock.glb",
  "obstacle.stump": "/three/obstacles/stump.glb",

  // Players
  "player.batcat": "/three/players/batcat.glb",
  "player.carrambacat": "/three/players/carrambacat.glb",
  "player.commandocat": "/three/players/commandocat.glb",
  "player.cybercat": "/three/players/cybercat.glb",
  "player.darkcat": "/three/players/darkcat.glb",
  "player.ghostcat": "/three/players/ghostcat.glb",
  "player.ironcat": "/three/players/ironcat.glb",
  "player.punishcat": "/three/players/punishcat.glb",
  "player.robocat": "/three/players/robocat.glb",
  "player.samurcat": "/three/players/samurcat.glb",
  "player.termicator": "/three/players/termicator.glb",
  "player.zombocat": "/three/players/zombocat.glb",
  "player.kotan": "/three/players/kotan.glb",
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
