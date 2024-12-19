// script.js

const apiKey = "API_KEY_PLACEHOLDER"; // Wordt vervangen door Visual Crossing API-sleutels

// Functie om het "Advies Krijgen" button click te verwerken
async function getAdvice() {
  const adviceTextElement = document.getElementById("advice-text");
  const carContainer = document.getElementById("car-container");

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

  const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(location)}/15day?unitGroup=metric&key=${apiKey}&contentType=json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        "Locatie niet gevonden. Controleer of je locatie correct is ingesteld."
      );
    }
    const data = await response.json();
    console.log(data); // Voor debugging
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
        const geoApiUrl = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${latitude},${longitude}/?key=${apiKey}&include=days&elements=datetime,resolvedAddress`;

        try {
          const response = await fetch(geoApiUrl);
          if (!response.ok) {
            throw new Error("Geocoding API gaf een fout.");
          }
          const geoData = await response.json();
          if (geoData && geoData.resolvedAddress) {
            resolve(geoData.resolvedAddress);
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
  const forecastList = data.days;
  let coldDays = 0;
  let warmDays = 0;
  const requiredColdDays = 14; // Aantal dagen voor winterbanden
  const requiredWarmDays = 14; // Aantal dagen voor zomerbanden
  const temperatureThreshold = 7; // Graden Celsius

  let currentColdDays = 0;
  let currentWarmDays = 0;
  let longestColdSequence = 0;
  let longestWarmSequence = 0;

  // Detecteer de langste reeks koude en warme dagen
  forecastList.forEach(day => {
    const minTemp = day.tempmin;
    const maxTemp = day.tempmax;

    if (minTemp < temperatureThreshold) {
      currentColdDays++;
      currentWarmDays = 0;
      if (currentColdDays > longestColdSequence) {
        longestColdSequence = currentColdDays;
      }
    } else {
      currentWarmDays++;
      currentColdDays = 0;
      if (currentWarmDays > longestWarmSequence) {
        longestWarmSequence = currentWarmDays;
      }
    }
  });

  if (longestColdSequence >= requiredColdDays) {
    // Advies voor winterbanden
    const coldStartIndex = findStartIndex(forecastList, requiredColdDays, temperatureThreshold, true);
    const startDate = new Date(forecastList[coldStartIndex].datetime);
    const endDate = new Date(forecastList[coldStartIndex + requiredColdDays - 1].datetime);
    adviceTextElement.innerHTML = `
      <h3>Advies voor het wisselen van banden:</h3>
      <p>Op basis van de weersvoorspelling is het aanbevolen om winterbanden te gebruiken van <strong>${formatDate(startDate)}</strong> tot <strong>${formatDate(endDate)}</strong>.</p>
      <p>Dit is gebaseerd op minimaal ${requiredColdDays} dagen met temperaturen onder de ${temperatureThreshold}°C.</p>
      <p>Winterbanden bieden maximale grip en veiligheid bij koude temperaturen en op natte of besneeuwde wegen. Het rubber van winterbanden blijft elastisch bij lage temperaturen, wat essentieel is voor veilige rijprestaties.</p>
    `;
  } else if (longestWarmSequence >= requiredWarmDays) {
    // Advies voor zomerbanden
    const warmStartIndex = findStartIndex(forecastList, requiredWarmDays, temperatureThreshold, false);
    const startDate = new Date(forecastList[warmStartIndex].datetime);
    const endDate = new Date(forecastList[warmStartIndex + requiredWarmDays - 1].datetime);
    adviceTextElement.innerHTML = `
      <h3>Advies voor het wisselen van banden:</h3>
      <p>Op basis van de weersvoorspelling is het aanbevolen om zomerbanden te gebruiken van <strong>${formatDate(startDate)}</strong> tot <strong>${formatDate(endDate)}</strong>.</p>
      <p>Dit is gebaseerd op minimaal ${requiredWarmDays} dagen met temperaturen boven de ${temperatureThreshold}°C.</p>
      <p>Zomerbanden zijn geoptimaliseerd voor warme temperaturen en bieden betere prestaties en efficiëntie tijdens warme seizoenen. Ze hebben een harder rubbermengsel dat beter presteert bij hogere temperaturen.</p>
    `;
  } else {
    // Geen duidelijke aanbeveling
    adviceTextElement.innerHTML = `
      <h3>Advies voor het wisselen van banden:</h3>
      <p>Op basis van de huidige weersvoorspellingen is er geen duidelijke aanbeveling om banden te wisselen. Blijf de weersvoorspellingen volgen en pas je banden aan wanneer langdurige koude of warme periodes worden voorspeld.</p>
    `;
  }

  adviceTextElement.classList.add("show");
}

// Hulpfunctie om de startindex te vinden van de periode
function findStartIndex(forecastList, requiredDays, threshold, isCold = true) {
  let count = 0;
  let startIndex = 0;

  for (let i = 0; i < forecastList.length; i++) {
    const temp = isCold ? forecastList[i].tempmin : forecastList[i].tempmax;
    if ((isCold && temp < threshold) || (!isCold && temp > threshold)) {
      if (count === 0) {
        startIndex = i;
      }
      count++;
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
