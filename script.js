// script.js

const meteostatApiKey = 'METEOSTAT_KEY_PLACEHOLDER'; // Wordt vervangen door GitHub Actions
const visualCrossingApiKey = 'VISUAL_CROSSING_KEY_PLACEHOLDER'; // Wordt vervangen door GitHub Actions

// Functie om Amsterdam Schiphol klimaatnormen op te halen
async function fetchClimateNormalsForAmsterdam() {
  const stationId = '06240'; // Station ID voor Amsterdam Schiphol
  const startYear = 1991;
  const endYear = 2020;
  const url = `https://meteostat.p.rapidapi.com/climate/normals?station=${stationId}&start=${startYear}&end=${endYear}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': meteostatApiKey,
        'X-RapidAPI-Host': 'meteostat.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      throw new Error('Fout bij het ophalen van klimaatnormen voor Amsterdam Schiphol.');
    }

    const data = await response.json();
    console.log("Climate Normals Data (Amsterdam Schiphol):", data); // Voor debugging

    return data.data; // Array van klimaatnormen per maand
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
}

// Functie om nationale klimaatnormen te verkrijgen via Amsterdam Schiphol
async function getNationalClimateData() {
  const climateData = await fetchClimateNormalsForAmsterdam();

  if (!climateData) {
    console.error('Kon de klimaatnormen voor Amsterdam Schiphol niet ophalen.');
    return null;
  }

  const averageMinTemps = {};
  const averageMaxTemps = {};

  climateData.forEach(monthData => {
    const month = monthData.month; // Maandnummer (1-12)
    averageMinTemps[month] = parseFloat(monthData.tmin).toFixed(1); // Gemiddelde minimumtemperatuur
    averageMaxTemps[month] = parseFloat(monthData.tmax).toFixed(1); // Gemiddelde maximumtemperatuur
  });

  console.log('Gemiddelde Minimumtemperaturen (Amsterdam Schiphol):', averageMinTemps);
  console.log('Gemiddelde Maximumtemperaturen (Amsterdam Schiphol):', averageMaxTemps);

  return { averageMinTemps, averageMaxTemps };
}

// Functie om de 15-daagse weersvoorspelling op te halen via Visual Crossing
async function fetchForecastData(location) {
  const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(location)}?unitGroup=metric&key=${visualCrossingApiKey}&contentType=json&include=days`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Locatie niet gevonden. Controleer of je locatie correct is ingesteld.");
    }
    const data = await response.json();
    console.log("Forecast Data:", data); // Voor debugging
    return data;
  } catch (error) {
    console.error("API Error:", error);
    return null;
  }
}

// Functie om de locatie van de gebruiker te verkrijgen, met fallback naar 'Netherlands'
async function getDeviceLocation() {
  if (!navigator.geolocation) {
    console.warn("Geolocatie niet beschikbaar. Gebruik landelijk gemiddelde.");
    return "Netherlands"; // Fallbacklocatie
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const locationString = `${latitude},${longitude}`;
        resolve(locationString);
      },
      () => resolve("Netherlands") // Fallbacklocatie bij fout
    );
  });
}

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

  // Haal nationale klimaatgegevens op via Amsterdam Schiphol
  const climateData = await getNationalClimateData();
  if (!climateData) {
    adviceTextElement.innerHTML = `<p>Kon de klimaatgegevens niet ophalen.</p>`;
    return;
  }
  const { averageMinTemps, averageMaxTemps } = climateData;

  // Haal forecast data op via Visual Crossing
  const location = await getDeviceLocation();
  const forecastData = await fetchForecastData(location);
  if (!forecastData) {
    adviceTextElement.innerHTML = `<p>Kon de weersvoorspelling niet ophalen.</p>`;
    return;
  }

  analyzeForecast(forecastData, averageMinTemps, averageMaxTemps, adviceTextElement);
}

// Functie om de switch datum te vinden op basis van een voorwaarde
function findSwitchDate(forecastList, tempKey, threshold, condition) {
  // condition: 'below' voor winter, 'above' voor summer
  const consecutiveDaysRequired = 14;
  let count = 0;
  let switchDate = null;

  for (let day of forecastList) {
    if (condition === 'below' && day[tempKey] < threshold) {
      count += 1;
    } else if (condition === 'above' && day[tempKey] > threshold) {
      count += 1;
    } else {
      count = 0;
    }

    if (count >= consecutiveDaysRequired) {
      switchDate = new Date(day.datetime);
      break;
    }
  }

  return switchDate;
}

