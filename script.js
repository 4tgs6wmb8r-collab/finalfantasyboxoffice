function hasNumber(value) {
  return typeof value === "number" && !Number.isNaN(value);
}

function todayAtStartOfDay() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function dateFromFullDate(fullDate) {
  if (!fullDate) {
    return null;
  }

  return new Date(`${fullDate}T00:00:00`);
}

function isMovieReleased(movie) {
  if (!movie.releaseDateFull) {
    return false;
  }

  const releaseDate = dateFromFullDate(movie.releaseDateFull);
  return releaseDate <= todayAtStartOfDay();
}

function calculateMovieScore(movie) {
  if (!isMovieReleased(movie)) {
    return 0;
  }

  if (!hasNumber(movie.budget) || !hasNumber(movie.currentGross)) {
    return null;
  }

  const breakeven = calculateBreakeven(movie);
  return movie.currentGross - breakeven;
}

function calculateBreakeven(movie) {
  if (!hasNumber(movie.budget)) {
    return null;
  }

  return movie.budget * 2.5;
}

function calculateStudioTotal(studio) {
  return studio.movies.reduce((total, movie) => {
    const score = calculateMovieScore(movie);
    return total + (score || 0);
  }, 0);
}

function formatMoney(value) {
  if (!hasNumber(value)) {
    return "TBD";
  }

  const rounded = Math.round(value * 10) / 10;
  return `$${rounded}M`;
}

function formatScore(value) {
  if (!hasNumber(value)) {
    return "Score: TBD";
  }

  const sign = value < 0 ? "-" : "";
  return `Score: ${sign}$${Math.abs(Math.round(value * 10) / 10)}M`;
}

function formatRoi(value) {
  if (!hasNumber(value)) {
    return "TBD";
  }

  return `${Math.round(value * 100)}%`;
}

function formatMovieScore(movie, score) {
  if (!isMovieReleased(movie)) {
    return "Score: Not released yet";
  }

  return formatScore(score);
}

function scoreClass(score) {
  if (!hasNumber(score)) {
    return "";
  }

  return score < 0 ? "negative" : "positive";
}

function breakevenClass(amountAway) {
  if (!hasNumber(amountAway)) {
    return "";
  }

  if (amountAway <= 10) {
    return "value-warning";
  }

  return "value-muted";
}

function hexToRgb(hex) {
  const cleanHex = hex.replace("#", "");

  return {
    r: parseInt(cleanHex.slice(0, 2), 16),
    g: parseInt(cleanHex.slice(2, 4), 16),
    b: parseInt(cleanHex.slice(4, 6), 16)
  };
}

function mixColors(startHex, endHex, amount) {
  const start = hexToRgb(startHex);
  const end = hexToRgb(endHex);

  const r = Math.round(start.r + (end.r - start.r) * amount);
  const g = Math.round(start.g + (end.g - start.g) * amount);
  const b = Math.round(start.b + (end.b - start.b) * amount);

  return `rgb(${r}, ${g}, ${b})`;
}

function rankColor(index, total, startHex, endHex) {
  if (total <= 1) {
    return startHex;
  }

  return mixColors(startHex, endHex, index / (total - 1));
}

function colorClass(baseClass, color) {
  return color ? `${color}-${baseClass}` : "";
}

function renderPoster(movie) {
  if (!movie.poster) {
    return `<div class="poster-placeholder">Poster</div>`;
  }

  return `<img class="movie-poster" src="${movie.poster}" alt="${movie.title} poster" />`;
}

