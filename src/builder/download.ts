/** Hands text to the browser as a file download. */
export function downloadFile(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Some browsers start reading the file after click() returns.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