// Functie om de weersvoorspelling te analyseren en de beste dag te bepalen
function analyzeForecast(data, averageMinTemps, averageMaxTemps, adviceTextElement) {
  const forecastList = data.days.slice(0, 15); // Beperk tot 15 dagen
  const requiredMinTempThreshold = 7; // Graden Celsius voor winterbanden
  const requiredMaxTempThreshold = 7; // Graden Celsius voor zomerbanden
  const today = new Date();

  // Functie om te controleren of twee datums hetzelfde zijn
  function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  // Functie om de eerste maandag van een maand te vinden
  function getFirstWeekdayOfMonth(month, year, weekday) {
    // weekday: 0=Sunday, 1=Monday, ..., 6=Saturday
    const date = new Date(year, month -1, 1);
    while (date.getDay() !== weekday) {
      date.setDate(date.getDate() +1);
    }
    return date;
  }

  // Advies Object
  const advice = {
    winter: null,
    summer: null
  };

  // Analyse voor winterbanden
  const winterStartDate = findSwitchDate(forecastList, 'tempmin', requiredMinTempThreshold, 'below');
  if (winterStartDate) {
    advice.winter = winterStartDate;
  } else {
    // Gebruik historische gemiddelde data (Amsterdam Schiphol)
    const currentMonth = today.getMonth() + 1;
    let recommendedMonth = null;
    for (let m = currentMonth; m <= 12; m++) {
      if (averageMinTemps[m] < requiredMinTempThreshold) {
        recommendedMonth = m;
        break;
      }
    }
    if (!recommendedMonth) {
      // Check volgend jaar
      for (let m = 1; m < currentMonth; m++) {
        if (averageMinTemps[m] < requiredMinTempThreshold) {
          recommendedMonth = m;
          break;
        }
      }
    }
    if (recommendedMonth) {
      const year = today.getFullYear();
      const recommendedDate = getFirstWeekdayOfMonth(recommendedMonth, year, 1); // 1 voor maandag
      advice.winter = recommendedDate;
    }
  }

  // Analyse voor zomerbanden
  const summerStartDate = findSwitchDate(forecastList, 'tempmax', requiredMaxTempThreshold, 'above');
  if (summerStartDate) {
    advice.summer = summerStartDate;
  } else {
    // Gebruik historische gemiddelde data (Amsterdam Schiphol)
    const currentMonth = today.getMonth() + 1;
    let recommendedSummerMonth = null;
    for (let m = currentMonth; m <= 12; m++) {
      if (averageMaxTemps[m] > requiredMaxTempThreshold) {
        recommendedSummerMonth = m;
        break;
      }
    }
    if (!recommendedSummerMonth) {
      // Check volgend jaar
      for (let m = 1; m < currentMonth; m++) {
        if (averageMaxTemps[m] > requiredMaxTempThreshold) {
          recommendedSummerMonth = m;
          break;
        }
      }
    }
    if (recommendedSummerMonth) {
      const year = today.getFullYear();
      const recommendedSummerDate = getFirstWeekdayOfMonth(recommendedSummerMonth, year, 1); // 1 voor maandag
      advice.summer = recommendedSummerDate;
    }
  }

  // Genereer Advies Tekst
  let adviceText = '';

  // Advies voor winterbanden
  if (advice.winter) {
    if (isSameDay(advice.winter, today)) {
      adviceText += `
        <h3>Advies voor het wisselen van banden:</h3>
        <p>Het is aanbevolen om vandaag winterbanden te gebruiken.</p>
        <p>Dit is gebaseerd op verwachte temperaturen onder de ${requiredMinTempThreshold}°C.</p>
        <p>Winterbanden bieden maximale grip en veiligheid bij koude temperaturen en op natte of besneeuwde wegen. Het rubber van winterbanden blijft elastisch bij lage temperaturen, wat essentieel is voor veilige rijprestaties.</p>
      `;
    } else if (advice.winter > today) {
      adviceText += `
        <h3>Advies voor het wisselen van banden:</h3>
        <p>Op basis van de weersvoorspelling is het aanbevolen om winterbanden te gebruiken op <strong>${formatDate(advice.winter)}</strong>.</p>
        <p>Dit is gebaseerd op verwachte temperaturen onder de ${requiredMinTempThreshold}°C.</p>
        <p>Winterbanden bieden maximale grip en veiligheid bij koude temperaturen en op natte of besneeuwde wegen. Het rubber van winterbanden blijft elastisch bij lage temperaturen, wat essentieel is voor veilige rijprestaties.</p>
      `;
    } else if (advice.winter < today) {
      adviceText += `
        <h3>Advies voor het wisselen van banden:</h3>
        <p>Het is aanbevolen om al winterbanden te gebruiken. Het is raadzaam om dit zo snel mogelijk te doen.</p>
      `;
    }
  }

  // Advies voor zomerbanden
  if (advice.summer) {
    if (isSameDay(advice.summer, today)) {
      adviceText += `
        <h3>Advies voor het wisselen van banden:</h3>
        <p>Het is aanbevolen om vandaag zomerbanden te gebruiken.</p>
        <p>Dit is gebaseerd op verwachte temperaturen boven de ${requiredMaxTempThreshold}°C.</p>
        <p>Zomerbanden zijn geoptimaliseerd voor warme temperaturen en bieden betere prestaties en efficiëntie tijdens warme seizoenen. Ze hebben een harder rubbermengsel dat beter presteert bij hogere temperaturen.</p>
      `;
    } else if (advice.summer > today) {
      adviceText += `
        <h3>Advies voor het wisselen van banden:</h3>
        <p>Op basis van de weersvoorspelling is het aanbevolen om zomerbanden te gebruiken op <strong>${formatDate(advice.summer)}</strong>.</p>
        <p>Dit is gebaseerd op verwachte temperaturen boven de ${requiredMaxTempThreshold}°C.</p>
        <p>Zomerbanden zijn geoptimaliseerd voor warme temperaturen en bieden betere prestaties en efficiëntie tijdens warme seizoenen. Ze hebben een harder rubbermengsel dat beter presteert bij hogere temperaturen.</p>
      `;
    } else if (advice.summer < today) {
      adviceText += `
        <h3>Advies voor het wisselen van banden:</h3>
        <p>Het is aanbevolen om al zomerbanden te gebruiken. Het is raadzaam om dit zo snel mogelijk te doen.</p>
      `;
    }
  }

  // Toon Advies
  if (adviceText === '') {
    adviceText = `
      <h3>Advies voor het wisselen van banden:</h3>
      <p>Op basis van de huidige weersvoorspellingen en gemiddelde temperaturen is er geen duidelijke aanbeveling om banden te wisselen. Blijf de weersvoorspellingen volgen en pas je banden aan wanneer langdurige koude of warme periodes worden voorspeld.</p>
    `;
  }

  adviceTextElement.innerHTML = adviceText;
  adviceTextElement.classList.add("show");
}

// Hulpfunctie om de datum te formatteren in het Nederlands
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
