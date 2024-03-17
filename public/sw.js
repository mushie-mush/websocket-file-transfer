self.addEventListener("install", (e) => {
  console.log("SW has been installed");
});

self.addEventListener("activate", (e) => {
  console.log("SW has been activated");
});

self.addEventListener("fetch", (e) => {
  //   console.log("Fetch event");
});
