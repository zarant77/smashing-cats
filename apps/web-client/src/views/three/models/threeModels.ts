export type ThreeModelDefinition = {
  rotationY?: number;
  offsetZ?: number;
};

export const ThreeModels = {
  civilian: {
    baba: {
      rotationY: Math.PI / -2 + 0.7,
      offsetZ: 0,
    },

    dido: {
      rotationY: Math.PI / -2 + 0.7,
      offsetZ: 0,
    },
  },

  enemy: {
    boar: {
      rotationY: -Math.PI / 2 + 0.2,
      offsetZ: 0,
    },

    crow: {
      rotationY: -Math.PI / 2 + 0.2,
      offsetZ: 0,
    },

    orc: {
      rotationY: Math.PI / -2 + 0.7,
      offsetZ: 0,
    },

    rat: {
      rotationY: -Math.PI / 2 + 0.2,
      offsetZ: 0,
    },
  },

  environment: {
    ground: {
      rotationY: 0,
      offsetZ: 0,
    },

    fence1: {
      rotationY: 0,
      offsetZ: 0,
    },

    pumpkin1: {
      rotationY: 0,
      offsetZ: 0,
    },

    pumpkin2: {
      rotationY: 0,
      offsetZ: 0,
    },
  },

  obstacle: {
    bush: {
      rotationY: 0,
      offsetZ: 50,
    },

    cactus: {
      rotationY: 0,
      offsetZ: 50,
    },

    rock: {
      rotationY: 0,
      offsetZ: 50,
    },

    stump: {
      rotationY: 0,
      offsetZ: 50,
    },
  },

  player: {
    batcat: {
      rotationY: Math.PI + 0.6,
      offsetZ: -70,
    },

    carrambacat: {
      rotationY: Math.PI + 0.5,
      offsetZ: -70,
    },

    commandocat: {
      rotationY: Math.PI + 0.5,
      offsetZ: -70,
    },

    cybercat: {
      rotationY: Math.PI + 0.3,
      offsetZ: -70,
    },

    darkcat: {
      rotationY: Math.PI + 0.5,
      offsetZ: -70,
    },

    ghostcat: {
      rotationY: Math.PI + 0.5,
      offsetZ: -70,
    },

    ironcat: {
      rotationY: Math.PI + 0.6,
      offsetZ: -70,
    },

    punishcat: {
      rotationY: Math.PI + 0.5,
      offsetZ: -70,
    },

    robocat: {
      rotationY: Math.PI + 0.5,
      offsetZ: -70,
    },

    samurcat: {
      rotationY: Math.PI + 0.5,
      offsetZ: -70,
    },

    termicator: {
      rotationY: Math.PI + 0.3,
      offsetZ: -70,
    },

    zombocat: {
      rotationY: Math.PI + 0.7,
      offsetZ: -70,
    },

    kotan: {
      rotationY: Math.PI + 0.7,
      offsetZ: -70,
    },
  },
} as const;

export type ThreeModelType = keyof typeof ThreeModels;

export function getModelInfoByKey(key: string): ThreeModelDefinition {
  const [type, kind] = key.split(".");

  const typeModels = ThreeModels[type as ThreeModelType];

  if (typeModels === undefined) {
    throw new Error(`Unknown model type: ${type}`);
  }

  const model = typeModels[kind as keyof typeof typeModels];

  if (model === undefined) {
    throw new Error(`Unknown model kind: ${key}`);
  }

  return model;
}
