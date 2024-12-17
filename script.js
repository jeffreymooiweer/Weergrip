// script.js

const apiKey = "API_KEY_PLACEHOLDER"; // Vervang met jouw API-sleutel

// Functie om het "Advies Krijgen" button click te verwerken
async function getAdvice() {
  const adviceTextElement = document.getElementById("advice-text");
  const carContainer = document.getElementById("car-container");
  const animationContainer = document.getElementById("animation-container");

  // Reset adviescontainer en animatie
  adviceTextElement.innerHTML = "";
  adviceTextElement.classList.remove("show");
  carContainer.classList.remove("show");
  
  const existingRemspoor = document.getElementById("remspoor");
  if (existingRemspoor) {
    existingRemspoor.remove();
  }

  // Voeg remspoor toe binnen de car-container
  const remspoor = document.createElement("div");
  remspoor.id = "remspoor";
  carContainer.appendChild(remspoor);

  // Start animatie na een korte vertraging om reset te laten plaatsvinden
  setTimeout(() => {
    carContainer.classList.add("show");
  }, 100);

  // Voeg advies tekst toe na de animatie (2 seconden animatie + extra vertraging)
  setTimeout(() => {
    loadAdvice();
  }, 2200);
}

// Functie om het advies te laden na de animaties
async function loadAdvice() {
  const adviceTextElement = document.getElementById("advice-text");

  // Voeg een laadindicator toe
  adviceTextElement.innerHTML = "<p>Advies wordt geladen...</p>";
  adviceTextElement.classList.add("show");

  const location = await getDeviceLocation();
  if (!location) {
    adviceTextElement.innerHTML =
      "<p>Kon de locatie niet ophalen. Zorg ervoor dat locatiebepaling is ingeschakeld en probeer opnieuw.</p>";
    return;
  }

  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
    location
  )}&units=metric&appid=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        "Locatie niet gevonden. Controleer of je locatie correct is ingesteld."
      );
    }
    const data = await response.json();
    analyzeForecast(data, adviceTextElement);
  } catch (error) {
    adviceTextElement.innerHTML = `<p>Error: ${error.message}</p>`;
  }
}

// Functie om de locatie van de gebruiker te verkrijgen, met fallback naar Amsterdam
async function getDeviceLocation() {
  if (!navigator.geolocation) {
    console.warn("Geolocatie niet beschikbaar. Gebruik fallbacklocatie.");
    return "Amsterdam"; // Fallbacklocatie
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const geoApiUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${apiKey}`;

        try {
          const response = await fetch(geoApiUrl);
          if (!response.ok) {
            throw new Error("Geocoding API gaf een fout.");
          }
          const [geoData] = await response.json();
          if (geoData && geoData.name) {
            resolve(geoData.name);
          } else {
            resolve("Amsterdam");
          }
        } catch {
          resolve("Amsterdam"); // Fallbacklocatie
        }
      },
      () => resolve("Amsterdam") // Fallbacklocatie bij fout
    );
  });
}

// Functie om de weersvoorspelling te analyseren en de beste dag te bepalen
function analyzeForecast(data, adviceTextElement) {
  const forecastList = data.list;
  let coldDays = 0;
  let warmDays = 0;
  const requiredColdDays = 14; // Aantal dagen voor winterbanden
  const requiredWarmDays = 14; // Aantal dagen voor zomerbanden
  const temperatureThreshold = 7; // Graden Celsius

  // Loop door de forecast data om te zoeken naar een periode van koude of warme dagen
  for (let i = 0; i < forecastList.length; i++) {
    const item = forecastList[i];
    const temp = item.main.temp_min;

    if (temp < temperatureThreshold) {
      coldDays++;
      warmDays = 0; // Reset warme dagen
      if (coldDays >= requiredColdDays) {
        break;
      }
    } else {
      warmDays++;
      coldDays = 0; // Reset koude dagen
      if (warmDays >= requiredWarmDays) {
        break;
      }
    }
  }

  if (coldDays >= requiredColdDays) {
    // Advies voor winterbanden
    const startIndex = findStartIndex(forecastList, requiredColdDays, temperatureThreshold);
    const endIndex = startIndex + requiredColdDays - 1;
    const startDate = new Date(forecastList[startIndex].dt_txt);
    const endDate = new Date(forecastList[endIndex].dt_txt);
    adviceTextElement.innerHTML = `
      <h3>Advies voor het wisselen van banden:</h3>
      <p>Op basis van de weersvoorspelling is het aanbevolen om winterbanden te gebruiken van <strong>${formatDate(startDate)}</strong> tot <strong>${formatDate(endDate)}</strong>.</p>
      <p>Dit is gebaseerd op minimaal ${requiredColdDays} dagen met temperaturen onder de ${temperatureThreshold}°C.</p>
    `;
  } else if (warmDays >= requiredWarmDays) {
    // Advies voor zomerbanden
    const startIndex = findStartIndex(forecastList, requiredWarmDays, temperatureThreshold, false);
    const endIndex = startIndex + requiredWarmDays - 1;
    const startDate = new Date(forecastList[startIndex].dt_txt);
    const endDate = new Date(forecastList[endIndex].dt_txt);
    adviceTextElement.innerHTML = `
      <h3>Advies voor het wisselen van banden:</h3>
      <p>Op basis van de weersvoorspelling is het aanbevolen om zomerbanden te gebruiken van <strong>${formatDate(startDate)}</strong> tot <strong>${formatDate(endDate)}</strong>.</p>
      <p>Dit is gebaseerd op minimaal ${requiredWarmDays} dagen met temperaturen boven de ${temperatureThreshold}°C.</p>
    `;
  } else {
    // Geen duidelijke aanbeveling
    adviceTextElement.innerHTML = `
      <h3>Advies voor het wisselen van banden:</h3>
      <p>Op basis van de huidige weersvoorspellingen is er geen duidelijke aanbeveling om banden te wisselen. Blijf de weersvoorspellingen volgen en pas je banden aan wanneer nodig.</p>
    `;
  }

  adviceTextElement.classList.add("show");
}

// Hulpfunctie om de startindex te vinden van de periode
function findStartIndex(forecastList, requiredDays, threshold, isCold = true) {
  let count = 0;
  for (let i = 0; i < forecastList.length; i++) {
    const temp = forecastList[i].main.temp_min;
    if ((isCold && temp < threshold) || (!isCold && temp > threshold)) {
      count++;
      if (count === 1) {
        startIndex = i;
      }
      if (count >= requiredDays) {
        return startIndex;
      }
    } else {
      count = 0;
    }
  }
  return 0;
}

// Functie om de datum te formatteren in het Nederlands
function formatDate(date) {
  const days = [
    "Zondag",
    "Maandag",
    "Dinsdag",
    "Woensdag",
    "Donderdag",
    "Vrijdag",
    "Zaterdag",
  ];
  const months = [
    "Januari",
    "Februari",
    "Maart",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Augustus",
    "September",
    "Oktober",
    "November",
    "December",
  ];

  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${dayName} ${day} ${month} ${year}`;
}

// Event listener voor de "Advies Krijgen" knop
document.getElementById("get-advice-button").addEventListener("click", getAdvice);
