import blessed from "blessed";

export function askModulesInTui(screen, options) {
  return new Promise((resolve) => {
    const selected = new Set(options.selectedModules);

    const overlay = blessed.box({
      parent: screen,
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      style: {
        bg: "black",
      },
    });

    const box = blessed.box({
      parent: overlay,
      top: "center",
      left: "center",
      width: 42,
      height: 14,
      border: "line",
      label: ` ${options.title} `,
      tags: true,
      padding: 1,
      style: {
        bg: "black",
        border: {
          fg: "cyan",
        },
      },
    });

    const list = blessed.list({
      parent: box,
      top: 0,
      left: 0,
      width: "100%",
      height: "100%-2",
      keys: true,
      mouse: true,
      vi: true,
      items: createItems(options.choices, selected),
      style: {
        selected: {
          bg: "blue",
          fg: "white",
          bold: true,
        },
      },
    });

    const footer = blessed.box({
      parent: box,
      bottom: 0,
      left: 0,
      width: "100%",
      height: 1,
      tags: true,
      content: "{gray-fg}Space toggle • Enter confirm • Esc cancel{/gray-fg}",
    });

    function close(result) {
      overlay.destroy();
      screen.render();

      resolve(result);
    }

    function submit() {
      if (selected.size === 0) {
        footer.setContent("{red-fg}Select at least one module{/red-fg}");
        screen.render();

        return;
      }

      close([...selected]);
    }

    function toggleCurrent() {
      const index = list.selected;
      const choice = options.choices[index];

      if (choice === undefined) {
        return;
      }

      if (selected.has(choice.value)) {
        selected.delete(choice.value);
      } else {
        selected.add(choice.value);
      }

      list.setItems(createItems(options.choices, selected));
      list.select(index);

      screen.render();
    }

    list.key("space", () => {
      toggleCurrent();
    });

    list.key("enter", () => {
      submit();
    });

    list.key("escape", () => {
      close(null);
    });

    list.focus();
    screen.render();
  });
}

function createItems(choices, selected) {
  return choices.map((choice) => {
    const checked = selected.has(choice.value);

    return `${checked ? "☑" : "☐"} ${choice.name}`;
  });
}
