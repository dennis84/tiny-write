export const getAllTextnodes = (el: Element) => {
  const nodes = []
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false)
  let cur
  while(cur = walk.nextNode()) nodes.push(cur)
  return nodes
}

export const getNodeAt = (el: Element, position: number): Element => {
  const nodes = getAllTextnodes(el)
  for(var n = 0; n < nodes.length; n++) {
    if (position > nodes[n].nodeValue.length && nodes[n+1]) {
      position -= nodes[n].nodeValue.length
    } else {
      return nodes[n]
    }
  }
}
