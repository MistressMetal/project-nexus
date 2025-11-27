// form constants
const newDateFormEL = document.getElementsByTagName("form")[0];
const firstDateInputEL = document.getElementById("first-date");
const secondDateInputEL = document.getElementById("second-date");
const STORAGE_KEY = "dates-tracker";



// get the form submissions
newDateFormEL.addEventListener("submit", (event) => {
  // prevent the form from submitting to the server
  event.preventDefault();
  // get dates
  const firstDate = firstDateInputEL.value;
  const secondDate = secondDateInputEL.value;
  // Check if the dates are invalid
//  if (checkDatesInvalid(firstDate, secondDate)) {
//    return;
//  }

  // store it client side
  storeNewDates(firstDate, secondDate);

  // refresh
  renderPastDates();
  newDateFormEL.reset();
});


//function checkDatesinvalid(firstDate, secondDate) {
//  if(!firstDate || !secondDate || firstDate > secondDate) {
//    newDateFormEL.reset();
//    return true;
//  }
//  return false;
//}



function storeNewDate(firstDate, secondDate) {
  // get from storage;
  const dates = getAllStoredDates();
  // add new date
  dates.push({ firstDate, secondDate });
  //sort
  dates.sort((a, b) => new Date(b.firstDate) - new Date(a.firstDate));

  //stor back into storage
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dates));
}

function getAllStoredDates() {
  const data = window.localStorage.getItem(STORAGE_KEY);

  // default to empty array if no data is found
  const dates = data ? JSON.parse(data) : [];

  return dates;
}

const pastDateContainer = document(getElementById("past-dates");

function renderPastDates() {
  //get parsed array
  const dates = getAllStoredDates();

  if(dates.length === 0) {
    return;
  }

  // clear the list
  pastDateContainer.textContent = "";

  const pastDateHeader = document.createElement("h2");
  pastDateHeader.textContent = "Past Dates";

  //loop and render
  dates.forEach((date) => {
    const dateEL = document.createElement("li");
    dateEL.textContent = From ${formatDate(
      date.firstDate,
    )} to ${formatDate(date.secondDate)};
    pastDateList.appendChile(dateEL);
  });

  pastDateContainer.appendChild(pastDateHeader);
  pastDateContainer.appendChild(pastDateList);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-us", { timeZone: "UTC" });
}

renderPastDates();

  
  
