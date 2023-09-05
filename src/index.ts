import puppeteer, { Browser, Page } from "puppeteer";

async function recordActions(startingURL: string): Promise<any> {
  const browser: Browser = await puppeteer.launch({ headless: false });
  const page: Page = await browser.newPage();

  await page.goto(startingURL);

  const recordedActions: any[] = [];

  // Inject event listeners into the page
  await page.evaluate(() => {
    // This function gets a selector for a given DOM element
    const getSelector = (el: any) => {
      let path = "";
      while (el) {
        let name = el.localName;
        if (!name) break;

        let parent = el.parentNode;
        let siblings: any[] = Array.from(parent.children);

        if (siblings.length > 1) {
          name += `:nth-child(${1 + siblings.indexOf(el)})`;
        }

        path = name + (path ? ">" + path : "");
        el = parent;
      }
      return path;
    };

    document.addEventListener("click", (e) => {
      console.log(
        JSON.stringify({
          type: "click",
          selector: getSelector(e.target),
          timestamp: new Date().toISOString(),
        })
      );
    });

    document.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        console.log(
          JSON.stringify({
            type: "enter",
            selector: getSelector(e.target),
            timestamp: new Date().toISOString(),
          })
        );
      }
    });

    document.addEventListener("input", (e: Event) => {
      console.log(
        JSON.stringify({
          type: "input",
          selector: getSelector(e.target),
          value: (e.target as HTMLInputElement).value,
          timestamp: new Date().toISOString(),
        })
      );
    });
  });

  // Listen to page's console messages and record actions
  page.on("console", (msg) => {
    try {
      const eventData = JSON.parse(msg.text());
      recordedActions.push(eventData);
    } catch (error) {
      // It's not an event data, maybe other console logs
    }
  });

  return new Promise<any[]>((resolve) => {
    setTimeout(async () => {
      await browser.close();
      resolve(recordedActions);
    }, 10000); // Close after 10 seconds
  });
}

async function executeActions(actions: any[], url: string): Promise<void> {
  const browser: Browser = await puppeteer.launch({ headless: false });
  const page: Page = await browser.newPage();

  await page.goto(url);

  for (const action of actions) {
    switch (action.type) {
      case "click":
        await page.click(action.selector);
        break;

      case "enter":
        await page.keyboard.press("Enter");
        break;

      case "input":
        // Directly set the value of the input element.
        await page.evaluate(
          (selector, value) => {
            (document.querySelector(selector) as HTMLInputElement).value =
              value;
          },
          action.selector,
          action.value
        );
        break;
    }

    // Adding some delay between actions can make the execution more natural and less error-prone.
    new Promise((r) => setTimeout(r, 1000)); // Wait for 1 second between actions
  }

  await browser.close();
}

(async () => {
  const startingURL = "https://google.com";

  const recordedActions = await recordActions(startingURL);
  console.log("actions", recordedActions);
  executeActions(recordedActions, startingURL);
})();
