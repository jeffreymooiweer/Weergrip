// script.js

// Functie om het "Advies Krijgen" button click te verwerken
async function getAdvice() {
  const adviceTextElement = document.getElementById("advice-text");
  const carElement = document.getElementById("car");
  const animationContainer = document.getElementById("animation-container");

  // Reset adviescontainer en animatie
  adviceTextElement.innerHTML = "";
  adviceTextElement.classList.remove("show");
  carElement.classList.remove("show");
  
  const existingRemspoor = document.getElementById("remspoor");
  if (existingRemspoor) {
    existingRemspoor.remove();
  }

  // Voeg remspoor toe
  const remspoor = document.createElement("div");
  remspoor.id = "remspoor";
  animationContainer.appendChild(remspoor);

  // Start animatie na een korte vertraging om reset te laten plaatsvinden
  setTimeout(() => {
    carElement.classList.add("show");
  }, 100);

  // Voeg remspoor klasse toe na de auto is gestopt (2 seconden animatie)
  setTimeout(() => {
    remspoor.classList.add("show");
  }, 2100); // 100ms + 2000ms animatie van de auto

  // Voeg advies tekst toe na de remspoor animatie (1 seconde later)
  setTimeout(() => {
    loadAdvice();
  }, 3200); // 2100ms + 1100ms voor remspoor
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

  const apiKey = "API_KEY_PLACEHOLDER"; // Vervang met jouw API-sleutel
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
  let bestDay = null;

  for (const item of forecastList) {
    const date = new Date(item.dt_txt);
    const temp = item.main.temp;
    const weather = item.weather[0].main.toLowerCase();

    if (temp < 7 && (weather.includes("snow") || weather.includes("rain"))) {
      bestDay = bestDay || {
        date: formatDate(date),
        reason: "Lage temperatuur en sneeuwval of regen maken dit een geschikt moment.",
        type: "winterbanden",
      };
    } else if (temp >= 7 && weather.includes("clear") && !bestDay) {
      bestDay = {
        date: formatDate(date),
        reason: "Helder weer met hogere temperaturen maakt dit een geschikte keuze.",
        type: "zomerbanden",
      };
    }
  }

  if (bestDay) {
    adviceTextElement.innerHTML = `
      <h3>Optimale dag om je banden te wisselen:</h3>
      <p><strong>${bestDay.date}</strong></p>
      <p>${bestDay.reason}</p>
      <p><strong>Advies:</strong> Verwissel je banden naar <strong>${bestDay.type}</strong>.</p>
    `;
  } else {
    adviceTextElement.innerHTML = `
      <p>Geen geschikte dag gevonden in de komende week. Controleer later opnieuw.</p>
    `;
  }

  adviceTextElement.classList.add("show");
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
