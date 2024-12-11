async function getAdvice() {
  const adviceElement = document.getElementById("advice");
  const adviceTextElement = document.getElementById("advice-text");

  // Reset adviescontainer
  adviceElement.innerHTML = "<p>Even geduld, de voorspelling wordt geladen...</p>";
  adviceTextElement.innerHTML = "";
  adviceElement.classList.remove("show");
  adviceTextElement.classList.remove("show");

  const location = await getDeviceLocation();
  if (!location) {
    adviceElement.innerHTML = "<p>Kon de locatie niet ophalen. Zorg ervoor dat locatiebepaling is ingeschakeld en probeer opnieuw.</p>";
    return;
  }

  const apiKey = "API_KEY_PLACEHOLDER"; // Deze placeholder wordt vervangen via GitHub Actions
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&units=metric&appid=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Locatie niet gevonden. Controleer of je locatie correct is ingesteld.");
    }
    const data = await response.json();
    console.log("Weersvoorspelling data ontvangen:", data); // Debugging
    analyzeForecast(data, adviceTextElement);
  } catch (error) {
    adviceElement.innerHTML = `<p>Error: ${error.message}</p>`;
    console.error("Weersvoorspelling fout:", error); // Debugging
  }
}

async function getDeviceLocation() {
  if (!navigator.geolocation) {
    console.warn("Geolocatie niet beschikbaar. Gebruik fallbacklocatie.");
    return "Amsterdam"; // Fallbacklocatie
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const geoApiUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=API_KEY_PLACEHOLDER`;

        console.log("Geolocatie coördinaten ontvangen:", { latitude, longitude }); // Debugging
        console.log("Geocoding URL:", geoApiUrl); // Debugging

        try {
          const response = await fetch(geoApiUrl);
          if (!response.ok) {
            throw new Error("Geocoding API gaf een fout.");
          }
          const [geoData] = await response.json();
          console.log("Gegevens ontvangen van Geocoding API:", geoData); // Debugging
          resolve(geoData.name);
        } catch (error) {
          console.error("Geocoding API fout:", error); // Debugging
          resolve("Amsterdam"); // Fallbacklocatie
        }
      },
      (error) => {
        console.error("Geolocatiefout:", error); // Debugging
        resolve("Amsterdam"); // Fallbacklocatie
      }
    );
  });
}

function analyzeForecast(data, adviceTextElement) {
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
    adviceElement.innerHTML = "";
    adviceTextElement.innerHTML = `
      <h3>Optimale dag om je banden te wisselen:</h3>
      <p><strong>${bestDay.date}</strong></p>
      <p>${bestDay.reason}</p>
      <p><strong>Advies:</strong> Verwissel je banden naar <strong>${bestDay.type}</strong>.</p>
    `;
    adviceTextElement.classList.add("show");
  } else {
    adviceElement.innerHTML = `
      <p>Geen geschikte dag gevonden in de komende week. Controleer later opnieuw.</p>
    `;
  }

  // Toon de adviescontainer met animatie
  adviceElement.classList.add("show");
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
