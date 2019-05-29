/* eslint-disable no-shadow */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

"use strict";

//our map
let myMap;

//store all our markers in an array
let markers = [];

//used to ensure that only one polygon is drawn on the map
let polygon = null;

//used to control the places that are displayed
let placeMarkers = [];

//used for initializing the map
//any external function that uses the map should also be called here
function initMap() {
    //style for the map
    const style = [
        { "featureType": "administrative", "elementType": "labels.text.fill", "stylers": [{ "color": "#444444" }] }, { "featureType": "administrative.land_parcel", "elementType": "all", "stylers": [{ "visibility": "off" }] }, { "featureType": "landscape", "elementType": "all", "stylers": [{ "color": "#f2f2f2" }] }, { "featureType": "landscape.natural", "elementType": "all", "stylers": [{ "visibility": "off" }] }, { "featureType": "poi", "elementType": "all", "stylers": [{ "visibility": "on" }, { "color": "#052366" }, { "saturation": "-70" }, { "lightness": "85" }] }, { "featureType": "poi", "elementType": "labels", "stylers": [{ "visibility": "simplified" }, { "lightness": "-53" }, { "weight": "1.00" }, { "gamma": "0.98" }] }, { "featureType": "poi", "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] }, { "featureType": "road", "elementType": "all", "stylers": [{ "saturation": -100 }, { "lightness": 45 }, { "visibility": "on" }] }, { "featureType": "road", "elementType": "geometry", "stylers": [{ "saturation": "-18" }] }, { "featureType": "road", "elementType": "labels", "stylers": [{ "visibility": "off" }] }, { "featureType": "road.highway", "elementType": "all", "stylers": [{ "visibility": "on" }] }, { "featureType": "road.arterial", "elementType": "all", "stylers": [{ "visibility": "on" }] }, { "featureType": "road.arterial", "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] }, { "featureType": "road.local", "elementType": "all", "stylers": [{ "visibility": "on" }] }, { "featureType": "transit", "elementType": "all", "stylers": [{ "visibility": "off" }] }, { "featureType": "water", "elementType": "all", "stylers": [{ "color": "#57677a" }, { "visibility": "on" }] }
    ];

    const mapContainer = document.querySelector('.map-container');
    myMap = new google.maps.Map(mapContainer, {
        center: {
            lat: 40.7413549,
            lng: -73.9980244
        },
        zoom: 13,
        styles: style,
        mapTypeControl: false
    });

    addMarker();

    //for auto completion of fields
    const timeAutoComplete = new google.maps.places.Autocomplete(document.querySelector('#search-within-time-text'));
    const zoomAutoComplete = new google.maps.places.Autocomplete(document.querySelector('.address-input'));
    //make the autocomplete bound to the zone in the map
    zoomAutoComplete.bindTo('bounds', myMap);

    //creating our searchbox
    const searchBox = new google.maps.places.SearchBox(document.querySelector('#places-search'));
    searchBox.setBounds(myMap.getBounds());

    //this listener if for when the users select the place from the picklist
    searchBox.addListener('places_changed', function() {
        searchBoxPlaces(this);
    });

    const boxBtn = document.querySelector('#go-places');
    boxBtn.addEventListener('click', textSearchPlaces);

    //for drawing polylines on the map
    const drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: google.maps.drawing.OverlayType.POLYGON,
        drawingControl: true,
        //the drawing buttons
        drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_LEFT,
            drawingModes: [
                google.maps.drawing.OverlayType.POLYGON
            ]
        }
    });

    //show all markers on click
    const showBtn = document.querySelector('.show-markers');
    showBtn.addEventListener('click', showMarkers);

    //hide all markers and remove references
    const hideBtn = document.querySelector('.hide-markers');
    hideBtn.addEventListener('click', function() {
        hideMarkers(markers);
    });

    //for drawing functionality
    const drawBtn = document.querySelector('.toggle-draw');
    drawBtn.addEventListener('click', function() {
        //toggle the drawing buttons
        if (drawingManager.map) {
            drawingManager.setMap(null);
            //get rid of the polygon too on toggle
            if (polygon) {
                polygon.setMap(null);
            }
        } else {
            drawingManager.setMap(myMap);
        }
        //call the function to draw the polygon
        drawPolygon(drawingManager);
    });

    //for zoom functionality
    const zoomBtn = document.querySelector('.zoom');
    zoomBtn.addEventListener('click', function() {
        zoomToArea();
    });

    //for computing travel distance
    const searchBtn = document.querySelector('.search');
    searchBtn.addEventListener('click', function() {
        searchWithinTime();
    });
}

