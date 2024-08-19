import p5 from "p5";

new p5((sk) => {
  let cities = [];

  let drawCanvas;
  let infoCanvas;
  let isInfoVisible = false;

  // Mercator projection bounds
  const minLat = -90;
  const maxLat = 90;
  const minLon = -180;
  const maxLon = 180;

  // Projection
  function latLonToXY(lat, lon) {
    const x = ((lon - minLon) / (maxLon - minLon)) * window.innerWidth;
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * window.innerHeight;
    return { x, y };
  }

  const colors = [
    { temp: -30, color: sk.color(0, 100, 0) }, // Dark Green
    { temp: -20, color: sk.color(0, 175, 0) }, // Medium Green
    { temp: -10, color: sk.color(0, 255, 0) }, // Green
    { temp: 0, color: sk.color(255, 255, 0) }, // Yellow
    { temp: 10, color: sk.color(255, 165, 0) }, // Orange
    { temp: 20, color: sk.color(255, 69, 0) }, // Red
    { temp: 30, color: sk.color(255, 0, 255) }, // Magenta
    { temp: 40, color: sk.color(128, 0, 128) }, // Purple
    { temp: 50, color: sk.color(75, 0, 130) }, // Dark Purple
  ];

  function tempToColor(temp) {
    for (let i = 0; i < colors.length - 1; i++) {
      const c1 = colors[i];
      const c2 = colors[i + 1];
      if (temp >= c1.temp && temp <= c2.temp) {
        const t = sk.map(temp, c1.temp, c2.temp, 0, 1);
        return sk.lerpColor(c1.color, c2.color, t).levels;
      }
    }
    return sk.color(255, 255, 255).levels; // When out of range
  }

  sk.setup = () => {
    sk.createCanvas(sk.windowWidth, sk.windowHeight);

    drawCanvas = sk.createGraphics(sk.windowWidth, sk.windowHeight);
    infoCanvas = sk.createGraphics(sk.windowWidth, sk.windowHeight);

    document.getElementById("add-city-btn").addEventListener("click", addCity);

    document
      .getElementById("city-input")
      .addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
          addCity();
          event.preventDefault();
        }
      });

    document.addEventListener("keypress", function (event) {
      if (event.key === "i" || event.key === "I") {
        isInfoVisible = !isInfoVisible;
      }
    });
  };

  sk.draw = () => {
    sk.clear();
    infoCanvas.clear();

    const currentTime = sk.millis();

    cities.forEach((city) => {
      if (currentTime - city.addedTime < 10000) {
        drawCanvas.push();
        drawCanvas.fill(city.color[0], city.color[1], city.color[2]);
        drawCanvas.noStroke();
        drawCanvas.ellipse(city.x, city.y, 10, 10);
        drawCanvas.pop();
      }

      drawCanvas.stroke(city.color[0], city.color[1], city.color[2], 50);
      drawCanvas.strokeWeight(4);

      if (city.lines.length === 0) {
        city.lines.push({ x: city.x, y: city.y });
      }

      let currentWind = sk.map(city.wind, 0, 100, 6, 24);

      const lastPoint = city.lines[city.lines.length - 1];
      const nextPoint = {
        x: lastPoint.x + sk.random(-currentWind, currentWind),
        y: lastPoint.y + sk.random(-currentWind, currentWind),
      };

      city.lines.push(nextPoint);
      drawCanvas.line(lastPoint.x, lastPoint.y, nextPoint.x, nextPoint.y);

      if (city.lines.length > 120) {
        city.lines.shift();
        city.lines = [{ x: city.x, y: city.y }];
      }

      if (isInfoVisible) {
        infoCanvas.push();
        infoCanvas.fill(0);
        infoCanvas.noStroke();
        infoCanvas.ellipse(city.x, city.y, 10, 10);
        infoCanvas.textAlign(sk.CENTER, sk.CENTER);
        infoCanvas.textSize(12);
        infoCanvas.text(city.name.toUpperCase(), city.x, city.y + 15);
        infoCanvas.text(`${city.temp}°C`, city.x, city.y + 30);
        infoCanvas.text(` ${city.wind} km/h`, city.x, city.y + 45);
        infoCanvas.pop();
      }
    });

    sk.image(drawCanvas, 0, 0);
    if (isInfoVisible) {
      sk.image(infoCanvas, 0, 0);
    }
  };

  async function addCity() {
    const cityInput = document.getElementById("city-input");
    const cityName = cityInput.value.trim();
    if (cityName === "") return;

    const coords = await getCoordinates(cityName);
    if (coords) {
      const weatherData = await fetchWeather(coords.latitude, coords.longitude);
      const pos = latLonToXY(coords.latitude, coords.longitude);
      const city = {
        name: cityName,
        lat: coords.latitude,
        lon: coords.longitude,
        lines: [],
        temp: weatherData.current_weather.temperature,
        wind: weatherData.current_weather.windspeed,
        x: pos.x,
        y: pos.y,
        color: tempToColor(weatherData.current_weather.temperature),
        addedTime: sk.millis(),
      };
      cities.push(city);
      console.log(cities);

      cityInput.value = "";
    } else {
      alert("City not found.");
    }
  }

  async function getCoordinates(city) {
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`
      );
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return { latitude: result.latitude, longitude: result.longitude };
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error fetching coordinates data:", error);
      return null;
    }
  }

  async function fetchWeather(latitude, longitude) {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching weather data:", error);
      return null;
    }
  }
});
