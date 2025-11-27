const newDateFormEL = document.getElementsByTagName("form")[0];
const firstDateInputEL = document.getElementById("first-date");
const secondDateInputEL = document.getElementById("second-date");
const pastDateContainer = document.getElementById("past-dates");

// Add the storage key as an app-wide constant
const STORAGE_KEY = "date-tracker";

// Listen to form submissions.
newDateFormEL.addEventListener("submit", (event) => {
  event.preventDefault();
  const firstDate = firstDateInputEL.value;
  const secondDate = secondDateInputEL.value;
  if (checkDatesInvalid(firstDate, secondDate)) {
    return;
  }
  storeNewDate(firstDate, secondDate);
  renderPastDates();
  newDateFormEL.reset();
});

function checkDatesInvalid(firstDate, secondDate) {
  if (!firstDate || !secondDate || firstDate > secondDate) {
    newDateFormEL.reset();
    return true;
  }
  return false;
}

function storeNewDate(firstDate, secondDate) {
  const dateSet = getAllStoredDates();
  dateSet.push({ firstDate, secondDate });
  dateSet.sort((a, b) => new Date(b.firstDate) - new Date(a.firstDate));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dateSet));
}

function getAllStoredDates() {
  const data = window.localStorage.getItem(STORAGE_KEY);
  const dateSet = data ? JSON.parse(data) : [];
  console.dir(dateSet);
  console.log(dateSet);
  return dateSet;
}

function renderPastDates() {
  const pastDateHeader = document.createElement("h2");
  const pastDateList = document.createElement("ul");
  const dateSet = getAllStoredDates();
  if (dateSet.length === 0) {
    return;
  }
  pastDateContainer.textContent = "";
  pastDateHeader.textContent = "Past Dates";
  dateSet.forEach((period) => {
    const dateEL = document.createElement("li");
    dateEL.textContent = `From ${formatDate(
      dateSet.firstDate,
    )} to ${formatDate(period.secondDate)}`;
    pastDateList.appendChild(dateEL);
  });

  pastDateContainer.appendChild(pastDateHeader);
  pastDateContainer.appendChild(pastDateList);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { timeZone: "UTC" });
}

renderPastDates();