//show markers
function showMarkers() {
    const bounds = new google.maps.LatLngBounds();
    // Extend the boundaries of the map for each marker and display the marker
    for (let i = 0; i < markers.length; i++) {
        markers[i].setMap(myMap);
        bounds.extend(markers[i].position);
    }
    myMap.fitBounds(bounds);
}

//hide markers
function hideMarkers(markers) {
    for (let i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
}

//add markers to the map
function addMarker() {
    const locations = [
        { title: 'Park Ave Penthouse', location: { lat: 40.7713024, lng: -73.9632393 } },
        { title: 'Chelsea Loft', location: { lat: 40.7444883, lng: -73.9949465 } },
        { title: 'Union Square Open Floor Plan', location: { lat: 40.7347062, lng: -73.9895759 } },
        { title: 'East Village Hip Studio', location: { lat: 40.7281777, lng: -73.984377 } },
        { title: 'TriBeCa Artsy Bachelor Pad', location: { lat: 40.7195264, lng: -74.0089934 } },
        { title: 'Chinatown Homey Space', location: { lat: 40.7180628, lng: -73.9961237 } }
    ];

    //an info popup when clicking on the marker
    const commonInfoWindow = new google.maps.InfoWindow();

    //our custom marker
    const image = {
        url: 'http://maps.google.com/mapfiles/kml/paddle/pink-stars.png',
        //This marker is 36 pixels wide by 36 pixels high.
        scaledSize: new google.maps.Size(36, 36),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(0, 0)
    };

    for (let i = 0; i < locations.length; i++) {
        let marker = new google.maps.Marker({
            position: locations[i].location,
            title: locations[i].title,
            animation: google.maps.Animation.DROP,
            icon: image,
            id: i
        });

        markers.push(marker);

        marker.addListener('click', function() {
            populateInfo(this, commonInfoWindow);
        });
    }
}

//populate the infowindow
function populateInfo(marker, infoWindow) {
    //setting marker bounce effect
    for (let i in markers) {
        //bounce only the marker which matches the current clicked marker
        if (markers[i].id === marker.id) {
            markers[i].setAnimation(google.maps.Animation.BOUNCE);
        } else {
            // if no match then reset other bouncy markers
            markers[i].setAnimation(null);
        }
    }
    //proceed only if infoWindow doesn't have a marker set
    if (infoWindow.marker !== marker) {
        infoWindow.marker = marker;
        //use streetview service to get the closest streetview image within
        let streetViewService = new google.maps.StreetViewService();
        //get the nearest street view from position at radius of 50 meters
        let radius = 50;

        //this function is used to get panorama shot for the given location
        streetViewService.getPanoramaByLocation(marker.position, radius, function(data, status) {
            if (status === google.maps.StreetViewStatus.OK) {
                //the location
                let location = data.location.latLng;
                let heading = google.maps.geometry.spherical.computeHeading(location, marker.position);
                infoWindow.setContent(`<div> ${marker.title}</div><div id="pano"></div>`);
                let panoramaOptions = {
                    position: location,
                    pov: {
                        heading: heading,
                        pitch: 30
                    }
                };
                let panorama = new google.maps.StreetViewPanorama(document.querySelector('#pano'), panoramaOptions);
            } else {
                infoWindow.setContent(`<div>${marker.title}</div><div>No Street View Found</div>`);
            }
        });
        //open the infowindow on the correct marker.
        infoWindow.open(myMap, marker);

        infoWindow.addListener('closeclick', function() {
            infoWindow.marker = null;
            marker.setAnimation(null);
        });
    }
}

//draw the polygon on the map
function drawPolygon(drawingManager) {
    drawingManager.addListener('overlaycomplete', function(evt) {
        //check if polygon already rendered
        if (polygon) {
            polygon.setMap(null);
        }
        //so that once drawing is complete we go back to free hand movement mode
        drawingManager.setDrawingMode(null);
        //creating an editable polygon
        polygon = evt.overlay;
        polygon.setEditable(true);
        //calculating the area of the polygon
        let area = google.maps.geometry.spherical.computeArea(polygon.getPath());
        console.log(area + ' square meters');
        //search for markers within our polygon
        searchInPolygon();
        //redo the search if the polygon is edited
        polygon.getPath().addListener('set_at', searchInPolygon);
        polygon.getPath().addListener('insert_at', searchInPolygon);
    });
}

//search for markers in the polygon
function searchInPolygon() {
    for (let i = 0; i < markers.length; i++) {
        //check if the polygon encolses any markers
        if (google.maps.geometry.poly.containsLocation(markers[i].position, polygon)) {
            //display the enclosed markers
            markers[i].setMap(myMap);
        } else {
            //hide the rest
            markers[i].setMap(null);
        }
    }
}

//geocode and zoom to address
function zoomToArea() {
    //initializing the geocoder
    const geocoder = new google.maps.Geocoder();

    let address = document.querySelector('.address-input').value;

    if (address === '') {
        alert('Enter address');
    } else {
        //geocode the address and center the map
        geocoder.geocode({
            address: address,
            componentRestrictions: {
                locality: 'New York'
            }
        }, function(results, status) {
            if (status === google.maps.GeocoderStatus.OK) {
                myMap.setCenter(results[0].geometry.location);
                myMap.setZoom(15);
            } else {
                alert('Location not found');
            }
        });
    }
}

//show listings within the travel time
function searchWithinTime() {
    // Initialize the distance matrix service.
    const distanceMatrixService = new google.maps.DistanceMatrixService();
    let address = document.getElementById('search-within-time-text').value;
    if (address === '') {
        window.alert('You must enter an address.');
    } else {
        hideMarkers(markers);
        //distance martrix calculates the distance and duration of route between
        //the origins and the destination
        let origins = [];
        for (let i = 0; i < markers.length; i++) {
            origins[i] = markers[i].position;
        }
        // let destination = address;
        let mode = document.getElementById('mode').value;
        //get distance between the origins and the destination
        distanceMatrixService.getDistanceMatrix({
            origins: origins,
            destinations: [address],
            travelMode: google.maps.TravelMode[mode],
            unitSystem: google.maps.UnitSystem.METRIC
        }, function(response, status) {
            if (status === google.maps.DistanceMatrixStatus.OK) {
                //display the markers that satisfy the time
                displayMarkersWithinTime(response);
            } else {
                alert('Error was: ' + status);
            }
        });
    }
}

//function to display markers that satisfy the time criteria
function displayMarkersWithinTime(response) {
    const maxDuration = document.getElementById('max-duration').value;
    let origins = response.originAddresses;

    // Parse through the results, and get the distance and duration of each.
    // Because there might be  multiple origins and destinations we have a nested loop
    // Then, make sure at least 1 result was found.
    let atLeastOne = false;
    for (let i = 0; i < origins.length; i++) {
        let results = response.rows[i].elements;
        for (let j = 0; j < results.length; j++) {
            let element = results[j];
            if (element.status === "OK") {
                //The distance is returned in feet, but the TEXT is in miles. If we wanted to switch
                //the function to show markers within a user-entered DISTANCE, we would need the
                //value for distance, but for now we only need the text.
                let distanceText = element.distance.text;

                //convert duration to seconds
                let duration = element.duration.value / 60;
                let durationText = element.duration.text;
                //if the duration is less than the value in the picker, show it on the map
                if (duration <= maxDuration) {
                    //show the markers within the duration
                    markers[i].setMap(myMap);
                    atLeastOne = true;
                    //make infowindow open immediately with duration and distance
                    const infowindow = new google.maps.InfoWindow({
                        content: `<div>${durationText} away, ${distanceText}</div>
                        <div><button class="route-btn" onclick="displayDirections('${origins[i]}')">View Route</button></div>`
                    });
                    infowindow.open(myMap, markers[i]);
                    // Put this in so that this small window closes if the user clicks
                    // the marker, when the big infowindow opens
                    markers[i].infowindow = infowindow;
                    google.maps.event.addListener(markers[i], 'click', function() {
                        this.infowindow.close();
                    });
                }
            }
        }
    }
    if (!atLeastOne) {
        window.alert('We could not find any locations within that distance!');
    }
}

//display the route on the map
function displayDirections(origin) {
    hideMarkers(markers);
    const directionsService = new google.maps.DirectionsService();
    //Get the destination address from the user entered value.
    const destinationAddress = document.getElementById('search-within-time-text').value;
    //Get mode again from the user entered value.
    const mode = document.getElementById('mode').value;
    directionsService.route({
        // The origin is the passed in marker's position.
        origin: origin,
        // The destination is user entered address.
        destination: destinationAddress,
        travelMode: google.maps.TravelMode[mode]
    }, function(response, status) {
        if (status === google.maps.DirectionsStatus.OK) {
            let directionsDisplay = new google.maps.DirectionsRenderer({
                map: myMap,
                directions: response,
                draggable: true,
                polylineOptions: {
                    strokeColor: 'green'
                }
            });
        } else {
            alert('Directions request failed due to ' + status);
        }
    });
}

//function that handles the suggested place
function searchBoxPlaces(searchBox) {
    //hide any place markers already set
    hideMarkers(placeMarkers);
    //get all places from the query
    let places = searchBox.getPlaces();
    //we create markers for the places
    createMarkersForPlaces(places);
    if (places.length === 0) {
        alert('No places found');
    }
}

//function that does manual search for the place
function textSearchPlaces() {
    let bounds = myMap.getBounds();
    //hide any marers already set
    hideMarkers(placeMarkers);
    //create a new places service
    const placesService = new google.maps.places.PlacesService(myMap);
    //initiate the search
    placesService.textSearch({
        query: document.querySelector('#places-search').value,
        bounds: bounds
    }, function(results, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            createMarkersForPlaces(results);
        }
    });
}

