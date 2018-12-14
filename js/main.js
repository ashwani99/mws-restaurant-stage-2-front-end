import DBHelper from './dbhelper';
import toastr from 'toastr';

let restaurants,
  neighborhoods,
  cuisines
var newMap
var markers = []

let postponedFavourites = new Array();

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap(); // added 
  fetchNeighborhoods();
  fetchCuisines();
  registerServiceWorker();
  document.getElementById('neighborhoods-select').addEventListener('change', updateRestaurants);
  document.getElementById('cuisines-select').addEventListener('change', updateRestaurants);
  window.addEventListener('online', () => {
    toastr.success('You are now online');
    updateFavourites();
  });
  window.addEventListener('offline', () => {
    toastr.warning('You are now offline. Please check your Internet connection');
  });
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
let fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
let fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    option.setAttribute('aria-label', neighborhood);
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
let fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
let fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    option.setAttribute('aria-label', cuisine);
    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
let initMap = () => {
  self.newMap = L.map('map', {
        center: [40.722216, -73.987501],
        zoom: 12,
        scrollWheelZoom: false
      });
  // console.log(L);
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: 'pk.eyJ1Ijoia29naW5nIiwiYSI6ImNqcGM4M3oxbTBiczEzcW14anV2NW41MG8ifQ.ERUns5YDJZDSlbusPJoEvw',
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(self.newMap);

  updateRestaurants();
}
/* window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
} */

/**
 * Update page and map for current restaurants.
 */
let updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
let resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
let fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
let createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = 'An image of ' + restaurant.name + ' restaurant';
  li.append(image);

  const name = document.createElement('h1');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more)

  const favouriteToggle = document.createElement('button');
  
  console.log(restaurant);
  if (restaurant.is_favorite == 'true') {
    favouriteToggle.innerHTML = 'unfavourite';
    favouriteToggle.style.backgroundColor = '#FF294D';
    favouriteToggle.classList.add('favourited');
  } else {
    favouriteToggle.innerHTML = 'favourite';
    favouriteToggle.style.backgroundColor = '#7E7D7D';
    favouriteToggle.classList.remove('favourited');
  }

  favouriteToggle.addEventListener('click', () => {
    if (favouriteToggle.innerHTML === 'favourite') {
      favouriteToggle.innerHTML = 'unfavourite';
      // console.log(favouriteToggle.classList);
      favouriteToggle.style.backgroundColor = '#FF294D';
      favouriteToggle.classList.remove('favourited');
    } else {
      favouriteToggle.innerHTML = 'favourite';
      favouriteToggle.style.backgroundColor = '#7E7D7D';
      favouriteToggle.classList.add('favourited');
    }
    
    // add to idb
    restaurant.is_favorite = !restaurant.is_favorite ;
    console.log(restaurant.is_favorite);
    DBHelper.DB_PROMISE.then((db) => {
        let tx = db.transaction('restaurants', 'readwrite');
        let restaurantStore = tx.objectStore('restaurants');
        restaurantStore.get('restaurants').then((restaurants) => {
          restaurants.map((currentRestaurant) => {
            if (currentRestaurant.id == restaurant.id) {
              currentRestaurant.is_favorite = restaurant.is_favorite;
            }
          });
          console.log(restaurants);
          restaurantStore.put(restaurants, 'restaurants');
        });
      });
    
    // add to server
    if (!navigator.onLine) {
      postponedFavourites.push(restaurant);
      return;
    }

    // console.log(restaurant);
    let isFavourite = restaurant.is_favorite;
    fetch(`${DBHelper.API_BASE_URL}/restaurants/${restaurant.id}/?is_favorite=${isFavourite}`, {
      method: 'PUT'
    });
  });
  
  li.append(favouriteToggle);

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
let addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });

} 
/* addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
} */

// Service worker registration
let registerServiceWorker = () => {
  if (!navigator.serviceWorker) {
    return;
  }

  navigator.serviceWorker.register('../sw.js').then(() => {
    console.log('Service worker has been registered!');
  }).catch((err) => {
    console.log('Error occured while registering service worker!' + err);
  });
}


let updateFavourites = () => {
  Promise.all(
    postponedFavourites.map((restaurant) => {
      let isFavourite = restaurant.is_favorite;
      fetch(`${DBHelper.API_BASE_URL}/restaurants/${restaurant.id}/?is_favorite=${isFavourite}`, {
        method: 'PUT'
      });
    })
  ).then(() => {
    toastr.success('Favourites have been updated successfully');
    postponedReviews.length=0;
  })
};
