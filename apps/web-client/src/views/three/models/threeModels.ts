export type ThreeModelDefinition = {
  path: string;
  rotationY?: number;
};

export const ThreeModels = {
  Civilians: {
    baba: {
      path: "/three/civilians/baba.glb",
      rotationY: Math.PI / -2 + 0.7,
    },

    dido: {
      path: "/three/civilians/dido.glb",
      rotationY: Math.PI / -2 + 0.7,
    },
  },

  Enemies: {
    boar: {
      path: "/three/enemies/boar.glb",
      rotationY: -Math.PI / 2 + 0.2,
    },

    crow: {
      path: "/three/enemies/crow.glb",
      rotationY: -Math.PI / 2 + 0.2,
    },

    orc: {
      path: "/three/enemies/orc.glb",
      rotationY: Math.PI / -2 + 0.7,
    },

    rat: {
      path: "/three/enemies/rat.glb",
      rotationY: -Math.PI / 2 + 0.2,
    },
  },

  Environments: {
    ground: {
      path: "/three/environments/ground.glb",
      rotationY: 0,
    },
    fence1: {
      path: "/three/environments/fence1.glb",
      rotationY: 0,
    },
    pumpkin1: {
      path: "/three/environments/pumpkin1.glb",
      rotationY: 0,
    },
    pumpkin2: {
      path: "/three/environments/pumpkin2.glb",
      rotationY: 0,
    },
  },

  Obstactes: {
    bush: {
      path: "/three/obstacles/bush.glb",
      rotationY: 0,
    },

    cactus: {
      path: "/three/obstacles/cactus.glb",
      rotationY: 0,
    },

    rock: {
      path: "/three/obstacles/rock.glb",
      rotationY: 0,
    },

    stump: {
      path: "/three/obstacles/stump.glb",
      rotationY: 0,
    },
  },

  Players: {
    batcat: {
      path: "/three/players/batcat.glb",
      rotationY: Math.PI + 0.6,
    },

    carrambacat: {
      path: "/three/players/carrambacat.glb",
      rotationY: Math.PI + 0.5,
    },

    commandocat: {
      path: "/three/players/commandocat.glb",
      rotationY: Math.PI + 0.5,
    },

    cybercat: {
      path: "/three/players/cybercat.glb",
      rotationY: Math.PI + 0.3,
    },

    darkcat: {
      path: "/three/players/darkcat.glb",
      rotationY: Math.PI + 0.5,
    },

    ghostcat: {
      path: "/three/players/ghostcat.glb",
      rotationY: Math.PI + 0.5,
    },

    ironcat: {
      path: "/three/players/ironcat.glb",
      rotationY: Math.PI + 0.6,
    },

    punishcat: {
      path: "/three/players/punishcat.glb",
      rotationY: Math.PI + 0.5,
    },

    robocat: {
      path: "/three/players/robocat.glb",
      rotationY: Math.PI + 0.5,
    },

    samurcat: {
      path: "/three/players/samurcat.glb",
      rotationY: Math.PI + 0.5,
    },

    termicator: {
      path: "/three/players/termicator.glb",
      rotationY: Math.PI + 0.3,
    },

    zombocat: {
      path: "/three/players/zombocat.glb",
      rotationY: Math.PI + 0.7,
    },
  },
} as const;

export const ThreeModelPreloadList: string[] = [
  ...Object.values(ThreeModels.Civilians).map((x) => x.path),
  ...Object.values(ThreeModels.Enemies).map((x) => x.path),
  ...Object.values(ThreeModels.Environments).map((x) => x.path),
  ...Object.values(ThreeModels.Obstactes).map((x) => x.path),
  ...Object.values(ThreeModels.Players).map((x) => x.path),
];