//function that creates markers for each place found in either places search
function createMarkersForPlaces(places) {
    let bounds = new google.maps.LatLngBounds();
    for (let i = 0; i < places.length; i++) {
        let place = places[i];
        let icon = {
            url: place.icon,
            size: new google.maps.Size(35, 35),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(15, 34),
            scaledSize: new google.maps.Size(25, 25)
        };
        //create a marker for each place.
        let marker = new google.maps.Marker({
            map: myMap,
            icon: icon,
            title: place.name,
            position: place.geometry.location,
            id: place.place_id
        });

        placeMarkers.push(marker);

        //creating a shared place info window
        let placeInfoWindow = new google.maps.InfoWindow();

        //if a marker is clicked, do a place details search
        marker.addListener('click', function() {
            //avoid repeated opening of the placeInfoWindow
            if (placeInfoWindow.marker !== this) {
                getPlacesDetails(this, placeInfoWindow);
            }
        });

        if (place.geometry.viewport) {
            //only geocodes have viewport.
            bounds.union(place.geometry.viewport);
        } else {
            bounds.extend(place.geometry.location);
        }
    }
    myMap.fitBounds(bounds);
}

//get more details on a particular place whose marker is clicked
function getPlacesDetails(marker, infowindow) {
    const service = new google.maps.places.PlacesService(myMap);
    service.getDetails({
        placeId: marker.id
    }, function(place, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            //set the marker property on this infowindow so it isn't created again.
            infowindow.marker = marker;

            let innerHTML = '<div>';
            if (place.name) {
                innerHTML += '<strong>' + place.name + '</strong>';
            }
            if (place.formatted_address) {
                innerHTML += '<br>' + place.formatted_address;
            }
            if (place.formatted_phone_number) {
                innerHTML += '<br>' + place.formatted_phone_number;
            }
            if (place.opening_hours) {
                innerHTML += '<br><br><strong>Hours:</strong><br>' +
                    place.opening_hours.weekday_text[0] + '<br>' +
                    place.opening_hours.weekday_text[1] + '<br>' +
                    place.opening_hours.weekday_text[2] + '<br>' +
                    place.opening_hours.weekday_text[3] + '<br>' +
                    place.opening_hours.weekday_text[4] + '<br>' +
                    place.opening_hours.weekday_text[5] + '<br>' +
                    place.opening_hours.weekday_text[6];
            }
            if (place.photos) {
                innerHTML += '<br><br><img src="' + place.photos[0].getUrl({ maxHeight: 100, maxWidth: 200 }) + '">';
            }
            innerHTML += '</div>';
            infowindow.setContent(innerHTML);
            infowindow.open(myMap, marker);
            //make sure the marker property is cleared if the infowindow is closed
            infowindow.addListener('closeclick', function() {
                infowindow.marker = null;
            });
        }
    });
}

