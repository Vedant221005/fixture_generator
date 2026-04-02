export function shuffleArray<T>(items: T[]): T[] {
  const array = [...items]

  for (let index = array.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[array[index], array[randomIndex]] = [array[randomIndex], array[index]]
  }

  return array
}