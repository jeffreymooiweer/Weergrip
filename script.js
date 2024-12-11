async function getAdvice() {
  const adviceElement = document.getElementById("advice");
  adviceElement.innerHTML = "<p>Even geduld, de voorspelling wordt geladen...</p>";

  // Maak de adviescontainer zichtbaar
  adviceElement.classList.add("show");

  const location = await getDeviceLocation();
  if (!location) {
    adviceElement.innerHTML = "<p>Kon de locatie niet ophalen. Probeer het opnieuw.</p>";
    return;
  }

  const apiKey = "API_KEY_PLACEHOLDER"; // Vervang met je API-sleutel
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&units=metric&appid=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Locatie niet gevonden.");
    }
    const data = await response.json();
    analyzeForecast(data);
  } catch (error) {
    adviceElement.innerText = `Error: ${error.message}`;
  }
}

async function getDeviceLocation() {
  if (!navigator.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const geoApiUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=API_KEY_PLACEHOLDER`;

        try {
          const response = await fetch(geoApiUrl);
          if (!response.ok) {
            throw new Error("Locatie ophalen mislukt.");
          }
          const [geoData] = await response.json();
          resolve(geoData.name);
        } catch {
          resolve(null);
        }
      },
      () => resolve(null)
    );
  });
}

function analyzeForecast(data) {
  const forecastList = data.list;
  let bestDay = null;

  forecastList.forEach((item) => {
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
  });

  const adviceElement = document.getElementById("advice");
  if (bestDay) {
    adviceElement.innerHTML = `
      <h3>Optimale dag om je banden te wisselen:</h3>
      <p><strong>${bestDay.date}</strong></p>
      <p>${bestDay.reason}</p>
      <p><strong>Advies:</strong> Verwissel je banden naar <strong>${bestDay.type}</strong>.</p>
    `;
  } else {
    adviceElement.innerHTML = `
      <p>Geen geschikte dag gevonden in de komende week. Controleer later opnieuw.</p>
    `;
  }
}

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
