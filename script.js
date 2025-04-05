// OpenWeatherMap API Key
const apiKey = "YOUR_API_KEY"; // Replace with your API key

// DOM elements (add elements for forecast)
const searchBtn = document.getElementById("searchBtn");
const cityInput = document.getElementById("cityInput");
const weatherResult = document.getElementById("weatherResult");
const cityName = document.getElementById("cityName");
const temperature = document.getElementById("temperature");
const feelsLike = document.getElementById("feelsLike");
const description = document.getElementById("description");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const weatherIcon = document.getElementById("weatherIcon");
const errorDiv = document.getElementById("error");
const hourlyForecastDiv = document.createElement("div"); // Create a div for hourly forecast
hourlyForecastDiv.id = "hourlyForecast";
const dailyForecastDiv = document.createElement("div");   // Create a div for daily forecast
dailyForecastDiv.id = "dailyForecast";
weatherResult.appendChild(hourlyForecastDiv); // Append to weather result
weatherResult.appendChild(dailyForecastDiv);

let currentCity = ""; // To keep track of the currently displayed city
let updateInterval = 300000; // 5 minutes in milliseconds

// Event listener for the search button
searchBtn.addEventListener("click", () => {
    const city = cityInput.value.trim();
    if (city === "") {
        showError("Please enter a city name!");
        return;
    }
    currentCity = city;
    fetchWeatherData(city);
});

// Function to fetch weather data (modified to fetch forecast as well)
function fetchWeatherData(city) {
    currentCity = city;
    const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;

    Promise.all([
        fetch(currentWeatherUrl).then(response => {
            if (!response.ok) {
                throw new Error(`City not found (${response.status})`);
            }
            return response.json();
        }),
        fetch(forecastUrl).then(response => {
            if (!response.ok) {
                console.warn("Could not fetch forecast data for this city.");
                return null; // Don't block if forecast fetch fails
            }
            return response.json();
        })
    ])
    .then(([currentWeatherData, forecastData]) => {
        if (currentWeatherData) {
            displayCurrentWeather(currentWeatherData);
        }
        if (forecastData) {
            displayHourlyForecast(forecastData.list.slice(0, 8)); // Display next 8 hourly forecasts
            displayDailyForecast(forecastData.list);
        }
        // Set up periodic updates
        clearInterval(window.weatherUpdateInterval); // Clear any existing interval
        window.weatherUpdateInterval = setInterval(fetchWeatherData, updateInterval, currentCity);
    })
    .catch((error) => {
        showError(error.message);
        clearInterval(window.weatherUpdateInterval); // Stop updates on error
    });
}

// Function to display current weather data
function displayCurrentWeather(data) {
    errorDiv.classList.add("hidden");
    cityName.textContent = `Weather in ${data.name}`;
    temperature.textContent = `Temperature: ${data.main.temp.toFixed(1)}°C`;
    feelsLike.textContent = `Feels Like: ${data.main.feels_like.toFixed(1)}°C`;
    description.textContent = `Condition: ${data.weather[0].description}`;
    humidity.textContent = `Humidity: ${data.main.humidity}%`;
    wind.textContent = `Wind Speed: ${data.wind.speed} m/s`;

    const weatherCode = data.weather[0].id;
    weatherIcon.className = "weather-icon wi"; // Reset classes
    if (weatherCode >= 200 && weatherCode < 300) {
        weatherIcon.classList.add("wi-thunderstorm");
    } else if (weatherCode >= 300 && weatherCode < 500) {
        weatherIcon.classList.add("wi-showers");
    } else if (weatherCode >= 500 && weatherCode < 600) {
        weatherIcon.classList.add("wi-rain");
    } else if (weatherCode >= 600 && weatherCode < 700) {
        weatherIcon.classList.add("wi-snow");
    } else if (weatherCode >= 700 && weatherCode < 800) {
        weatherIcon.classList.add("wi-fog");
    } else if (weatherCode === 800) {
        weatherIcon.classList.add("wi-day-sunny");
    } else if (weatherCode === 801) {
        weatherIcon.classList.add("wi-day-cloudy");
    } else if (weatherCode > 801 && weatherCode < 900) {
        weatherIcon.classList.add("wi-cloudy");
    } else if (weatherCode >= 900 && weatherCode < 1000) {
        // Add more specific extreme weather icons if needed
        weatherIcon.classList.add("wi-alert");
    }

    weatherResult.classList.remove("hidden");
}

// Function to display hourly forecast
function displayHourlyForecast(hourlyData) {
    hourlyForecastDiv.innerHTML = "<h3>Hourly Forecast</h3>";
    const forecastContainer = document.createElement("div");
    forecastContainer.style.display = "flex";
    forecastContainer.style.overflowX = "auto"; // Enable horizontal scrolling

    hourlyData.forEach(item => {
        const forecastItem = document.createElement("div");
        forecastItem.style.padding = "10px";
        forecastItem.style.border = "1px solid #eee";
        forecastItem.style.borderRadius = "8px";
        forecastItem.style.marginRight = "10px";
        forecastItem.style.textAlign = "center";

        const dateTime = new Date(item.dt * 1000);
        const hour = dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const temp = item.main.temp.toFixed(1);
        const iconClass = getWeatherIconClass(item.weather[0].id, dateTime.getHours());

        forecastItem.innerHTML = `
            <p>${hour}</p>
            <i class="wi ${iconClass}" style="font-size: 24px;"></i>
            <p>${temp}°C</p>
        `;
        forecastContainer.appendChild(forecastItem);
    });
    hourlyForecastDiv.appendChild(forecastContainer);
}

