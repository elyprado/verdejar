/*
 * Copyright (C) 2014 Intel Corporation. All rights reserved.
 */

 /*
  * This script initalizes Google Maps widgets with your application
  *
  * You can get to any instantiated Google Maps object by using the export
  * googleMaps.getObjectBySelector(selector) and using an id/class to retrieve it.
  * Similarly, you can use getMarkersByID(selector) to get markers for a
  * particular map.
  *
  * After getting the object you may use any of the normal Google Maps Javascript
  * V3 API calls.  Example:
  *
  * var map = googleMaps.getObjectBySelector('#myMap');
  * map.setCenter(new google.maps.LatLng(40.000, -100.000));
  *
  * For more information about the Google Maps API visit:
  * https://developers.google.com/maps/documentation/javascript/
  *
  */
/*global googleMaps, google */
(function() {

  'use strict';
  window.googleMaps = {};

  /**
   *  googleMaps.js - Generic code for stand alone or data-feed Google Maps
   *
   *  @exports getObjectBySelector(selector)
   *  @exports getMarkersByID(selector)
   *
   */

  var maps = [];

    /**
     * Waits for deviceready event from Cordova and then calls init to create
     * maps and set event handlers for service calls.  We then initiate any
     * service call that needs to happen after initalize is done.
     *
     */
  var deferred = function(){
    init();
        callService();
        refreshMap();
  };
  document.addEventListener('app.Ready', deferred, false);


  /**
   * Page change event that will detect any visible maps on the new page and
   * attempt to refresh the map and re-bound the map to the existing markers.
   * This corrects a map looking cut off and not being centered since it was
   * initalized while not being rendered on a secondary page.
   */
  function refreshMap(){
    if(typeof $ === "function") {
      $(document).on('pagechange', function(){
        var visibleMaps = $('[data-uib="media/google_maps"]:visible');
        var mapClass = visibleMaps.map(function(key, item){
          var contains = item.className.split(' ').filter(function(classItem){
            return /uib_w_/.test(classItem);
          });
          if(contains.length > 0) { return contains[0]; }
        });
        mapClass.each(function(key, item){
          var map = googleMaps.getObjectBySelector('.' + item);
          if(!map) return;
          google.maps.event.trigger(map,'resize');

          var markers = googleMaps.getMarkersByID('.' + item);
          if(!markers || markers.length === 0) return;

          var bounds = new google.maps.LatLngBounds();
          markers.forEach(function(marker){
            bounds.extend(marker.position);
          });
          map.fitBounds(bounds);
              map.panToBounds(bounds);
        });
      });
    }
  }


    /**
     * Initalize finds all the maps on the page and gathers the relevant data attributes.
     * It then initalizes all the maps with the gathered data, depending on whether
     * it is a single marker map or a datafeed map.
     *
     */
  function init() {
    findMaps();
    initalizeMaps();
  }

    /**
     * Queries the document for all data-uib matching googleMaps.  It then loops through
     * the results and gatheres all the data attributes and pushes then to the maps array.
     *
     */
  function findMaps() {
    var mapQuery = document.querySelectorAll('[data-uib="media/google_maps"]');

    for(var i = 0; i < mapQuery.length; i++) {
        var mapsData = {};
        var elem = mapQuery[i];
        mapsData.mapDOMNode = elem;
        mapsData.dataEvent = elem.getAttribute('data-sm');
        mapsData.dataRpa = elem.getAttribute('data-rpath');
        mapsData.dataLat = elem.getAttribute('data-lat');
        mapsData.dataLong = elem.getAttribute('data-long');
        mapsData.dataZoom = elem.getAttribute('data-zoom');
        mapsData.dataCenterAddress = elem.getAttribute('data-center-address');
        mapsData.dataCenterLat = elem.getAttribute('data-center-latitude');
        mapsData.dataCenterLong = elem.getAttribute('data-center-longitude');
        mapsData.dataCenterAuto = elem.getAttribute('data-center-auto');
        mapsData.dataMarkerTitle = elem.getAttribute('data-marker-title');
        mapsData.dataAnimate = elem.getAttribute('data-animate-marker');
        maps.push(mapsData);
        }
  }

    /**
     * InitalizeMaps creates a base map for all nodes found and then determines whether the
     * data will be feed through a service or as a standalone map.  It then creates one or more
     * markers based on data.
     *
     */
  function initalizeMaps() {
    maps.forEach(function(map){
      createMap(map);
            if(map.dataEvent) {
                $(document).on('intel.xdk.services.' + map.dataEvent, function(evt, data){
                    clearMarkers(map);
                    createMarkers(map, data);
                    if(map.dataCenterAuto){
            boundMap(map);
                    }
                });
            } else {
                createMarker(map);
                if(map.dataCenterAuto){
          boundMap(map);
                }
            }
    });
  }

    /**
     * Create Map will gather the zoom and center data as those are required for creating a map.
     * It will check whether there is a lat/long used for the center, if not, it will use a default
     * lat/long of 40, -100 (United States) and create the map.  It will then check after it's done
     * whether there was an address for the center that needs to be geocoded.
     *
     * @param {Object} mapObject - Contains data about map for creation
     */
  function createMap(mapObject) {
    var mapOptions = {};
    mapOptions.zoom = mapZoom(mapObject);
    if (!!mapObject.dataCenterLat && !!mapObject.dataCenterLong &&
      parseFloat(mapObject.dataCenterLat) && parseFloat(mapObject.dataCenterLong)) {
            mapOptions.center = new google.maps.LatLng(parseFloat(mapObject.dataCenterLat), parseFloat(mapObject.dataCenterLong));
        } else {
      mapOptions.center = new google.maps.LatLng(40.0000, -100.0000);  // Required Map Center
        }
    mapObject.map_object = new google.maps.Map(mapObject.mapDOMNode, mapOptions);
    geocodeAddress(mapObject);
  }

    /**
     * Create Marker is used for creating a single marker.  It will gather the information
     * from the mapObject and use those values for the marker.
     *
     * @param {Object} mapObject - Contains data about map for creation
     */
  function createMarker(mapObject) {
    var marker = {};
    marker.map = mapObject.map_object;
    marker.position = markerPosition(mapObject);
    marker.animation = markerAnimation(mapObject);
    marker.title = markerTitle(mapObject);

    var markerObject = new google.maps.Marker(marker);
    mapObject.markers = [markerObject];
  }

    /**
     * Create Markers is used when a service is creating the locations.  It will determine the correct
     * path for gathering the data and then loop through each one gathering certain values for creating
     * the marker.
     *
     * @param {Object} mapObject - Contains data about map for creation
     */
  function createMarkers(mapObject, data) {
    mapObject.markers = [];

    var dataRpa = JSON.parse(mapObject.dataRpa);
    dataRpa.forEach(function(d){ data = data[d]; });
    data = filter(data, isObject);

    for( var i = 0; i < data.length; i++ ) {
      var marker       = {};
      var dataItem     = data[i];
      marker.map       = mapObject.map_object;
      marker.title     = markerTitle(mapObject, dataItem);
      marker.position   = markerPosition(mapObject, dataItem);
      marker.animation   = markerAnimation(mapObject);
      var markerObject   = new google.maps.Marker(marker);

      mapObject.markers.push(markerObject);
    }
  }

    /**
     * Clear Markers is called when a service call is a triggered so remove all of the old
     * markers on the map before creating any new ones.  To do this you must set each marker
     * to null to clear them from the map and then remove all references of them from their
     * reference array.
     *
   * @param {Object} mapObject - Contains data about map for creation
     */
  function clearMarkers(mapObject) {
    if(!mapObject.markers) return;
    //Iterate through markers array and set to null to remove from map
    for( var i = 0; i < mapObject.markers.length; i++) {
      mapObject.markers[i].setMap(null);
    }
    //Zero array to remove references to markers
    mapObject.markers = [];
  }

  function boundMap(map) {
    var bounds = new google.maps.LatLngBounds();
    map.markers.forEach(function(marker){
      bounds.extend(marker.position);
    });
    map.map_object.fitBounds(bounds);
        map.map_object.panToBounds(bounds);
  }

    /**
     * Call Service will look through all the maps on the page and find whether any of them have
     * a data event.  It will then go through all of the namespaces and add it to 'intel.xdk.services'
     * to create a function call.
     */
    function callService(){
    for(var i = 0; i < maps.length; i++){
      if(!!maps[i].dataEvent) {
        var splitString = maps[i].dataEvent.split(".");
        var func = window.intel.xdk.services;
        for(var j = 0; j < splitString.length; j++){
          func = func[splitString[j]];
        }
        func();
      }
    }
    }

  /**
     * Geocode Address will check for a map center address and then call out to the Google Geocoder.
     * If it successfully returns it will set the map to the newly returned lat/long.
     *
     * @param {Object} mapObject - Contains data about map for creation
     */
  function geocodeAddress(mapObject) {
    var geocoder = new google.maps.Geocoder();
    if(!!mapObject.dataCenterAddress) {
      geocoder.geocode( { 'address': mapObject.dataCenterAddress }, function(results, status){
        if (status == google.maps.GeocoderStatus.OK) {
          mapObject.map_object.setCenter(results[0].geometry.location);
        }
      });
    }
  }

  /**
     * Map Zoom will check whether there is a zoom value and return it's value; otherwise, it will
     * return 8
     *
     * @param {Object} mapObject - Contains data about map for creation
     * @returns {Int} Value of the map zoom
     */
  function mapZoom(mapObject) {
    if(!!mapObject.dataZoom && parseInt(mapObject.dataZoom)) {
      return parseInt(mapObject.dataZoom);
    } else {
      return 8;
    }
  }

  /**
     * Marker Title will determine whether the title is part of a service feed, a standalone title, or
     * no title.  It will then gather the appropriate title depending on the type.
     *
     * @param {Object} mapObject - Contains data about map for creation
     * @returns {String} Title of the marker or null
     */
  function markerTitle(mapObject, dataItem) {
    if(!!mapObject.dataMarkerTitle && !!dataItem) {
      var strippedTitle = stripEntry(mapObject.dataMarkerTitle);
      var titleObj = getNamespacedObject(strippedTitle.split('.'), dataItem);
      return titleObj;
    } else if( !!mapObject.dataMarkerTitle && !dataItem) {
      return mapObject.dataMarkerTitle;
    } else {
      return null;
    }
  }

  /**
     * Marker Position will check for a lat/long position and will return a new LatLng based on those values.
     * Otherwise, it will attempt to strip the mustache syntax since it's likely a lat/long from a service.
     * It will then gather the information from the data feed and create a new LatLng from those values.
     *
     * @param {Object} mapObject - Contains data about map for creation
     * @returns {LatLng} - Position for the marker to be placed on the map
     */
  function markerPosition(mapObject, dataItem) {
    if(!!parseFloat(mapObject.dataLong) && !!parseFloat(mapObject.dataLat)) {
      return new google.maps.LatLng( mapObject.dataLat, mapObject.dataLong );
    } else if(!!mapObject.dataLong && !!mapObject.dataLat) {
      var strippedLat = stripEntry(mapObject.dataLat);
      var latObj = getNamespacedObject(strippedLat.split('.'), dataItem);
      var strippedLong = stripEntry(mapObject.dataLong);
      var lngObj = getNamespacedObject(strippedLong.split('.'), dataItem);
      return new google.maps.LatLng( latObj, lngObj );
    }
  }

  /**
     * Marker Animation will check whether an animation exists.  If it is drop or bounce it will return the
     * appropriate value; otherwise, it will return null
     *
     * @param {Object} mapObject - Contains data about map for creation
     * @returns {Object} A Google Maps defined value for drop, bounce, or null
     */
  function markerAnimation(mapObject) {
    if(!!mapObject.dataAnimate && mapObject.dataAnimate === "drop") {
      return google.maps.Animation.DROP;
    } else if(!!mapObject.dataAnimate && mapObject.dataAnimate === "bounce") {
      return google.maps.Animation.BOUNCE;
    } else {
      return null;
    }
  }

    /**
     *  Filter function that
   *
   * @param [Array] arr - Objects that are gathered from service data path
   * @param {function} predicate - Data must pass through this conditional or will be filtered
     */
    function filter(arr, predicate) {
        var i, res = [];
        for(i=0; i < arr.length; i++){ if(predicate(arr[i])){ res.push(arr[i]); } }
        return res;
    }

    /**
     *  Determines whether an item is an object
     *
     * @param {Object} e - element that will be compared to an object
     */
    function isObject(e) {
      return typeof(e) == "object";
    }

    /**
     * Attemps to trim off the mustache style syntax from an entry.  If the syntax is not correctly used
     * it will return the original string; otherwise, it will return the inner value.
     *
     * @param {Object} mapObject - Contains data about map for creation
     * @returns {String} - Either a trimmed mustache entry or original entry depending on match
     */
  function stripEntry(entry) {
    var match = entry.match(/\{\{(?:entry.)?([\w\W]*)\}\}/);
    return !!match && match.length == 2 ? match[1] : entry;
  }

  /**
  * Takes an array of parts, a string split by '.', and attempts to look through
  * data and find the corresondping object
  *
  * @param {Array} - Array of strings split by '.'
  * @param {Object} - Base path to search in data feed response
  * @return {Object} - Empty object or fully qualified object path
  */
  function getNamespacedObject(parts, data) {
    for (var i = 0, len = parts.length, obj = data[0] || data; i < len; ++i) {
      obj = obj[parts[i]];
    }
    return obj || {};
  }

    /**
     * Given a query selector it will attempt to search for that DOM node and then compare it with
     * values stored in the private maps variable.  If it finds a match it will then return the
     * Google Maps object that can be used to modify the map using anything from the Google Maps
     * Javascript v3 API or else it will return null.
     *
     * https://developers.google.com/maps/documentation/javascript/
     *
     * @param {String} mapSelector - Contains data about map for creation
     * @returns {Object} - Google Maps object
     */
  googleMaps.getObjectBySelector = function(mapSelector) {
    var map = null;
    var domNode = document.querySelectorAll(mapSelector);
    if(domNode.length !== 0) {
      maps.forEach(function(item) {
        if(domNode[0] == item.mapDOMNode) {
          map = item.map_object;
        }
      });
    }
    return map;
  };

    /**
     * Similar to googleMaps.getObjectBySelector except it will return an array of markers that are used
     * for the selected map.
     *
     * @param {String} mapSelector - Contains data about map for creation
     * @returns {Array} - Array of Google Map Markers for a given map
     */
  googleMaps.getMarkersByID = function(mapSelector) {
    var map = null;
    var domNode = document.querySelectorAll(mapSelector);
    if(domNode.length !== 0) {
      maps.forEach(function(item) {
        if(domNode[0] == item.mapDOMNode) {
          map = item.markers;
        }
      });
    }
    return map;
  };

})();