//*Using API's through web services server side

//>>StreetView API
//http://maps.googleapis.com/maps/api/streetview?location=41.40315,2.17380&size=500x500&heading=40&fov=90&pitch=40

//>>Geocode API
//http://maps.googleapis.com/maps/api/geocode/json?address=[YOUR ADDRESS]&key=[YOUR KEY]

//>>Elevation API
//http://maps.googleapis.com/maps/api/elevation/json?locations=[lat],[long]&key=[YOUR KEY]

//>>DistanceMatrix API
//http://maps.googleapis.com/maps/api/distancematrix/json?origins=New+York,+NY&destinations=San+Fransicso&key=[API KEY]

//http://maps.googleapis.com/maps/api/distancematrix/json?mode=bicycling&avoid=highways&origins=New+York,+NY&destinations=San+Fransicso&key=[API KEY]

//http://maps.googleapis.com/maps/api/distancematrix/json?mode=transit&transit_mode=rail&origins=New+York,+NY&destinations=San+Fransicso&key=[API KEY]

//>>Directions API
//https://maps.googleapis.com/maps/api/directions/json?origin=Brooklyn&destination=75+9th+Ave,+New+York,+NY&key=[API KEY]

//https://maps.googleapis.com/maps/api/directions/json?mode=transit&origin=Brooklyn&destination=75+9th+Ave,+New+York,+NY&key=[API KEY]

//https://maps.googleapis.com/maps/api/directions/json?mode=bicycling&origin=Brooklyn&destination=75+9th+Ave,+New+York,+NY&waypoints=165+Avenue+A,+New+York&key=[API KEY]

//https://maps.googleapis.com/maps/api/directions/json?mode=bicycling&origin=Brooklyn&destination=75+9th+Ave,+New+York,+NY&waypoints=optimize:true|165+Avenue+A,+New+York|350+5th+Ave,+New+York,+NY|1520+york+ave,+new+york,+ny|&key=[API KEY]

//>>Timezone API
//http://maps.googleapis.com/maps/api/timezone/json?location=[lat],[long]&timestamp=[obtained via Data.now()]&key=[API KEY]
