import DBHelper from './dbhelper';
import toastr from 'toastr';

let restaurant;
var newMap;

let postponedReviews = new Array();

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
  document.getElementById('review-form-submit-btn').addEventListener('click', submitReview);
  window.addEventListener('online', () => {
    toastr.success('You are now online');
    if (postponedReviews.length > 0) {
      addPostponedReviews();
    }
  });
  window.addEventListener('offline', () => {
    toastr.warning('You are now offline. Please check your Internet connection');
  });
});

/**
 * Initialize leaflet map
 */
let initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {      
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1Ijoia29naW5nIiwiYSI6ImNqcGM4M3oxbTBiczEzcW14anV2NW41MG8ifQ.ERUns5YDJZDSlbusPJoEvw',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'    
      }).addTo(self.newMap);
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}  
 
/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
let fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
let fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
let fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
let fillReviewsHTML = () => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  DBHelper.fetchReviews(self.restaurant.id).then((reviews) => {
    if (!reviews) {
      const noReviews = document.createElement('p');
      noReviews.innerHTML = 'No reviews yet!';
      container.appendChild(noReviews);
      return;
    }
    const ul = document.getElementById('reviews-list');
    reviews.forEach(review => {
      ul.appendChild(createReviewHTML(review));
    });
    container.appendChild(ul);
  });
}

/**
 * Create review HTML and add it to the webpage.
 */
let createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  const createdAt = new Date(review.createdAt);
  date.innerHTML = `${createdAt.getDate()}-${createdAt.getMonth()+1}-${createdAt.getFullYear()}`;
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
let fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
let getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}


let submitReview = (e) => {
  // console.log(postponedReviews);
  let reviewerName = document.getElementById('reviewer-name');
  let reviewRating = document.getElementById('reviewer-rating');
  let reviewComments = document.getElementById('reviewer-comments');

  if (!reviewerName.checkValidity()) {
    toastr.error(reviewerName.validationMessage);
    return;
  }
  if (!reviewRating.checkValidity()) {
    toastr.error(reviewRating.validationMessage);
    return;
  }
  if (!reviewComments.checkValidity()) {
    toastr.error(reviewComments.validationMessage);
    return;
  }
  
  let reviewPayload = {
    "restaurant_id": self.restaurant.id,
    "name": reviewerName.value,
    "createdAt": new Date().getTime(),
    "updatedAt": new Date().getTime(),
    "rating": reviewRating.value,
    "comments": reviewComments.value
  };

  document.getElementById('reviews-list')
    .appendChild(createReviewHTML(reviewPayload));

  // update reviews in IDB
  DBHelper.DB_PROMISE.then((db) => {
    let tx = db.transaction('restaurant-reviews', 'readwrite');
    let reviewStore = tx.objectStore('restaurant-reviews');
    reviewStore.get('reviews').then((reviews) => {
      reviews.push(reviewPayload);
      reviewStore.put(reviews, 'reviews');
    });
  
    // if offline, then store to add review later when online
    if (!navigator.onLine) {
      postponedReviews.push(reviewPayload);
      console.log('offline');
      return;
    }

    fetch(`${DBHelper.API_BASE_URL}/reviews`, {
      method: 'POST',
      body: JSON.stringify(reviewPayload),
      headers: { 'Content-Type': 'application/json' }
    });
  });
}

let addPostponedReviews = () => {
  Promise.all(
    postponedReviews.map((review) => {
      fetch(`${DBHelper.API_BASE_URL}/reviews`, {
        method: 'POST',
        body: JSON.stringify(review),
        headers: { 'Content-Type': 'application/json' }
      })
    })
  ).then(() => {
    toastr.success('Postponed reviews have been added successfully');
    postponedReviews.length=0;
  })
};