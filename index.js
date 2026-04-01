addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  return fetch(new URL("index.html", import.meta.url))
}
