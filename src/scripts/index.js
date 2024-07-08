import p5 from "p5";

new p5((sk) => {
  let cities = [];

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

  // THERMAL CAMERA
  // const colors = [
  //   { temp: -30, color: sk.color(0, 0, 0) }, // Black
  //   { temp: -20, color: sk.color(0, 0, 128) }, // Dark Blue
  //   { temp: -10, color: sk.color(0, 128, 255) }, // Light Blue
  //   { temp: 0, color: sk.color(128, 0, 255) }, // Light Purple
  //   { temp: 10, color: sk.color(139, 0, 139) }, // Dark Purple
  //   { temp: 20, color: sk.color(255, 0, 0) }, // Red
  //   { temp: 30, color: sk.color(255, 69, 0) }, // Light Red
  //   { temp: 40, color: sk.color(255, 165, 0) }, // Orange
  //   { temp: 50, color: sk.color(255, 255, 0) }, // Yellow
  // ];

  // COLOR WHEEL
  // const colors = [
  //   { temp: -30, color: sk.color(0, 255, 255) }, // Cyan
  //   { temp: -20, color: sk.color(0, 128, 255) }, // Medium Blue
  //   { temp: -10, color: sk.color(0, 0, 255) }, // Blue
  //   { temp: 0, color: sk.color(128, 0, 255) }, // Purple-Blue
  //   { temp: 10, color: sk.color(255, 0, 255) }, // Purple
  //   { temp: 20, color: sk.color(255, 0, 128) }, // Reddish Purple
  //   { temp: 30, color: sk.color(255, 0, 0) }, // Red
  //   { temp: 40, color: sk.color(255, 69, 0) }, // Light Red
  //   { temp: 50, color: sk.color(255, 0, 0) }, // Red (0 degrees)
  // ];

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
    sk.background("white");

    document.getElementById("add-city-btn").addEventListener("click", addCity);

    document
      .getElementById("city")
      .addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
          addCity();
        }
      });
  };

  sk.draw = () => {
    const currentTime = sk.millis();

    cities.forEach((city) => {
      if (currentTime - city.addedTime < 10000) {
        sk.push();
        sk.fill(0);
        sk.noStroke();
        sk.ellipse(city.x, city.y, 10, 10);
        sk.pop();
      }

      sk.stroke(city.color[0], city.color[1], city.color[2], 50);
      sk.strokeWeight(4);

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
      sk.line(lastPoint.x, lastPoint.y, nextPoint.x, nextPoint.y);

      if (city.lines.length > 120) {
        city.lines.shift();
        city.lines = [{ x: city.x, y: city.y }];
      }
    });
  };

  async function addCity() {
    const cityName = document.getElementById("city").value;
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
