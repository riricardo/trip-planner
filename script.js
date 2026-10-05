const daysContainer = document.querySelector("#days");
const errorMessage = document.querySelector("#error");
const dayTemplate = document.querySelector("#day-template");
const stopTemplate = document.querySelector("#stop-template");

async function loadItinerary() {
  try {
    const response = await fetch("./data.json");

    if (!response.ok) {
      throw new Error(`Não foi possível carregar data.json (${response.status}).`);
    }

    const data = await response.json();

    if (!Array.isArray(data.days)) {
      throw new Error("O arquivo data.json não contém uma lista de dias válida.");
    }

    document.querySelector("#trip-title").textContent = data.title || "Meu roteiro";
    document.querySelector("#trip-subtitle").textContent = data.subtitle || "";
    daysContainer.replaceChildren(...data.days.map(renderDay));
  } catch (error) {
    console.error("Erro ao carregar o roteiro:", error);
    errorMessage.textContent =
      "Não foi possível carregar o roteiro. Confira se data.json está ao lado do index.html e abra o site por um servidor local.";
    errorMessage.hidden = false;
  }
}

function renderDay(day) {
  const fragment = dayTemplate.content.cloneNode(true);
  fragment.querySelector(".day-date").textContent = day.date || "";
  fragment.querySelector(".day-title").textContent = day.title || "Dia sem título";

  const stopsContainer = fragment.querySelector(".stops");
  const stops = Array.isArray(day.stops) ? day.stops : [];

  stops.forEach((stop, stopIndex) => {
    stopsContainer.append(renderStop(stop));

    if (stopIndex < stops.length - 1 && stop.routeToNext) {
      stopsContainer.append(
        renderRoute(stop.routeToNext, stop.name, stops[stopIndex + 1].name)
      );
    }
  });

  return fragment;
}

function renderStop(stop) {
  const fragment = stopTemplate.content.cloneNode(true);
  const image = fragment.querySelector(".stop-image");
  const imageUrl = stop.imageUrl || stop.image;

  fragment.querySelector(".stop-type").textContent = stop.type || "Parada";
  fragment.querySelector(".stop-name").textContent = stop.name || "Local sem nome";
  fragment.querySelector(".arrival").textContent = stop.arrival || "";
  fragment.querySelector(".arrival").hidden = !stop.arrival;
  fragment.querySelector(".duration").textContent = stop.duration ? `⏱ ${stop.duration}` : "";
  fragment.querySelector(".duration").hidden = !stop.duration;
  fragment.querySelector(".description").textContent = stop.description || "";
  fragment.querySelector(".description").hidden = !stop.description;

  if (imageUrl) {
    image.src = imageUrl;
    image.alt = stop.name || "Imagem da parada";
    image.addEventListener("error", () => {
      image.hidden = true;
    }, { once: true });
  } else {
    image.hidden = true;
  }

  const imagesButton = fragment.querySelector(".images-button");
  const imagesUrl = typeof stop.googleImages === "string" ? stop.googleImages.trim() : "";
  imagesButton.hidden = !imagesUrl;

  if (imagesUrl) {
    imagesButton.href = imagesUrl;
    imagesButton.setAttribute("aria-label", `Ver imagens de ${stop.name || "esta parada"}`);
  }

  return fragment;
}

function renderRoute(route, fromName, toName) {
  const leg = document.createElement("div");
  leg.className = "route-leg";

  const rail = document.createElement("div");
  rail.className = "route-rail";

  const marker = document.createElement("span");
  marker.className = "route-marker";
  marker.setAttribute("aria-hidden", "true");
  marker.textContent = "🚗";

  const info = document.createElement("div");
  info.className = "route-info";

  const label = document.createElement("span");
  label.className = "route-label";
  label.textContent = `${fromName || "Esta parada"} → ${toName || "próxima parada"}`;

  const details = document.createElement("strong");
  details.className = "route-details";
  const travelDetails = [route.distance, route.time || route.duration].filter(Boolean);
  details.textContent = travelDetails.join(" · ");

  info.append(label, details);
  rail.append(marker);

  leg.append(rail, info);
  return leg;
}

loadItinerary();