// Function to display daily forecast
function displayDailyForecast(dailyData) {
    dailyForecastDiv.innerHTML = "<h3>5-Day Forecast</h3>";
    const forecastContainer = document.createElement("div");
    forecastContainer.style.display = "flex";
    forecastContainer.style.overflowX = "auto";

    const dailyMap = new Map();
    dailyData.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toLocaleDateString();
        if (!dailyMap.has(day)) {
            dailyMap.set(day, {
                minTemp: Infinity,
                maxTemp: -Infinity,
                weatherCodes: []
            });
        }
        const dailyEntry = dailyMap.get(day);
        dailyEntry.minTemp = Math.min(dailyEntry.minTemp, item.main.temp_min);
        dailyEntry.maxTemp = Math.max(dailyEntry.maxTemp, item.main.temp_max);
        dailyEntry.weatherCodes.push(item.weather[0].id);
    });

    const iterator = dailyMap.values();
    for (let i = 0; i < 5; i++) { // Show only the next 5 days
        const dailyEntry = iterator.next().value;
        if (!dailyEntry) break;

        const forecastItem = document.createElement("div");
        forecastItem.style.padding = "10px";
        forecastItem.style.border = "1px solid #eee";
        forecastItem.style.borderRadius = "8px";
        forecastItem.style.marginRight = "10px";
        forecastItem.style.textAlign = "center";

        const date = new Date([...dailyMap.keys()][i]);
        const dayName = date.toLocaleDateString([], { weekday: 'short' });
        // Get the most frequent weather icon for the day (simplified)
        const mostFrequentCode = dailyEntry.weatherCodes[Math.floor(dailyEntry.weatherCodes.length / 2)];
        const iconClass = getWeatherIconClass(mostFrequentCode, 12); // Use midday for icon

        forecastItem.innerHTML = `
            <p>${dayName}</p>
            <i class="wi ${iconClass}" style="font-size: 24px;"></i>
            <p>${dailyEntry.minTemp.toFixed(1)}°C / ${dailyEntry.maxTemp.toFixed(1)}°C</p>
        `;
        forecastContainer.appendChild(forecastItem);
    }
    dailyForecastDiv.appendChild(forecastContainer);
}

// Function to determine weather icon class based on code and time of day
function getWeatherIconClass(weatherCode, hour) {
    if (weatherCode >= 200 && weatherCode < 300) {
        return "wi-thunderstorm";
    } else if (weatherCode >= 300 && weatherCode < 500) {
        return "wi-showers";
    } else if (weatherCode >= 500 && weatherCode < 600) {
        return "wi-rain";
    } else if (weatherCode >= 600 && weatherCode < 700) {
        return "wi-snow";
    } else if (weatherCode >= 700 && weatherCode < 800) {
        return "wi-fog";
    } else if (weatherCode === 800) {
        return hour >= 6 && hour < 20 ? "wi-day-sunny" : "wi-night-clear";
    } else if (weatherCode === 801) {
        return hour >= 6 && hour < 20 ? "wi-day-cloudy" : "wi-night-alt-cloudy";
    } else if (weatherCode > 801 && weatherCode < 900) {
        return "wi-cloudy";
    } else if (weatherCode >= 900 && weatherCode < 1000) {
        return "wi-alert";
    }
    return "wi-thermometer"; // Default icon
}

// Function to show an error message
function showError(message) {
    weatherResult.classList.add("hidden");
    errorDiv.textContent = message;
    errorDiv.classList.remove("hidden");
    clearInterval(window.weatherUpdateInterval); // Stop updates on error
}

// --- Geolocation (Run on page load) ---
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, handleLocationError);
    } else {
        console.log("Geolocation is not supported by this browser.");
    }
}

function showPosition(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    fetchWeatherDataByCoords(lat, lon);
}

function handleLocationError(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            console.log("User denied the request for Geolocation.");
            break;
        case error.POSITION_UNAVAILABLE:
            console.log("Location information is unavailable.");
            break;
        case error.TIMEOUT:
            console.log("The request to get user location timed out.");
            break;
        case error.UNKNOWN_ERROR:
            console.log("An unknown error occurred.");
            break;
    }
    // Optionally, display a message to the user or default to a specific city
}

function fetchWeatherDataByCoords(lat, lon) {
    const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

    Promise.all([
        fetch(currentWeatherUrl).then(response => {
            if (!response.ok) {
                throw new Error(`Could not fetch weather data (${response.status})`);
            }
            return response.json();
        }),
        fetch(forecastUrl).then(response => {
            if (!response.ok) {
                console.warn("Could not fetch forecast data for this location.");
                return null;
            }
            return response.json();
        })
    ])
    .then(([currentWeatherData, forecastData]) => {
        if (currentWeatherData) {
            currentCity = currentWeatherData.name;
            displayCurrentWeather(currentWeatherData);
        }
        if (forecastData) {
            displayHourlyForecast(forecastData.list.slice(0, 8));
            displayDailyForecast(forecastData.list);
        }
        clearInterval(window.weatherUpdateInterval);
        window.weatherUpdateInterval = setInterval(fetchWeatherData, updateInterval, currentCity);
    })
    .catch(error => {
        showError(error.message);
    });
}

// Get location on page load
getLocation();
