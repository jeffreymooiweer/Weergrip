// script.js

const meteostatApiKey = 'METEOSTAT_KEY_PLACEHOLDER'; // Wordt vervangen door GitHub Actions
const visualCrossingApiKey = 'VISUAL_CROSSING_KEY_PLACEHOLDER'; // Wordt vervangen door GitHub Actions

// Rest van je script blijft ongewijzigd

// Voorbeeld: Gebruik de API-sleutels in je functies

async function fetchClimateNormalsForStation(stationId) {
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
      throw new Error('Fout bij het ophalen van klimaatnormen.');
    }

    const data = await response.json();
    console.log(data); // Voor debugging

    return data.data; // Array van klimaatnormen per maand
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
}

// Andere functies die gebruikmaken van visualCrossingApiKey
