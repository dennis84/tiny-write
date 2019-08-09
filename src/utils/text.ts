export const wordCount = (str: string) => {
  const el = document.createElement('div')
  el.innerHTML = str

  let count = 0
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false)
  while(walk.nextNode()) {
    count += walk.currentNode.textContent
      .split(/\s+/).filter(x => x != '').length
  }

  return count
}

export const toText = (str: string) => {
  const el = document.createElement('div')
  el.innerHTML = str

  let text = ''
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false)
  while(walk.nextNode()) {
    text += walk.currentNode.textContent
  }

  return text
}
