import { buildViews, cleanTargets, devModules, oneShotTasks } from "./config.mjs";

export const menuTree = [
  {
    id: "dev",
    title: "Dev",
    children: [
      {
        id: "dev:start",
        title: "Start dev",
        action: "dev:start",
      },
      {
        id: "dev:restart",
        title: "Restart dev",
        action: "dev:restart",
      },
      {
        id: "dev:stop",
        title: "Stop dev",
        action: "dev:stop",
      },
      {
        id: "dev:logs",
        title: "Show dev logs",
        action: "dev:logs",
      },
    ],
  },

  {
    id: "build",
    title: "Build",
    children: [
      {
        id: "build:web",
        title: "Build web",
        action: "build:web",
      },
      {
        id: "build:android",
        title: "Build Android",
        action: "build:android",
      },
    ],
  },

  {
    id: "checks",
    title: "Checks",
    children: Object.entries(oneShotTasks).map(([id, task]) => ({
      id: `task:${id}`,
      title: task.title,
      action: "task:run",
      payload: {
        taskName: id,
      },
    })),
  },

  {
    id: "clean",
    title: "Clean",
    children: [
      ...Object.entries(cleanTargets).map(([id, target]) => ({
        id: `clean:${id}`,
        title: target.title,
        action: "clean:target",
        payload: {
          targetName: id,
        },
      })),

      {
        id: "clean:all",
        title: "Clean all",
        action: "clean:all",
      },
    ],
  },

  {
    id: "exit",
    title: "Exit",
    action: "exit",
  },
];

export function getModuleChoices() {
  return Object.entries(devModules).map(([value, moduleConfig]) => ({
    name: moduleConfig.title,
    value,
  }));
}

export function getBuildViewChoices() {
  return Object.entries(buildViews).map(([value, moduleConfig]) => ({
    name: moduleConfig.title,
    value,
  }));
}

export function findMenuItemById(id, items = menuTree) {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }

    if (item.children !== undefined) {
      const childItem = findMenuItemById(id, item.children);

      if (childItem !== null) {
        return childItem;
      }
    }
  }

  return null;
}

export function flattenMenu(items = menuTree, depth = 0) {
  return items.flatMap((item) => {
    const row = {
      ...item,
      depth,
    };

    if (item.children === undefined) {
      return [row];
    }

    return [row, ...flattenMenu(item.children, depth + 1)];
  });
}
