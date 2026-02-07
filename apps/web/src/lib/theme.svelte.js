/**
 * Theme state management.
 * Two themes: "default" (midnight navy) and "flux" (true-black fintech).
 */

let current = $state(
  (typeof localStorage !== "undefined" && localStorage.getItem("theme")) || "default",
);

export function getTheme() {
  return current;
}

export function setTheme(name) {
  current = name;
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", name);
  }
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("theme", name);
  }
}

export function toggleTheme() {
  setTheme(current === "default" ? "flux" : "default");
}

/** Apply the persisted theme on load */
export function initTheme() {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", current);
  }
}