function renderTeams() {
  const teamsContainer = document.querySelector("#teamsContainer");
  const sortedStudios = [...studios].sort((a, b) => {
    return calculateStudioTotal(b) - calculateStudioTotal(a);
  });

  teamsContainer.innerHTML = sortedStudios.map((studio) => {
    const total = calculateStudioTotal(studio);

    const movieCards = studio.movies.map((movie) => {
      const score = calculateMovieScore(movie);
      const breakeven = calculateBreakeven(movie);

      return `
        <div class="movie-card">
          ${renderPoster(movie)}
          <div class="movie-info">
            <p class="movie-title">${movie.title}</p>
            <p class="movie-date">${movie.releaseDate}</p>
            <p class="movie-budget">Budget: ${formatMoney(movie.budget)}</p>
            <p class="movie-breakeven">Breakeven: ${formatMoney(breakeven)}</p>
            <p class="movie-earnings">Gross: ${formatMoney(movie.currentGross)}</p>
            <p class="movie-score ${isMovieReleased(movie) ? scoreClass(score) : ""}">${formatMovieScore(movie, score)}</p>
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="team-card ${colorClass("card", studio.colorClass)}">
        <div class="team-header">
          <div class="studio-left">
            <div class="studio-avatar ${colorClass("avatar", studio.colorClass)}">${studio.avatar}</div>

            <div>
              <h2>${studio.name}</h2>
              <p class="owner-name ${colorClass("text", studio.colorClass)}">${studio.owner}</p>
            </div>
          </div>

          <div class="score-total ${colorClass("text", studio.colorClass)}">
            <span>Studio Earnings</span>
            <strong>${Math.round(total * 10) / 10}M</strong>
          </div>
        </div>

        <div class="movie-grid">
          ${movieCards}
        </div>
      </div>
    `;
  }).join("");
}

function renderTopPerformers() {
  const topPerformers = document.querySelector("#topPerformers");
  const allMovies = studios.flatMap((studio) => {
    const studioOwner = studio.owner;

    return studio.movies.map((movie) => ({
      ...movie,
      studioName: studio.name,
      studioOwner,
      score: calculateMovieScore(movie),
      breakeven: calculateBreakeven(movie)
    }));
  });

  const rankedMovies = allMovies
    .filter((movie) => {
      return isMovieReleased(movie) &&
        hasNumber(movie.currentGross) &&
        hasNumber(movie.breakeven) &&
        movie.currentGross >= movie.breakeven;
    })
    .sort((a, b) => b.currentGross - a.currentGross);

  if (rankedMovies.length === 0) {
    topPerformers.innerHTML = `
      <div class="side-row">
        <span>No movies have passed breakeven yet</span>
      </div>
    `;
    return;
  }

  topPerformers.innerHTML = rankedMovies.map((movie, index) => {
    const color = rankColor(index, rankedMovies.length, "#064e3b", "#a3b72f");

    return `
      <div class="side-row">
        <span>${movie.title}</span>
        <strong style="color: ${color}">${formatMoney(movie.currentGross)}</strong>
      </div>
    `;
  }).join("");
}

function renderBestRoi() {
  const bestRoi = document.querySelector("#bestRoi");
  const allMovies = studios.flatMap((studio) => {
    return studio.movies.map((movie) => {
      const breakeven = calculateBreakeven(movie);

      return {
        ...movie,
        studioName: studio.name,
        breakeven,
        roi: hasNumber(movie.currentGross) && hasNumber(breakeven) && breakeven > 0
          ? movie.currentGross / breakeven
          : null
      };
    });
  });

  const roiMovies = allMovies
    .filter((movie) => {
      return isMovieReleased(movie) &&
        hasNumber(movie.roi);
    })
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 5);

  if (roiMovies.length === 0) {
    bestRoi.innerHTML = `
      <div class="side-row">
        <span>No ROI data yet</span>
      </div>
    `;
    return;
  }

  bestRoi.innerHTML = roiMovies.map((movie, index) => {
    const color = rankColor(index, roiMovies.length, "#064e3b", "#a3b72f");

    return `
      <div class="side-row">
        <span>${movie.title}</span>
        <strong style="color: ${color}">${formatRoi(movie.roi)}</strong>
      </div>
    `;
  }).join("");
}

function renderClosestBreakeven() {
  const closestBreakeven = document.querySelector("#closestBreakeven");
  const allMovies = studios.flatMap((studio) => {
    return studio.movies.map((movie) => {
      const breakeven = calculateBreakeven(movie);

      return {
        ...movie,
        studioName: studio.name,
        breakeven,
        amountAway: hasNumber(movie.currentGross) && hasNumber(breakeven)
          ? breakeven - movie.currentGross
          : null
      };
    });
  });

  const closeMovies = allMovies
    .filter((movie) => {
      return isMovieReleased(movie) &&
        hasNumber(movie.amountAway) &&
        movie.amountAway > 0;
    })
    .sort((a, b) => a.amountAway - b.amountAway)
    .slice(0, 5);

  if (closeMovies.length === 0) {
    closestBreakeven.innerHTML = `
      <div class="side-row">
        <span>No released movies are below breakeven</span>
      </div>
    `;
    return;
  }

  closestBreakeven.innerHTML = closeMovies.map((movie) => {
    return `
      <div class="side-row">
        <span>${movie.title}</span>
        <strong class="${breakevenClass(movie.amountAway)}">${formatMoney(movie.amountAway)} away</strong>
      </div>
    `;
  }).join("");
}

function renderBiggestBombs() {
  const biggestBombs = document.querySelector("#biggestBombs");
  const allMovies = studios.flatMap((studio) => {
    return studio.movies.map((movie) => ({
      ...movie,
      studioName: studio.name,
      score: calculateMovieScore(movie)
    }));
  });

  const bombMovies = allMovies
    .filter((movie) => {
      return isMovieReleased(movie) &&
        hasNumber(movie.score) &&
        movie.score < -10;
    })
    .sort((a, b) => a.score - b.score);

  if (bombMovies.length === 0) {
    biggestBombs.innerHTML = `
      <div class="side-row">
        <span>No movies have lost more than $10M</span>
      </div>
    `;
    return;
  }

  biggestBombs.innerHTML = bombMovies.map((movie, index) => {
    const color = rankColor(index, bombMovies.length, "#b91c1c", "#d97706");

    return `
      <div class="side-row">
        <span>${movie.title}</span>
        <strong style="color: ${color}">${formatScore(movie.score).replace("Score: ", "")}</strong>
      </div>
    `;
  }).join("");
}

function renderWeeklyProjections() {
  const weeklyProjectionsSection = document.querySelector("#weeklyProjections");

  if (!Array.isArray(weeklyProjections) || weeklyProjections.length === 0) {
    weeklyProjectionsSection.innerHTML = `
      <div class="side-row">
        <span>No projections entered yet</span>
      </div>
    `;
    return;
  }

  const sortedProjections = [...weeklyProjections]
    .sort((a, b) => b.projectedGross - a.projectedGross);

  weeklyProjectionsSection.innerHTML = sortedProjections.map((movie, index) => {
    const color = rankColor(index, sortedProjections.length, "#064e3b", "#a3b72f");

    return `
      <div class="side-row">
        <span>${movie.title}</span>
        <strong style="color: ${color}">${formatMoney(movie.projectedGross)}</strong>
      </div>
    `;
  }).join("");
}

function renderUpcomingReleases() {
  const upcomingReleases = document.querySelector("#upcomingReleases");
  const today = todayAtStartOfDay();
  const fourWeeksFromToday = new Date(today);
  fourWeeksFromToday.setDate(today.getDate() + 28);

  const upcomingMovies = studios
    .flatMap((studio) => {
      return studio.movies.map((movie) => ({
        ...movie,
        studioName: studio.name,
        releaseDateObject: dateFromFullDate(movie.releaseDateFull)
      }));
    })
    .filter((movie) => {
      return movie.releaseDateObject &&
        movie.releaseDateObject >= today &&
        movie.releaseDateObject <= fourWeeksFromToday;
    })
    .sort((a, b) => a.releaseDateObject - b.releaseDateObject);

  if (upcomingMovies.length === 0) {
    upcomingReleases.innerHTML = `
      <div class="side-row">
        <span>No drafted releases in the next 4 weeks</span>
      </div>
    `;
    return;
  }

  upcomingReleases.innerHTML = upcomingMovies.map((movie) => {
    return `
      <div class="side-row">
        <span>${movie.title}</span>
        <strong>${movie.releaseDate}</strong>
      </div>
    `;
  }).join("");
}

function renderScoreChart() {
  const scoreChart = document.querySelector("#scoreChart");
  const totals = studios.map((studio) => ({
    name: studio.name,
    total: calculateStudioTotal(studio),
    colorClass: studio.colorClass
  })).sort((a, b) => b.total - a.total);

  const largestTotal = Math.max(...totals.map((studio) => Math.abs(studio.total)), 1);

  scoreChart.innerHTML = totals.map((studio, index) => {
    const width = Math.max((Math.abs(studio.total) / largestTotal) * 100, 4);
    const delay = index * 120;

    return `
      <div class="chart-row">
        <span>${studio.name}</span>
        <div class="chart-bar-track">
          <div class="chart-bar ${colorClass("bar", studio.colorClass)}" style="width: ${width}%; animation-delay: ${delay}ms"></div>
        </div>
        <strong>${Math.round(studio.total * 10) / 10}M</strong>
      </div>
    `;
  }).join("");
}

renderTeams();
renderTopPerformers();
renderBestRoi();
renderClosestBreakeven();
renderBiggestBombs();
renderWeeklyProjections();
renderUpcomingReleases();
renderScoreChart();
