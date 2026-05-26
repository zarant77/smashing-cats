const DEFAULT_BASE_CHAR = "⣿";
const DEFAULT_PUPIL_CHAR = "⣤";
const DEFAULT_COLOR_START = "\x1b[36m";
const DEFAULT_COLOR_END = "\x1b[39m";

export function startPupilAnimator(options) {
  const {
    screen,
    pupils,
    origin,
    baseChar = DEFAULT_BASE_CHAR,
    pupilChar = DEFAULT_PUPIL_CHAR,
    colorStart = DEFAULT_COLOR_START,
    colorEnd = DEFAULT_COLOR_END,
    frameDelayMs = 450,
  } = options;

  if (origin === undefined || origin === null) {
    throw new Error("startPupilAnimator requires an origin from the splash renderer");
  }

  let stopped = false;
  let poseIndex = 0;
  let timer = null;

  const poses = createDefaultPoses(pupils);
  const state = createInitialState(pupils);

  function drawChar(point, char) {
    const position = getScreenPosition(origin, point);

    screen.program.move(position.x, position.y);
    screen.program.flush();
    screen.program.write(`${colorStart}${char}${colorEnd}`);
  }

  function drawPose(pose) {
    for (const [eyeName, pointIndex] of Object.entries(pose)) {
      const eyePoints = pupils[eyeName];
      const previousPoint = state[eyeName];

      if (eyePoints === undefined) {
        continue;
      }

      const nextPoint = eyePoints[pointIndex];

      if (nextPoint === undefined) {
        continue;
      }

      if (previousPoint !== null) {
        drawChar(previousPoint, baseChar);
      }

      drawChar(nextPoint, pupilChar);
      state[eyeName] = nextPoint;
    }
  }

  function tick() {
    if (stopped) {
      return;
    }

    const pose = poses[poseIndex % poses.length];

    drawPose(pose);
    poseIndex += 1;

    timer = setTimeout(tick, frameDelayMs);
    timer.unref?.();
  }

  tick();

  return {
    stop() {
      stopped = true;

      if (timer !== null) {
        clearTimeout(timer);
      }

      for (const point of Object.values(state)) {
        if (point !== null) {
          drawChar(point, baseChar);
        }
      }
    },
  };
}

function createInitialState(pupils) {
  return Object.fromEntries(Object.keys(pupils).map((eyeName) => [eyeName, null]));
}

function createDefaultPoses(pupils) {
  const eyeNames = Object.keys(pupils);
  const maxPoints = Math.max(...eyeNames.map((eyeName) => pupils[eyeName].length));
  const poses = [];

  for (let index = 0; index < maxPoints; index += 1) {
    poses.push(createPose(pupils, eyeNames, index));
  }

  for (let index = maxPoints - 2; index > 0; index -= 1) {
    poses.push(createPose(pupils, eyeNames, index));
  }

  return poses;
}

function createPose(pupils, eyeNames, index) {
  const pose = {};

  for (const eyeName of eyeNames) {
    const points = pupils[eyeName];
    const safeIndex = Math.min(index, points.length - 1);

    pose[eyeName] = safeIndex;
  }

  return pose;
}

function getScreenPosition(origin, point) {
  return {
    x: origin.x + point.x + 1,
    y: origin.y + point.y + 1,
  };
}
