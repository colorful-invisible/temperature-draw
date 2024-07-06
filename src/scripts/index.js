import p5 from "p5";

new p5((sk) => {
  let cities = [];

  // Mercator projection bounds
  const minLat = -85.05112878;
  const maxLat = 85.05112878;
  const minLon = -180;
  const maxLon = 180;

  // Projection
  function latLonToXY(lat, lon) {
    const x = ((lon - minLon) / (maxLon - minLon)) * window.innerWidth;
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * window.innerHeight;
    return { x, y };
  }

  let noiseTime = 0.1;
  let noiseResolution = 2;
  let noiseScale = 8;

  const colors = [
    { temp: -30, color: sk.color(0, 100, 0) }, // Dark Green
    { temp: -20, color: sk.color(0, 175, 0) }, // Green
    { temp: -10, color: sk.color(0, 255, 0) }, // Green
    { temp: 0, color: sk.color(255, 255, 0) }, // Yellow
    { temp: 10, color: sk.color(255, 165, 0) }, // Orange
    { temp: 20, color: sk.color(255, 69, 0) }, // Red
    { temp: 30, color: sk.color(255, 0, 255) }, // Magenta
    { temp: 40, color: sk.color(128, 0, 128) }, // Purple
    { temp: 50, color: sk.color(75, 0, 130) }, // Dark Purple
  ];

  // Function to map temperature to color
  function tempToColor(temp) {
    for (let i = 0; i < colors.length - 1; i++) {
      const c1 = colors[i];
      const c2 = colors[i + 1];
      if (temp >= c1.temp && temp <= c2.temp) {
        const t = sk.map(temp, c1.temp, c2.temp, 0, 1);
        return sk.lerpColor(c1.color, c2.color, t).levels;
      }
    }
    return sk.color(255, 255, 255).levels; // Default to white if out of range
  }

  sk.setup = () => {
    sk.createCanvas(sk.windowWidth, sk.windowHeight);
    sk.background("white");

    // Add input field and button dynamically
    const input = sk.createInput();
    input.position(10, 10);
    input.id("city");

    const button = sk.createButton("Add City");
    button.position(150, 10);
    button.mousePressed(addCity);
  };

  sk.draw = () => {
    cities.forEach((city) => {
      // Set the stroke color for the city's lines based on temperature
      sk.stroke(city.color[0], city.color[1], city.color[2], 50); // Semi-transparent
      sk.strokeWeight(4);

      // If the city has no lines, create the first segment
      if (city.lines.length === 0) {
        city.lines.push({ x: city.x, y: city.y });
      }

      // Get the last point in the lines array
      const lastPoint = city.lines[city.lines.length - 1];

      // Randomly update the position of the next point
      const nextPoint = {
        x: lastPoint.x + sk.random(-8, 8),
        y: lastPoint.y + sk.random(-8, 8),
        // x:
        //   lastPoint.x +
        //   (sk.noise(sk.random([-1, 1]), noiseTime) * 2 - 1) * noiseScale,
        // y:
        //   lastPoint.y +
        //   (sk.noise(sk.random([-1, 1]), noiseTime + 10000) * 2 - 1) *
        //     noiseScale,
      };

      noiseTime += 0.1;

      // Add the new point to the lines array
      city.lines.push(nextPoint);

      // Draw the line from the last point to the new point
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
        x: pos.x,
        y: pos.y,
        color: tempToColor(weatherData.current_weather.temperature),
      };
      cities.push(city);
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
      console.log("Geocoding response:", data); // Debugging line
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return { latitude: result.latitude, longitude: result.longitude };
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error fetching coordinates:", error);
      return null;
    }
  }

  async function fetchWeather(latitude, longitude) {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
    );
    const data = await response.json();
    return data;
  }
});
