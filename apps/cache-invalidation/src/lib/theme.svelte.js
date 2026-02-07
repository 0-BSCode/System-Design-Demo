let current = $state("flux");

export function getTheme() {
  return current;
}

export function setTheme(name) {
  current = name;
}
