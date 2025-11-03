// script.js

const fallbackClimateData = {
  averageMinTemps: {
    1: 0.9,
    2: 1.0,
    3: 2.8,
    4: 5.3,
    5: 8.9,
    6: 12.0,
    7: 14.3,
    8: 14.1,
    9: 11.5,
    10: 8.1,
    11: 4.2,
    12: 1.6
  },
  averageMaxTemps: {
    1: 5.5,
    2: 6.3,
    3: 9.4,
    4: 13.3,
    5: 17.2,
    6: 20.0,
    7: 22.3,
    8: 22.4,
    9: 19.2,
    10: 14.4,
    11: 9.3,
    12: 6.0
  },
  source: 'fallback'
};

function generateFallbackForecastData() {
  const today = new Date();
  const currentMonth = today.getMonth();
  const isWinterSeason = currentMonth <= 2 || currentMonth >= 9; // Jan-Mar & Oct-Dec

  const days = Array.from({ length: 16 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const datetime = date.toISOString().split('T')[0];

    let tempmin;
    let tempmax;

    if (isWinterSeason) {
      tempmin = 2 + Math.sin(index / 3) * 1.2; // onder 7 graden Celsius
      tempmax = 5 + Math.sin(index / 2.5) * 1.5;
    } else {
      tempmin = 10 + Math.sin(index / 3) * 1.8;
      tempmax = 18 + Math.sin(index / 2.5) * 2.2; // boven 7 graden Celsius
    }

    return {
      datetime,
      tempmin: Number(tempmin.toFixed(1)),
      tempmax: Number(tempmax.toFixed(1))
    };
  });

  return { days, source: 'fallback' };
}

// Functie om klimaatgegevens te verkrijgen (statisch)
async function getClimateData() {
  return {
    averageMinTemps: { ...fallbackClimateData.averageMinTemps },
    averageMaxTemps: { ...fallbackClimateData.averageMaxTemps },
    source: 'static'
  };
}

// Functie om de 16-daagse weersvoorspelling op te halen via Open-Meteo
async function fetchForecastData({ latitude, longitude }) {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    daily: 'temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: '16'
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Kon de Open-Meteo voorspelling niet ophalen.');
    }

    const data = await response.json();
    const { daily } = data || {};

    if (!daily || !Array.isArray(daily.time)) {
      throw new Error('Open-Meteo response mist daggegevens.');
    }

    const days = daily.time.map((dateStr, index) => {
      const minTemp = daily.temperature_2m_min?.[index];
      const maxTemp = daily.temperature_2m_max?.[index];

      return {
        datetime: dateStr,
        tempmin: typeof minTemp === 'number' ? Math.round(minTemp * 10) / 10 : null,
        tempmax: typeof maxTemp === 'number' ? Math.round(maxTemp * 10) / 10 : null
      };
    }).filter(day => day.tempmin !== null && day.tempmax !== null);

    console.log('Forecast Data (Open-Meteo):', { latitude, longitude, days });

    if (!days.length) {
      throw new Error('Open-Meteo leverde geen bruikbare daggegevens.');
    }

    return { days, source: 'open-meteo' };
  } catch (error) {
    console.error('Open-Meteo API Error:', error);
    console.warn('Gebruik fallback voorspelling.');
    return generateFallbackForecastData();
  }
}

// Functie om de locatie van de gebruiker te verkrijgen, met fallback naar Nederland
async function getDeviceLocation() {
  const defaultLocation = {
    latitude: 52.1326,
    longitude: 5.2913,
    label: 'Nederland'
  };

  if (!navigator.geolocation) {
    console.warn('Geolocatie niet beschikbaar. Gebruik landelijk gemiddelde.');
    return defaultLocation;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve({ latitude, longitude, label: 'Je locatie' });
      },
      () => resolve(defaultLocation),
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 15 * 60 * 1000
      }
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

  // Haal klimaatgegevens op (statisch gemiddelde Nederland)
  const climateData = await getClimateData();
  const { averageMinTemps, averageMaxTemps, source: climateSource } = climateData;

  // Haal dagelijkse voorspelling op via Open-Meteo
  const location = await getDeviceLocation();
  const forecastData = await fetchForecastData(location);
  const forecastSource = forecastData.source || 'open-meteo';

  analyzeForecast(
    forecastData,
    averageMinTemps,
    averageMaxTemps,
    adviceTextElement,
    { climateSource, forecastSource, locationLabel: location.label }
  );
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
function analyzeForecast(data, averageMinTemps, averageMaxTemps, adviceTextElement, sources = {}) {
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
        <p>Dit is gebaseerd op verwachte temperaturen onder de ${requiredMinTempThreshold}&deg;C.</p>
        <p>Winterbanden bieden maximale grip en veiligheid bij koude temperaturen en op natte of besneeuwde wegen. Het rubber van winterbanden blijft elastisch bij lage temperaturen, wat essentieel is voor veilige rijprestaties.</p>
      `;
    } else if (advice.winter > today) {
      adviceText += `
        <h3>Advies voor het wisselen van banden:</h3>
        <p>Op basis van de weersvoorspelling is het aanbevolen om winterbanden te gebruiken op <strong>${formatDate(advice.winter)}</strong>.</p>
        <p>Dit is gebaseerd op verwachte temperaturen onder de ${requiredMinTempThreshold}&deg;C.</p>
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
        <p>Dit is gebaseerd op verwachte temperaturen boven de ${requiredMaxTempThreshold}&deg;C.</p>
        <p>Zomerbanden zijn geoptimaliseerd voor warme temperaturen en bieden betere prestaties en efficientie tijdens warme seizoenen. Ze hebben een harder rubbermengsel dat beter presteert bij hogere temperaturen.</p>
      `;
    } else if (advice.summer > today) {
      adviceText += `
        <h3>Advies voor het wisselen van banden:</h3>
        <p>Op basis van de weersvoorspelling is het aanbevolen om zomerbanden te gebruiken op <strong>${formatDate(advice.summer)}</strong>.</p>
        <p>Dit is gebaseerd op verwachte temperaturen boven de ${requiredMaxTempThreshold}&deg;C.</p>
        <p>Zomerbanden zijn geoptimaliseerd voor warme temperaturen en bieden betere prestaties en efficientie tijdens warme seizoenen. Ze hebben een harder rubbermengsel dat beter presteert bij hogere temperaturen.</p>
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

  if (sources.climateSource === 'static') {
    adviceText += `
      <p class="data-note">Klimaatgegevens zijn gebaseerd op langjarig Nederlands gemiddelde (statisch).</p>
    `;
  }

  if (sources.climateSource === 'fallback' || sources.forecastSource === 'fallback') {
    adviceText += `
      <p class="data-note">Let op: dit advies is gebaseerd op voorbeeldgegevens omdat de live weerservices niet beschikbaar zijn.</p>
    `;
  }

  if (sources.locationLabel) {
    adviceText += `
      <p class="data-note">Locatie gebruikt: ${sources.locationLabel}.</p>
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
